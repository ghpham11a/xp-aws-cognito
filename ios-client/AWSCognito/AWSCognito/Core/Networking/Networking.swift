//
//  Networking.swift
//  AWSCognito
//
//  Created by Anthony Pham on 2/24/26.
//

import Foundation

enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case patch = "PATCH"
    case put = "PUT"
    case delete = "DELETE"
}

enum NetworkError: Error {
    case invalidURL
    case invalidResponse
    case unauthorized
    case httpError(Error)
    case encodingError(Error)
    case decodingError(Error)
    case serverError(statusCode: Int, body: Data?)

    var isRetryable: Bool {
        switch self {
        case .serverError(let statusCode, _):
            return (500...599).contains(statusCode)
        case .httpError:
            return true
        default:
            return false
        }
    }
}

extension NetworkError: LocalizedError {
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid server response"
        case .unauthorized:
            return "Authentication required"
        case .httpError(let error):
            return "Network error: \(error.localizedDescription)"
        case .encodingError:
            return "Failed to encode request"
        case .decodingError:
            return "Failed to decode response"
        case .serverError(let statusCode, let body):
            var message = "Server error (\(statusCode))"
            if let body, let text = String(data: body, encoding: .utf8), !text.isEmpty {
                message += ": \(text)"
            }
            return message
        }
    }
}

protocol Networking {
    func makeRequest<T: Decodable>(endpoint: Endpoint) async throws -> T
}
