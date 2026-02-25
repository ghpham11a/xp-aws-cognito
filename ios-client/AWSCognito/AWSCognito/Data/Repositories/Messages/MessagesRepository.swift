//
//  MessagesRepository.swift
//  AWSCognito
//

import Foundation

class MessagesRepository: MessagesRepo {

    private let networkService: Networking

    init(networkService: Networking) {
        self.networkService = networkService
    }

    func fetchPublicMessage() async throws -> MessageResponse {
        let endpoint = MessagesEndpoints.GetPublicMessages()
        return try await networkService.makeRequest(endpoint: endpoint)
    }

    func fetchPrivateMessage() async throws -> MessageResponse {
        let endpoint = MessagesEndpoints.GetPrivateMessages()
        return try await networkService.makeRequest(endpoint: endpoint)
    }
}
