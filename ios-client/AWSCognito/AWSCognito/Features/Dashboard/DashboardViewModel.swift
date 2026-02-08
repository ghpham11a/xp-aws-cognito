//
//  DashboardViewModel.swift
//  AWSCognito
//

import Foundation

@Observable
class DashboardViewModel {

    private let messagesRepository: MessagesRepository

    var privateMessage: String?
    var isLoading = false
    var error: String?

    init(messagesRepository: MessagesRepository) {
        self.messagesRepository = messagesRepository
    }

    func fetchPrivateMessage() async {
        isLoading = true
        error = nil

        do {
            let response = try await messagesRepository.fetchPrivateMessage()
            privateMessage = response.message
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }
}
