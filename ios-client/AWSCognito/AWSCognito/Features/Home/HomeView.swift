//
//  HomeView.swift
//  AWSCognito
//

import SwiftUI

struct HomeView: View {

    @Environment(RouteManager.self) private var routeManager
    @Environment(AuthManager.self) private var authManager

    @State private var viewModel: HomeViewModel
    
    init(viewModel: HomeViewModel) {
        _viewModel = State(initialValue: viewModel)
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Server Message Card
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
                                await viewModel.fetchPublicMessage()
                            }
                        }
                        .buttonStyle(.borderedProminent)
                    } else if let message = viewModel.publicMessage {
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
        .task {
            await viewModel.fetchPublicMessage()
        }
    }
}

#Preview {
    HomeView(viewModel: DependencyContainer.shared.resolve(HomeViewModel.self))
}
