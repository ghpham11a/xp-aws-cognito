//
//  UsersRepository.swift
//  AWSCognito
//
//  Created by Anthony Pham on 2/24/26.
//

class UsersRepository: UsersRepo {
    
    private let networkService: Networking

    init(networkService: Networking) {
        self.networkService = networkService
    }
    
    func fetchUser() async throws -> User {
        let endpoint = UsersEndpoints.GetUser()
        return try await networkService.makeRequest(endpoint: endpoint)
    }
}
