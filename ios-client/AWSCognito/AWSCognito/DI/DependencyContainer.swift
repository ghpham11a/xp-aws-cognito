//
//  DependencyContainer.swift
//  AWSCognito
//

import Foundation
import Swinject

final class DependencyContainer {

    static let shared = DependencyContainer()

    let container: Container

    private init() {
        container = Container()
        
        container.register(AuthManager.self) { _ in
            AuthManager()
        }.inObjectScope(.container)
        
        container.register(Networking.self) { resolver in
            NetworkService(authManager: resolver.resolve(AuthManager.self)!)
        }.inObjectScope(.container)
        
        container.register(RouteManager.self) { _ in
            RouteManager()
        }.inObjectScope(.container)
        
        // Repositories
        container.register(AuthRepo.self) { resolver in
            AuthRepository(
                networkService: resolver.resolve(Networking.self)!
            )
        }.inObjectScope(.container)

        container.register(MessagesRepo.self) { resolver in
            MessagesRepository(
                networkService: resolver.resolve(Networking.self)!
            )
        }.inObjectScope(.container)
        
        container.register(UsersRepo.self) { resolver in
            UsersRepository(
                networkService: resolver.resolve(Networking.self)!
            )
        }.inObjectScope(.container)
        
        // View models
        container.register(HomeViewModel.self) { resolver in
            HomeViewModel(
                messagesRepository: resolver.resolve(MessagesRepo.self)!
            )
        }

        container.register(DashboardViewModel.self) { resolver in
            DashboardViewModel(
                messagesRepository: resolver.resolve(MessagesRepo.self)!
            )
        }
        
        container.register(ConnectivityMonitor.self) { _ in
            ConnectivityMonitor()
        }.inObjectScope(.container)

        // Wire AuthRepo into AuthManager (breaks circular dependency:
        // AuthManager -> NetworkService -> AuthManager)
        let authManager = container.resolve(AuthManager.self)!
        let authRepo = container.resolve(AuthRepo.self)!
        authManager.configure(authRepository: authRepo)
    }
    
    func resolve<T>(_ type: T.Type) -> T {
        guard let resolved = container.resolve(type) else {
            fatalError("Failed to resolve \(type)")
        }
        return resolved
    }
}
