//
//  HomeView.swift
//  AWSCognito
//

import SwiftUI

struct HomeView: View {
    
    @Environment(RouteManager.self) private var routeManager
    @Environment(AuthManager.self) private var authManager
    
    var body: some View {
        ScrollView {
            Text("Home View")
        }
    }
}

#Preview {
    HomeView()
}
