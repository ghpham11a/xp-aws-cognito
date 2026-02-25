//
//  AuthEndpoints.swift
//  AWSCognito
//

import Foundation

enum AuthEndpoints {

    struct ExchangeGoogleToken: Endpoint {
        var url: String
        var method: HTTPMethod = .post
        var body: (any Encodable)?

        init(idToken: String, email: String?, fullName: String?) {
            self.url = "\(Config.value(for: .api))/auth/google"
            self.body = GoogleAuthRequest(
                idToken: idToken,
                email: email,
                fullName: fullName
            )
        }
    }

    struct ExchangeAppleToken: Endpoint {
        var url: String
        var method: HTTPMethod = .post
        var body: (any Encodable)?

        init(identityToken: String, authorizationCode: String, email: String?, fullName: String?) {
            self.url = "\(Config.value(for: .api))/auth/apple"
            self.body = AppleAuthRequest(
                identityToken: identityToken,
                authorizationCode: authorizationCode,
                email: email,
                fullName: fullName
            )
        }
    }
}
