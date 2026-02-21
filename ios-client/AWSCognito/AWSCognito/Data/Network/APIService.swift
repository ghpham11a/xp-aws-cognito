//
//  APIService.swift
//  AWSCognito
//

import Foundation

enum APIError: Error, LocalizedError {
    case invalidURL
    case invalidResponse
    case httpError(Int)
    case decodingError(Error)
    case networkError(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let code):
            return "HTTP error: \(code)"
        case .decodingError(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        }
    }
}

class APIService {

    // Use ngrok URL for device testing, localhost for simulator
    private let baseURL = "https://feedback-test.ngrok.io"

    init() {}

    private func makeRequest<T: Decodable>(
        endpoint: String,
        token: String
    ) async throws -> T {
        guard let url = URL(string: "\(baseURL)\(endpoint)") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30

        do {
            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }

            guard (200...299).contains(httpResponse.statusCode) else {
                throw APIError.httpError(httpResponse.statusCode)
            }

            let decoder = JSONDecoder()
            do {
                return try decoder.decode(T.self, from: data)
            } catch {
                throw APIError.decodingError(error)
            }
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.networkError(error)
        }
    }

    func fetchCurrentUser(token: String) async throws -> User {
        return try await makeRequest(endpoint: "/users/me", token: token)
    }

    func fetchFeed(token: String) async throws -> [FeedItem] {
        return try await makeRequest(endpoint: "/feed", token: token)
    }

    func fetchPublicMessage() async throws -> MessageResponse {
        guard let url = URL(string: "\(baseURL)/messages/public") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30

        do {
            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }

            guard (200...299).contains(httpResponse.statusCode) else {
                throw APIError.httpError(httpResponse.statusCode)
            }

            let decoder = JSONDecoder()
            do {
                return try decoder.decode(MessageResponse.self, from: data)
            } catch {
                throw APIError.decodingError(error)
            }
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.networkError(error)
        }
    }

    func fetchPrivateMessage(token: String) async throws -> MessageResponse {
        return try await makeRequest(endpoint: "/messages/private", token: token)
    }

    // MARK: - Apple Sign In

    func exchangeAppleToken(
        identityToken: String,
        authorizationCode: String,
        email: String?,
        fullName: String?
    ) async throws -> AppleAuthResponse {
        guard let url = URL(string: "\(baseURL)/auth/apple") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30

        let body = AppleAuthRequest(
            identityToken: identityToken,
            authorizationCode: authorizationCode,
            email: email,
            fullName: fullName
        )
        request.httpBody = try JSONEncoder().encode(body)

        do {
            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }

            guard (200...299).contains(httpResponse.statusCode) else {
                throw APIError.httpError(httpResponse.statusCode)
            }

            return try JSONDecoder().decode(AppleAuthResponse.self, from: data)
        } catch let error as APIError {
            throw error
        } catch let error as DecodingError {
            throw APIError.decodingError(error)
        } catch {
            throw APIError.networkError(error)
        }
    }

    // MARK: - Google Sign In

    func exchangeGoogleToken(
        idToken: String,
        email: String?,
        fullName: String?
    ) async throws -> AuthTokenResponse {
        guard let url = URL(string: "\(baseURL)/auth/google") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30

        let body = GoogleAuthRequest(
            idToken: idToken,
            email: email,
            fullName: fullName
        )
        request.httpBody = try JSONEncoder().encode(body)

        do {
            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }

            guard (200...299).contains(httpResponse.statusCode) else {
                throw APIError.httpError(httpResponse.statusCode)
            }

            return try JSONDecoder().decode(AuthTokenResponse.self, from: data)
        } catch let error as APIError {
            throw error
        } catch let error as DecodingError {
            throw APIError.decodingError(error)
        } catch {
            throw APIError.networkError(error)
        }
    }
}

struct AppleAuthRequest: Encodable {
    let identityToken: String
    let authorizationCode: String
    let email: String?
    let fullName: String?

    enum CodingKeys: String, CodingKey {
        case identityToken = "identity_token"
        case authorizationCode = "authorization_code"
        case email
        case fullName = "full_name"
    }
}

struct GoogleAuthRequest: Encodable {
    let idToken: String
    let email: String?
    let fullName: String?

    enum CodingKeys: String, CodingKey {
        case idToken = "id_token"
        case email
        case fullName = "full_name"
    }
}

struct AuthTokenResponse: Decodable {
    let idToken: String
    let accessToken: String
    let refreshToken: String?
    let expiresIn: Int

    enum CodingKeys: String, CodingKey {
        case idToken = "id_token"
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case expiresIn = "expires_in"
    }
}

// Keep for backwards compatibility
typealias AppleAuthResponse = AuthTokenResponse
