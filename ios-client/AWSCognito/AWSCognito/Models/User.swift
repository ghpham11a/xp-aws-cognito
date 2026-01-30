//
//  User.swift
//  AWSCognito
//

import Foundation

struct User: Codable, Identifiable {
    let userId: String
    let email: String
    let name: String?
    let createdAt: String

    var id: String { userId }

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case email
        case name
        case createdAt = "created_at"
    }
}
