//
//  MainView.swift
//  AWSCognito
//

import SwiftUI

enum Tab {
    case home
    case dashboard
    case account
}

struct MainView: View {
    @State private var viewModel = AuthViewModel()
    @State private var selectedTab: Tab = .home
    @State private var showLoginOverlay = false

    var body: some View {
        NavigationStack {
            ZStack {
                TabView(selection: $selectedTab) {
                    HomeView()
                        .tabItem {
                            Label("Home", systemImage: "house.fill")
                        }
                        .tag(Tab.home)

                    DashboardView(viewModel: viewModel)
                        .tabItem {
                            Label("Dashboard", systemImage: "rectangle.grid.2x2.fill")
                        }
                        .tag(Tab.dashboard)

                    AccountView(viewModel: viewModel)
                        .tabItem {
                            Label("Account", systemImage: "person.fill")
                        }
                        .tag(Tab.account)
                }

                // Login overlay for protected tabs
                if showLoginOverlay {
                    Color.black.opacity(0.3)
                        .ignoresSafeArea()

                    LoginView(viewModel: viewModel)
                        .background(Color(.systemBackground))
                        .cornerRadius(16)
                        .shadow(radius: 10)
                        .padding()
                }
            }
            .navigationTitle(navigationTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    if viewModel.isAuthenticated {
                        HStack(spacing: 4) {
                            Circle()
                                .fill(Color.green)
                                .frame(width: 8, height: 8)
                            Text("Logged In")
                                .font(.caption)
                                .foregroundColor(.green)
                        }
                    }
                }
            }
        }
        .onChange(of: selectedTab) { _, newTab in
            updateLoginOverlay(for: newTab)
        }
        .onChange(of: viewModel.isAuthenticated) { _, isAuthenticated in
            if isAuthenticated {
                showLoginOverlay = false
            } else {
                updateLoginOverlay(for: selectedTab)
            }
        }
        .onAppear {
            updateLoginOverlay(for: selectedTab)
        }
    }

    private var navigationTitle: String {
        switch selectedTab {
        case .home:
            return "Home"
        case .dashboard:
            return "Dashboard"
        case .account:
            return "Account"
        }
    }

    private func updateLoginOverlay(for tab: Tab) {
        let requiresAuth = tab == .dashboard || tab == .account
        showLoginOverlay = requiresAuth && !viewModel.isAuthenticated
    }
}

#Preview {
    MainView()
}
