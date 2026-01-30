//
//  HomeView.swift
//  AWSCognito
//

import SwiftUI

struct HomeView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Welcome Card
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Image(systemName: "hand.wave.fill")
                            .font(.title)
                            .foregroundColor(.blue)
                        Text("Welcome to AWS Cognito Demo")
                            .font(.title2)
                            .fontWeight(.bold)
                    }

                    Text("This app demonstrates AWS Cognito authentication with a FastAPI backend.")
                        .foregroundColor(.secondary)
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(.systemBackground))
                .cornerRadius(12)
                .shadow(color: .black.opacity(0.1), radius: 5, x: 0, y: 2)

                // Features Card
                VStack(alignment: .leading, spacing: 12) {
                    Text("Features")
                        .font(.headline)

                    FeatureRow(icon: "person.badge.plus", text: "User signup with email")
                    FeatureRow(icon: "checkmark.shield", text: "Email verification")
                    FeatureRow(icon: "person.fill.checkmark", text: "Secure sign in")
                    FeatureRow(icon: "lock.rotation", text: "Password management")
                    FeatureRow(icon: "server.rack", text: "Protected API endpoints")
                    FeatureRow(icon: "list.bullet.rectangle", text: "Personalized feed")
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(.systemBackground))
                .cornerRadius(12)
                .shadow(color: .black.opacity(0.1), radius: 5, x: 0, y: 2)

                // Getting Started Card
                VStack(alignment: .leading, spacing: 12) {
                    Text("Getting Started")
                        .font(.headline)

                    Text("1. Sign up or sign in using the Account tab")
                    Text("2. View your profile and feed in the Dashboard tab")
                    Text("3. Manage your password in the Account tab")
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(.systemBackground))
                .cornerRadius(12)
                .shadow(color: .black.opacity(0.1), radius: 5, x: 0, y: 2)
            }
            .padding()
        }
        .background(Color(.systemGroupedBackground))
    }
}

struct FeatureRow: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(.blue)
                .frame(width: 24)
            Text(text)
                .foregroundColor(.primary)
        }
    }
}

#Preview {
    HomeView()
}
