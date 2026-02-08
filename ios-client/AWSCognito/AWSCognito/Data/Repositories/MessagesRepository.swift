//
//  MessagesRepository.swift
//  AWSCognito
//

import Foundation

class MessagesRepository {

    private let apiService: APIService
    private let authManager: AuthManager

    init(apiService: APIService, authManager: AuthManager) {
        self.apiService = apiService
        self.authManager = authManager
    }

    func fetchPublicMessage() async throws -> MessageResponse {
        try await apiService.fetchPublicMessage()
    }

    func fetchPrivateMessage() async throws -> MessageResponse {
        guard let token = try await authManager.getIdToken() else {
            throw APIError.invalidResponse
        }
        return try await apiService.fetchPrivateMessage(token: token)
    }
}
