//
//  DashboardView.swift
//  AWSCognito
//

import SwiftUI

struct DashboardView: View {
    var viewModel: AuthViewModel

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Welcome Card
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "person.circle.fill")
                            .font(.title)
                            .foregroundColor(.blue)
                        Text("Welcome!")
                            .font(.title2)
                            .fontWeight(.bold)
                    }

                    if let email = viewModel.email {
                        Text("Logged in as \(email)")
                            .foregroundColor(.secondary)
                    }
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(.systemBackground))
                .cornerRadius(12)
                .shadow(color: .black.opacity(0.1), radius: 5, x: 0, y: 2)

                // Account Info Card
                if let user = viewModel.user {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Account Info")
                            .font(.headline)

                        InfoRow(label: "User ID", value: user.userId)
                        InfoRow(label: "Email", value: user.email)
                        if let name = user.name {
                            InfoRow(label: "Name", value: name)
                        }
                        InfoRow(label: "Created", value: formatDate(user.createdAt))
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.systemBackground))
                    .cornerRadius(12)
                    .shadow(color: .black.opacity(0.1), radius: 5, x: 0, y: 2)
                }

                // Feed Section
                VStack(alignment: .leading, spacing: 12) {
                    Text("Your Feed")
                        .font(.headline)

                    if viewModel.dashboardLoading {
                        HStack {
                            Spacer()
                            ProgressView()
                                .padding()
                            Spacer()
                        }
                    } else if let error = viewModel.dashboardError {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.caption)
                    } else if viewModel.feedItems.isEmpty {
                        Text("No feed items yet")
                            .foregroundColor(.secondary)
                            .padding()
                    } else {
                        ForEach(viewModel.feedItems) { item in
                            FeedItemCard(item: item)
                        }
                    }
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
        .onAppear {
            Task {
                await viewModel.loadDashboardData()
            }
        }
    }

    private func formatDate(_ dateString: String) -> String {
        // Simple date formatting - could be enhanced with DateFormatter
        if let range = dateString.range(of: "T") {
            return String(dateString[..<range.lowerBound])
        }
        return dateString
    }
}

struct InfoRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .foregroundColor(.secondary)
                .frame(width: 80, alignment: .leading)
            Text(value)
                .foregroundColor(.primary)
                .lineLimit(1)
                .truncationMode(.middle)
            Spacer()
        }
        .font(.subheadline)
    }
}

struct FeedItemCard: View {
    let item: FeedItem

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(item.title)
                    .font(.subheadline)
                    .fontWeight(.semibold)

                Spacer()

                Text(item.type.capitalized)
                    .font(.caption)
                    .fontWeight(.medium)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(item.typeColor.opacity(0.2))
                    .foregroundColor(item.typeColor)
                    .cornerRadius(4)
            }

            Text(item.content)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(8)
    }
}

#Preview {
    DashboardView(viewModel: AuthViewModel())
}
