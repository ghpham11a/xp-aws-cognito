//
//  Logging.swift
//  AWSCognito
//

import OSLog

enum Log {
    static let networking = Logger(subsystem: Bundle.main.bundleIdentifier ?? "AWSCognito", category: "networking")
    static let auth = Logger(subsystem: Bundle.main.bundleIdentifier ?? "AWSCognito", category: "auth")
    static let navigation = Logger(subsystem: Bundle.main.bundleIdentifier ?? "AWSCognito", category: "navigation")
    static let general = Logger(subsystem: Bundle.main.bundleIdentifier ?? "AWSCognito", category: "general")
}
