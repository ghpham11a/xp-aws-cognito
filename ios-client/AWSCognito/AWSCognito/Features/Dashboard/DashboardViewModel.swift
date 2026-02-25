//
//  DashboardViewModel.swift
//  AWSCognito
//

import Foundation

@Observable
class DashboardViewModel {

    private let messagesRepository: MessagesRepo

    var privateMessage: String?
    var isLoading = false
    var error: String?

    init(messagesRepository: MessagesRepo) {
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
