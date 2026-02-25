//
//  MessagesRepo.swift
//  AWSCognito
//
//  Created by Anthony Pham on 2/24/26.
//

protocol MessagesRepo {
    func fetchPublicMessage() async throws -> MessageResponse
    func fetchPrivateMessage() async throws -> MessageResponse
}
