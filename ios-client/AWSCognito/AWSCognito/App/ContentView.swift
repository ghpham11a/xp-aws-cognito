//
//  ContentView.swift
//  AWSCognito
//

import SwiftUI

struct ContentView: View {
    
    @Environment(RouteManager.self) private var routeManager
    @Environment(AuthManager.self) private var authManager
    
    var body: some View {
        
        @Bindable var routeManager = routeManager
        @Bindable var authManager = authManager
        
        TabView(selection: $routeManager.selectedTab) {
            NavigationStack(path: $routeManager.homePath) {
                HomeView()
            }
            .tabItem {
                Label("Home", systemImage: "house.fill")
            }
            .tag(Tab.home)

            NavigationStack(path: $routeManager.dashboardPath) {
                DashboardView()
            }
            .tabItem {
                Label("Dashboard", systemImage: "rectangle.grid.2x2.fill")
            }
            .tag(Tab.dashboard)

            NavigationStack(path: $routeManager.accountPath) {
                AccountView()
            }
            .tabItem {
                Label("Account", systemImage: "person.fill")
            }
            .tag(Tab.account)
        }
        .fullScreenCover(isPresented: $authManager.showLoginView) {
            LoginView()
        }
        
    }
}

#Preview {
    ContentView()
}
