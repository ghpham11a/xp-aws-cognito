//
//  MessageResponse.swift
//  AWSCognito
//

import Foundation

struct MessageResponse: Codable {
    let message: String
    let authenticated: Bool
}
