//
//  AuthModels.swift
//  AWSCognito
//

import Foundation

struct GoogleAuthRequest: Encodable {
    let idToken: String
    let email: String?
    let fullName: String?

    enum CodingKeys: String, CodingKey {
        case idToken = "id_token"
        case email
        case fullName = "full_name"
    }
}

struct AppleAuthRequest: Encodable {
    let identityToken: String
    let authorizationCode: String
    let email: String?
    let fullName: String?

    enum CodingKeys: String, CodingKey {
        case identityToken = "identity_token"
        case authorizationCode = "authorization_code"
        case email
        case fullName = "full_name"
    }
}

struct AuthTokenResponse: Decodable {
    let idToken: String
    let accessToken: String
    let refreshToken: String?
    let expiresIn: Int

    enum CodingKeys: String, CodingKey {
        case idToken = "id_token"
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case expiresIn = "expires_in"
    }
}
