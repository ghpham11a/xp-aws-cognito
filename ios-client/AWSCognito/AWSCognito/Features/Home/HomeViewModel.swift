//
//  HomeViewModel.swift
//  AWSCognito
//

import Foundation

@Observable
class HomeViewModel {

    private let messagesRepository: MessagesRepo

    var publicMessage: String?
    var isLoading = true
    var error: String?

    init(messagesRepository: MessagesRepo) {
        self.messagesRepository = messagesRepository
    }

    func fetchPublicMessage() async {
        isLoading = true
        error = nil
        do {
            let response = try await messagesRepository.fetchPublicMessage()
            publicMessage = response.message
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}
