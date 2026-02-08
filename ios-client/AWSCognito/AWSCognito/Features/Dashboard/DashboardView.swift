//
//  DashboardView.swift
//  AWSCognito
//

import SwiftUI

struct DashboardView: View {

    @Environment(RouteManager.self) private var routeManager
    @Environment(AuthManager.self) private var authManager

    @State private var privateMessage: String?
    @State private var isLoading = false
    @State private var error: String?

    var body: some View {
        ScrollView {
            if !authManager.isAuthenticated {
                LoginCard {
                    authManager.presentLoginView()
                }
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

                        if isLoading {
                            ProgressView()
                        } else if let error = error {
                            Text(error)
                                .foregroundColor(.red)
                        } else if let message = privateMessage {
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
                await fetchPrivateMessage()
            }
        }
        .onChange(of: authManager.isAuthenticated) { _, isAuthenticated in
            if isAuthenticated {
                Task {
                    await fetchPrivateMessage()
                }
            }
        }
    }

    private func fetchPrivateMessage() async {
        isLoading = true
        error = nil

        do {
            guard let token = try await authManager.getIdToken() else {
                error = "Not authenticated"
                isLoading = false
                return
            }

            let response = try await APIService.shared.fetchPrivateMessage(token: token)
            privateMessage = response.message
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }
}

#Preview {
    DashboardView()
}
