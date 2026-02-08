//
//  HomeViewModel.swift
//  AWSCognito
//

import Foundation

@Observable
class HomeViewModel {

    private let messagesRepository: MessagesRepository

    var publicMessage: String?
    var isLoading = true
    var error: String?

    init(messagesRepository: MessagesRepository) {
        self.messagesRepository = messagesRepository
    }

    func fetchPublicMessage() async {
        do {
            let response = try await messagesRepository.fetchPublicMessage()
            publicMessage = response.message
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}
