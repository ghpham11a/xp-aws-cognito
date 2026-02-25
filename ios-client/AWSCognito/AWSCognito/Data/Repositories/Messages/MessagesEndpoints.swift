//
//  MessagesEndpoints.swift
//  AWSCognito
//
//  Created by Anthony Pham on 2/24/26.
//

import Foundation

enum MessagesEndpoints {
    
    struct GetPublicMessages: Endpoint {
        var url: String
        var method: HTTPMethod = .get
        
        init() {
            self.url = "\(Config.value(for: .api))/messages/public"
        }
    }
    
    struct GetPrivateMessages: Endpoint {
        var url: String
        var method: HTTPMethod = .get
        var requiresAuth: Bool = true
        init() {
            self.url = "\(Config.value(for: .api))/messages/private"
        }
    }
}
