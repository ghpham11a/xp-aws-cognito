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
        registerServices()
        registerRepositories()
        registerViewModels()
    }

    private func registerServices() {
        container.register(APIService.self) { _ in
            APIService()
        }.inObjectScope(.container)

        container.register(AuthManager.self) { _ in
            AuthManager()
        }.inObjectScope(.container)

        container.register(RouteManager.self) { _ in
            RouteManager()
        }.inObjectScope(.container)
    }

    private func registerRepositories() {
        container.register(MessagesRepository.self) { resolver in
            MessagesRepository(
                apiService: resolver.resolve(APIService.self)!,
                authManager: resolver.resolve(AuthManager.self)!
            )
        }.inObjectScope(.container)
    }

    private func registerViewModels() {
        container.register(HomeViewModel.self) { resolver in
            HomeViewModel(
                messagesRepository: resolver.resolve(MessagesRepository.self)!
            )
        }

        container.register(DashboardViewModel.self) { resolver in
            DashboardViewModel(
                messagesRepository: resolver.resolve(MessagesRepository.self)!
            )
        }
    }

    func resolve<T>(_ type: T.Type) -> T {
        guard let resolved = container.resolve(type) else {
            fatalError("Failed to resolve \(type)")
        }
        return resolved
    }
}
