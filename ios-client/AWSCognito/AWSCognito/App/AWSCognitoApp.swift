//
//  AWSCognitoApp.swift
//  AWSCognito
//

import SwiftUI
import OSLog
import Amplify
import AWSCognitoAuthPlugin
import GoogleSignIn

@main
struct AWSCognitoApp: App {
    
    @State private var routeManager = DependencyContainer.shared.resolve(RouteManager.self)
    @State private var authManager = DependencyContainer.shared.resolve(AuthManager.self)
    @State private var connectivityMonitor = DependencyContainer.shared.resolve(ConnectivityMonitor.self)
    
    init() {
        configureAmplify()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(routeManager)
                .environment(authManager)
                .environment(connectivityMonitor)
                .onOpenURL { url in
                    GIDSignIn.sharedInstance.handle(url)
                }
        }
    }

    private func configureAmplify() {
        do {
            try Amplify.add(plugin: AWSCognitoAuthPlugin())
            try Amplify.configure()
            Log.general.info("Amplify configured successfully")
        } catch {
            Log.general.error("Failed to configure Amplify: \(error)")
        }
    }
}
