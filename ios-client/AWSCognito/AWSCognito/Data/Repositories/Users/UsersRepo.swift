//
//  UsersRepo.swift
//  AWSCognito
//
//  Created by Anthony Pham on 2/24/26.
//

protocol UsersRepo {
    func fetchUser() async throws -> User
}
