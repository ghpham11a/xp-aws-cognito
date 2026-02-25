//
//  APIService.swift
//  AWSCognito
//

import Foundation
import OSLog

class NetworkService: Networking {

    let decoder = JSONDecoder()
    let encoder = JSONEncoder()

    var authManager: AuthManager

    private let session: URLSession

    init(authManager: AuthManager) {
        self.authManager = authManager
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        config.waitsForConnectivity = true
        self.session = URLSession(configuration: config)
    }

    func makeRequest<T: Decodable>(endpoint: Endpoint) async throws -> T {
        let request = try await buildURLRequest(endpoint: endpoint)

        let maxRetries = (endpoint.method == .get) ? 3 : 0
        var lastError: Error?

        for attempt in 0...maxRetries {
            if attempt > 0 {
                let delay = UInt64(pow(2.0, Double(attempt - 1))) * 1_000_000_000
                Log.networking.info("Retry \(attempt)/\(maxRetries) for \(endpoint.method.rawValue) \(endpoint.url)")
                try await Task.sleep(nanoseconds: delay)
            }

            do {
                return try await executeRequest(request, endpoint: endpoint)
            } catch let error as NetworkError where error.isRetryable && attempt < maxRetries {
                lastError = error
                Log.networking.error("Retryable error on attempt \(attempt + 1): \(error.localizedDescription)")
                continue
            } catch {
                throw error
            }
        }

        throw lastError!
    }

    private func buildURLRequest(endpoint: Endpoint) async throws -> URLRequest {
        guard var urlComponents = URLComponents(string: endpoint.url) else {
            throw NetworkError.invalidURL
        }

        if let queryItems = endpoint.queryItems, !queryItems.isEmpty {
            urlComponents.queryItems = queryItems
        }

        guard let url = urlComponents.url else {
            throw NetworkError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = endpoint.method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        if endpoint.requiresAuth {
            guard let token = try await authManager.getIdToken() else {
                throw NetworkError.unauthorized
            }
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        endpoint.headers?.forEach { key, value in
            request.setValue(value, forHTTPHeaderField: key)
        }

        if let body = endpoint.body {
            do {
                request.httpBody = try encoder.encode(body)
            } catch {
                throw NetworkError.encodingError(error)
            }
        }

        Log.networking.debug("\(endpoint.method.rawValue) \(endpoint.url)")
        return request
    }

    private func executeRequest<T: Decodable>(_ request: URLRequest, endpoint: Endpoint) async throws -> T {
        var data: Data
        var response: URLResponse

        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw NetworkError.httpError(error)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.invalidResponse
        }

        // Handle 401 — attempt token refresh and retry once
        if httpResponse.statusCode == 401 && endpoint.requiresAuth {
            Log.networking.info("Received 401, attempting token refresh")
            let refreshed = await authManager.refreshTokenOrSignOut()
            if refreshed {
                var retryRequest = request
                if let newToken = try await authManager.getIdToken() {
                    retryRequest.setValue("Bearer \(newToken)", forHTTPHeaderField: "Authorization")
                }
                do {
                    (data, response) = try await session.data(for: retryRequest)
                } catch {
                    throw NetworkError.httpError(error)
                }
                guard let retryHttpResponse = response as? HTTPURLResponse else {
                    throw NetworkError.invalidResponse
                }
                guard (200...299).contains(retryHttpResponse.statusCode) else {
                    throw NetworkError.serverError(statusCode: retryHttpResponse.statusCode, body: data)
                }
            } else {
                throw NetworkError.unauthorized
            }
        } else {
            guard (200...299).contains(httpResponse.statusCode) else {
                Log.networking.error("HTTP \(httpResponse.statusCode) for \(endpoint.method.rawValue) \(endpoint.url)")
                throw NetworkError.serverError(statusCode: httpResponse.statusCode, body: data)
            }
        }

        do {
            let decoded: T = try decoder.decode(T.self, from: data)
            return decoded
        } catch {
            throw NetworkError.decodingError(error)
        }
    }
}
