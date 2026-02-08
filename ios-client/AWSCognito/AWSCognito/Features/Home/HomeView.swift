//
//  HomeView.swift
//  AWSCognito
//

import SwiftUI

struct HomeView: View {

    @Environment(RouteManager.self) private var routeManager
    @Environment(AuthManager.self) private var authManager

    @State private var publicMessage: String?
    @State private var isLoading = true
    @State private var error: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Server Message Card
                VStack(alignment: .leading, spacing: 8) {
                    Text("Server Message")
                        .font(.headline)

                    if isLoading {
                        ProgressView()
                    } else if let error = error {
                        Text(error)
                            .foregroundColor(.red)
                    } else if let message = publicMessage {
                        Text(message)
                            .foregroundColor(.secondary)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding()
                .background(Color(.secondarySystemBackground))
                .cornerRadius(12)

                // Getting Started Card
                VStack(alignment: .leading, spacing: 8) {
                    Text("Getting Started")
                        .font(.headline)

                    Text("1. Navigate to the Dashboard tab to sign in or create an account\n2. Once authenticated, you'll see your profile and feed\n3. Use the Account tab to manage your password and sign out")
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding()
                .background(Color(.systemBackground))
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color(.separator), lineWidth: 1)
                )
            }
            .padding()
        }
        .task {
            await fetchPublicMessage()
        }
    }

    private func fetchPublicMessage() async {
        do {
            let response = try await APIService.shared.fetchPublicMessage()
            publicMessage = response.message
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

#Preview {
    HomeView()
}
