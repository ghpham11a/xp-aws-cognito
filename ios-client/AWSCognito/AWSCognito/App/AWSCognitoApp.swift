//
//  AWSCognitoApp.swift
//  AWSCognito
//

import SwiftUI
import Amplify
import AWSCognitoAuthPlugin
import GoogleSignIn

@main
struct AWSCognitoApp: App {
    
    @State private var routeManager = DependencyContainer.shared.resolve(RouteManager.self)
    @State private var authManager = DependencyContainer.shared.resolve(AuthManager.self)
    
    init() {
        configureAmplify()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(routeManager)
                .environment(authManager)
                .onOpenURL { url in
                    GIDSignIn.sharedInstance.handle(url)
                }
        }
    }

    private func configureAmplify() {
        do {
            try Amplify.add(plugin: AWSCognitoAuthPlugin())
            try Amplify.configure()
            print("Amplify configured successfully")
        } catch {
            print("Failed to configure Amplify: \(error)")
        }
    }
}
