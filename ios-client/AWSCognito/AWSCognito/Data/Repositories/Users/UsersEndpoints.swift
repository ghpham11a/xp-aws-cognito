//
//  UsersEndpoints.swift
//  AWSCognito
//
//  Created by Anthony Pham on 2/24/26.
//

import Foundation

enum UsersEndpoints {
    
    struct GetUser: Endpoint {
        var url: String
        var method: HTTPMethod = .get
        
        init() {
            self.url = "\(Config.value(for: .api))/users/me"
        }
    }
    
}
