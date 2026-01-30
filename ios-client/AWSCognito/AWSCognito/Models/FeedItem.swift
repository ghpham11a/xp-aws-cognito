//
//  FeedItem.swift
//  AWSCognito
//

import Foundation
import SwiftUI

struct FeedItem: Codable, Identifiable {
    let id: String
    let title: String
    let content: String
    let type: String

    var typeColor: Color {
        switch type.lowercased() {
        case "announcement":
            return .blue
        case "update":
            return .green
        case "report":
            return .yellow
        default:
            return .gray
        }
    }
}
