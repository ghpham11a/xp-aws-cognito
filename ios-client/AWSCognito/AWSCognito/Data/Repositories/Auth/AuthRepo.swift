//
//  AuthRepo.swift
//  AWSCognito
//
//  Created by Anthony Pham on 2/24/26.
//
import Foundation

protocol AuthRepo {
    func exchangeGoogleToken(idToken: String, email: String?, fullName: String?) async throws -> AuthTokenResponse
    func exchangeAppleToken(identityToken: String, authorizationCode: String, email: String?, fullName: String?) async throws -> AuthTokenResponse
}
