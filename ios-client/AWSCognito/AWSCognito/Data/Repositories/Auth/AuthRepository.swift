//
//  AuthRepository.swift
//  AWSCognito
//

import Foundation

class AuthRepository: AuthRepo {

    private let networkService: Networking

    init(networkService: Networking) {
        self.networkService = networkService
    }

    func exchangeGoogleToken(idToken: String, email: String?, fullName: String?) async throws -> AuthTokenResponse {
        let endpoint = AuthEndpoints.ExchangeGoogleToken(
            idToken: idToken,
            email: email,
            fullName: fullName
        )
        return try await networkService.makeRequest(endpoint: endpoint)
    }

    func exchangeAppleToken(identityToken: String, authorizationCode: String, email: String?, fullName: String?) async throws -> AuthTokenResponse {
        let endpoint = AuthEndpoints.ExchangeAppleToken(
            identityToken: identityToken,
            authorizationCode: authorizationCode,
            email: email,
            fullName: fullName
        )
        return try await networkService.makeRequest(endpoint: endpoint)
    }
}
