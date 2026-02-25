//
//  ContentView.swift
//  AWSCognito
//

import SwiftUI

struct ContentView: View {

    @Environment(RouteManager.self) private var routeManager
    @Environment(AuthManager.self) private var authManager
    @Environment(ConnectivityMonitor.self) private var connectivityMonitor

    var body: some View {

        @Bindable var routeManager = routeManager
        @Bindable var authManager = authManager

        VStack(spacing: 0) {
            if !connectivityMonitor.isConnected {
                Text("No internet connection")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 6)
                    .background(Color.red)
            }

            TabView(selection: $routeManager.selectedTab) {
                NavigationStack(path: $routeManager.homePath) {
                    HomeView(viewModel: DependencyContainer.shared.resolve(HomeViewModel.self))
                }
                .tabItem {
                    Label("Home", systemImage: "house.fill")
                }
                .tag(Tab.home)

                NavigationStack(path: $routeManager.dashboardPath) {
                    DashboardView(viewModel: DependencyContainer.shared.resolve(DashboardViewModel.self))
                }
                .tabItem {
                    Label("Dashboard", systemImage: "rectangle.grid.2x2.fill")
                }
                .tag(Tab.dashboard)

                NavigationStack(path: $routeManager.accountPath) {
                    AccountView(viewModel: AccountViewModel())
                }
                .tabItem {
                    Label("Account", systemImage: "person.fill")
                }
                .tag(Tab.account)
            }
        }
        .fullScreenCover(isPresented: $authManager.showLoginView) {
            LoginView(viewModel: LoginViewModel())
        }

    }
}

#Preview {
    ContentView()
}
