//
//  RouteManager.swift
//  AWSCognito
//
//  Created by Anthony Pham on 2/4/26.
//
import SwiftUI

enum Tab {
    case home
    case dashboard
    case account
}

enum HomeDestination: Hashable {
    
}

enum DashboardDestination: Hashable {
    
}

enum AccountDestination: Hashable {
    
}

@Observable
class RouteManager {
    
    var selectedTab: Tab = .home
    
    var homePath = NavigationPath()
    var dashboardPath = NavigationPath()
    var accountPath = NavigationPath()
}

