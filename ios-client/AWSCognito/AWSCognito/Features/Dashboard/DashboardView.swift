//
//  DashboardView.swift
//  AWSCognito
//

import SwiftUI

struct DashboardView: View {

    @Environment(RouteManager.self) private var routeManager
    @Environment(AuthManager.self) private var authManager

    @State private var viewModel: DashboardViewModel
    
    init(viewModel: DashboardViewModel) {
        _viewModel = State(initialValue: viewModel)
    }

    var body: some View {
        ScrollView {
            if !authManager.isAuthenticated {

                LoginCard(onLoginTapped: {
                    authManager.presentLoginView()
                }, greeting: {
                    Text("Nothing in your dashboard yet")
                }, statement: {
                    Text("Sign in to see a message")
                })
            } else {
                VStack(spacing: 16) {
                    // Welcome card
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Welcome!")
                            .font(.title2)
                            .fontWeight(.bold)

                        Text(authManager.email ?? "User")
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(Color(.systemBlue).opacity(0.1))
                    .cornerRadius(12)

                    // Private message card
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Server Message")
                            .font(.headline)

                        if viewModel.isLoading {
                            ProgressView()
                        } else if let error = viewModel.error {
                            Text(error)
                                .foregroundColor(.red)
                            Button("Retry") {
                                Task {
                                    await viewModel.fetchPrivateMessage()
                                }
                            }
                            .buttonStyle(.borderedProminent)
                        } else if let message = viewModel.privateMessage {
                            Text(message)
                                .foregroundColor(.secondary)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(12)
                }
                .padding()
            }
        }
        .task {
            if authManager.isAuthenticated {
                await viewModel.fetchPrivateMessage()
            }
        }
        .onChange(of: authManager.isAuthenticated) { _, isAuthenticated in
            if isAuthenticated {
                Task {
                    await viewModel.fetchPrivateMessage()
                }
            }
        }
    }
}

#Preview {
    DashboardView(viewModel: DependencyContainer.shared.resolve(DashboardViewModel.self))
}
