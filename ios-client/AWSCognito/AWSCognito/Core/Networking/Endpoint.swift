//
//  Endpoint.swift
//  AWSCognito
//
//  Created by Anthony Pham on 2/24/26.
//
import Foundation

protocol Endpoint {
    var url: String { get }
    var method: HTTPMethod { get }
    var headers: [String: String]? { get }
    var queryItems: [URLQueryItem]? { get }
    var body: (any Encodable)? { get }
    var requiresAuth: Bool { get }
}

extension Endpoint {
    var headers: [String: String]? { nil }
    var queryItems: [URLQueryItem]? { nil }
    var body: (any Encodable)? { nil }
    var requiresAuth: Bool { false }
}
