//
//  Config.swift
//  AWSCognito
//
//  Created by Anthony Pham on 2/24/26.
//

import Foundation

enum Config {
    enum Key: String {
        case api = "API"
    }
    
    static func value(for key: Key) -> String {
        guard let value = Bundle.main.object(forInfoDictionaryKey: key.rawValue) as? String, !value.isEmpty else {
            fatalError("Missing configuration value for \(key.rawValue). Check Info.plist.")
        }
        return value
    }
}

