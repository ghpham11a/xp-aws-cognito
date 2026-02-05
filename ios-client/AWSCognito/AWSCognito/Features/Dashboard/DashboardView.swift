//
//  DashboardView.swift
//  AWSCognito
//

import SwiftUI

struct DashboardView: View {
    
    @Environment(RouteManager.self) private var routeManager
    @Environment(AuthManager.self) private var authManager

    var body: some View {
        ScrollView {
            
            if !authManager.isAuthenticated {
                LoginCard {
                    authManager.presentLoginView()
                }
            }
        }
        .onAppear {
            Task {
                // await viewModel.loadDashboardData()
            }
        }
    }
}

#Preview {
    DashboardView()
}
