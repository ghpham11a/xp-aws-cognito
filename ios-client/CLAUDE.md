# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Build from command line
xcodebuild -scheme AWSCognito -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build

# Run tests
xcodebuild -scheme AWSCognito -destination 'platform=iOS Simulator,name=iPhone 17 Pro' test
```

## Architecture

Feature-based SwiftUI app with `@Observable` state management (iOS 17+), Swinject dependency injection, and AWS Amplify for Cognito authentication.

```
AWSCognito/AWSCognito/
├── App/
│   ├── AWSCognitoApp.swift           # @main entry, Amplify config, DI resolution
│   └── ContentView.swift              # Root TabView (home, dashboard, account)
├── Core/
│   ├── DI/DependencyContainer.swift   # Swinject container (singleton registrations)
│   ├── Navigation/RouteManager.swift  # Tab selection + NavigationPath per tab
│   └── Services/AuthManager.swift     # Auth state + all Cognito operations
├── Data/
│   ├── Models/                        # Codable structs (User, FeedItem, MessageResponse)
│   ├── Network/APIService.swift       # URLSession API client
│   └── Repositories/MessagesRepository.swift  # Wraps APIService, handles token retrieval
├── Features/                          # View + ViewModel per feature
│   ├── Home/        (HomeView, HomeViewModel)
│   ├── Dashboard/   (DashboardView, DashboardViewModel)
│   ├── Login/       (LoginView, LoginViewModel)
│   └── Account/     (AccountView, AccountViewModel)
├── Shared/Views/LoginCard.swift       # Reusable login prompt card
└── Resources/amplifyconfiguration.json
```

## Key Patterns

**Dependency Injection:**
- `DependencyContainer.shared` (Swinject) registers services, repositories, and some ViewModels
- Singletons (`.container` scope): APIService, AuthManager, RouteManager, MessagesRepository
- Transient (new per resolve): HomeViewModel, DashboardViewModel (registered in container because they depend on MessagesRepository)
- LoginViewModel and AccountViewModel are **not** in the DI container — they're simple `@Observable` classes instantiated directly in views via `@State private var viewModel = LoginViewModel()`
- ViewModels that need repository access are resolved via `@State private var viewModel = DependencyContainer.shared.resolve(SomeViewModel.self)`
- AuthManager and RouteManager resolved in `AWSCognitoApp` and passed via `.environment()`

**API call flow:** View -> ViewModel -> MessagesRepository -> APIService. The repository handles token retrieval via AuthManager so ViewModels don't deal with tokens directly.

**Navigation:** Tab-based `TabView` with independent `NavigationPath` per tab in `RouteManager`. Login presented as `.fullScreenCover` modal triggered by `authManager.showLoginView`.

**Build setting:** `SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor` — all types are implicitly `@MainActor` unless opted out.

**Xcode project uses `PBXFileSystemSynchronizedRootGroup`** — new files in the `AWSCognito/` folder are auto-included. Adding SPM dependencies requires manual `project.pbxproj` edits.

## Dependencies (SPM)

- **amplify-swift** (>= 2.0.0): `Amplify` + `AWSCognitoAuthPlugin`
- **Swinject** (>= 2.10.0): Dependency injection container

## Configuration

- Cognito settings: `Resources/amplifyconfiguration.json` (includes OAuth for Google/Apple sign-in)
- API base URL: hardcoded in `APIService.swift` (`https://feedback-test.ngrok.io`)
- URL scheme `awscognito://` registered in `Info.plist` for OAuth callbacks
