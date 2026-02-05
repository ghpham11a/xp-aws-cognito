# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Open in Xcode (SPM dependencies resolve automatically)
open AWSCognito/AWSCognito.xcodeproj

# Build from command line
xcodebuild -scheme AWSCognito -destination 'platform=iOS Simulator,name=iPhone 15' build

# Run tests
xcodebuild -scheme AWSCognito -destination 'platform=iOS Simulator,name=iPhone 15' test
```

## Architecture

Feature-based SwiftUI app with Observable state management and AWS Amplify for Cognito authentication.

```
AWSCognito/AWSCognito/
├── App/
│   ├── AWSCognitoApp.swift      # @main entry, Amplify configuration
│   └── ContentView.swift         # Root TabView with 3 tabs
├── Core/
│   ├── Navigation/RouteManager.swift  # Tab + NavigationPath state
│   ├── Network/APIService.swift       # URLSession API client (singleton)
│   └── Services/AuthManager.swift     # Auth state + Cognito operations
├── Data/Models/                  # Codable structs (User, FeedItem)
├── Features/                     # Feature modules with View + ViewModel
│   ├── Home/HomeView.swift
│   ├── Dashboard/DashboardView.swift
│   ├── Login/LoginView.swift, LoginView+ViewModel.swift
│   └── Account/AccountView.swift, AccountView+ViewModel.swift
├── Shared/Views/                 # Reusable components (LoginCard)
└── Resources/amplifyconfiguration.json  # Cognito pool config
```

## Key Patterns

**State Management:**
- `AuthManager` and `RouteManager` use `@Observable` macro (iOS 17+)
- Injected via `.environment()` in app entry, accessed via `@Environment` in views
- Feature ViewModels are nested structs inside Views (e.g., `LoginView.ViewModel`)

**Navigation:**
- Tab-based with `TabView` and `Tab` enum (home, dashboard, account)
- Each tab has independent `NavigationPath` in RouteManager
- Login presented as `.fullScreenCover` modal

**API Calls:**
- `APIService.shared` singleton with generic `makeRequest<T>()`
- Bearer token auth via `AuthManager.getIdToken()`
- Base URL hardcoded for ngrok tunneling (`https://feedback-test.ngrok.io`)

**Auth Flow:**
- Sign up/in via `Amplify.Auth` -> sets `authManager.isAuthenticated`
- Token retrieval: `fetchAuthSession()` -> cast to `AuthCognitoTokensProvider` -> get ID token
- Password change and sign out handled in AuthManager

## Dependencies

Single dependency via Swift Package Manager:
- **amplify-swift** (>= 2.0.0): `Amplify` + `AWSCognitoAuthPlugin`

## Configuration

Cognito settings in `Resources/amplifyconfiguration.json`:
- Pool ID, App Client ID, Region
- Auth flow type: `USER_SRP_AUTH`

To change the API base URL, edit `APIService.swift:12`.
