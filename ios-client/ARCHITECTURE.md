# iOS Architecture Guide

Use this document to implement this architecture in any new iOS project. It covers folder structure, networking, dependency injection, the repository pattern, navigation, configuration, logging, connectivity monitoring, and the View/ViewModel conventions. All code targets iOS 17+ and uses Swift's `@Observable` macro — no Combine, no `ObservableObject`.

## Build Setting

Set `SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor` in Xcode build settings. This makes all types implicitly `@MainActor` — no need to annotate every class. Opt out with `nonisolated` where needed.

## Xcode Project Setup

Use `PBXFileSystemSynchronizedRootGroup` so new Swift files added to the project directory are automatically included in the build target without manual pbxproj edits. Adding SPM dependencies still requires pbxproj changes.

---

## Folder Structure

```
ProjectName/ProjectName/
├── App/
│   ├── ProjectNameApp.swift        # @main entry, DI resolution, environment injection
│   └── ContentView.swift           # Root TabView, connectivity banner, login modal
├── Core/
│   ├── Config.swift                # Reads values from Info.plist (populated by xcconfig)
│   ├── Logging.swift               # os.Logger instances grouped by category
│   ├── DI/
│   │   └── DependencyContainer.swift  # Swinject container, all registrations
│   ├── Navigation/
│   │   ├── RouteManager.swift      # Tab enum, selected tab, NavigationPath per tab
│   │   └── Destinations.swift      # Hashable enums for push destinations per tab
│   └── Networking/
│       ├── Endpoint.swift          # Protocol for request definitions
│       ├── Networking.swift        # HTTPMethod, NetworkError, Networking protocol
│       ├── NetworkService.swift    # URLSession implementation with retry + 401 refresh
│       └── ConnectivityMonitor.swift  # NWPathMonitor wrapper
├── Data/
│   ├── Models/                     # Codable structs (one file per model or logical group)
│   └── Repositories/
│       ├── Feature1/
│       │   ├── Feature1Repo.swift        # Protocol
│       │   ├── Feature1Repository.swift  # Implementation
│       │   └── Feature1Endpoints.swift   # Endpoint structs
│       └── Feature2/
│           ├── ...
├── Features/
│   ├── FeatureName/
│   │   ├── FeatureNameView.swift
│   │   └── FeatureNameViewModel.swift
│   └── ...
└── Shared/
    └── Views/                      # Reusable view components
```

---

## Configuration (`Core/Config.swift`)

Environment-specific values (API URLs, keys) flow through xcconfig files into Info.plist, then are read at runtime.

**xcconfig file** (`Debug.xcconfig` / `Release.xcconfig`):
```
API="https://your-api.example.com"
```

**Info.plist entry:**
```xml
<key>API</key>
<string>$(API)</string>
```

**Swift accessor:**
```swift
import Foundation

enum Config {
    enum Key: String {
        case api = "API"
    }

    static func value(for key: Key) -> String {
        guard let value = Bundle.main.object(forInfoDictionaryKey: key.rawValue) as? String,
              !value.isEmpty else {
            fatalError("Missing configuration value for \(key.rawValue). Check Info.plist.")
        }
        return value
    }
}
```

Usage: `"\(Config.value(for: .api))/users/me"`

---

## Logging (`Core/Logging.swift`)

Use Apple's `os.Logger` — no wrapper protocols, no third-party libraries.

```swift
import OSLog

enum Log {
    static let networking = Logger(subsystem: Bundle.main.bundleIdentifier ?? "App", category: "networking")
    static let auth = Logger(subsystem: Bundle.main.bundleIdentifier ?? "App", category: "auth")
    static let navigation = Logger(subsystem: Bundle.main.bundleIdentifier ?? "App", category: "navigation")
    static let general = Logger(subsystem: Bundle.main.bundleIdentifier ?? "App", category: "general")
}
```

Usage: `Log.networking.debug("GET /users")`, `Log.auth.error("Token refresh failed: \(error)")`.

Any file that calls `Log.*` must `import OSLog`.

---

## Networking

### Endpoint Protocol (`Core/Networking/Endpoint.swift`)

Each API request is a struct conforming to `Endpoint`. Defaults provided via extension.

```swift
import Foundation

protocol Endpoint {
    var url: String { get }
    var method: HTTPMethod { get }
    var headers: [String: String]? { get }
    var queryItems: [URLQueryItem]? { get }
    var body: (any Encodable)? { get }
    var requiresAuth: Bool { get }
}

extension Endpoint {
    var headers: [String: String]? { nil }
    var queryItems: [URLQueryItem]? { nil }
    var body: (any Encodable)? { nil }
    var requiresAuth: Bool { false }
}
```

### HTTPMethod + NetworkError + Networking Protocol (`Core/Networking/Networking.swift`)

```swift
import Foundation

enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case patch = "PATCH"
    case put = "PUT"
    case delete = "DELETE"
}

enum NetworkError: Error {
    case invalidURL
    case invalidResponse
    case unauthorized
    case httpError(Error)         // Transport-level failure
    case encodingError(Error)
    case decodingError(Error)
    case serverError(statusCode: Int, body: Data?)  // Non-2xx with response body

    var isRetryable: Bool {
        switch self {
        case .serverError(let statusCode, _): return (500...599).contains(statusCode)
        case .httpError: return true
        default: return false
        }
    }
}

extension NetworkError: LocalizedError {
    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid URL"
        case .invalidResponse: return "Invalid server response"
        case .unauthorized: return "Authentication required"
        case .httpError(let error): return "Network error: \(error.localizedDescription)"
        case .encodingError: return "Failed to encode request"
        case .decodingError: return "Failed to decode response"
        case .serverError(let statusCode, let body):
            var message = "Server error (\(statusCode))"
            if let body, let text = String(data: body, encoding: .utf8), !text.isEmpty {
                message += ": \(text)"
            }
            return message
        }
    }
}

protocol Networking {
    func makeRequest<T: Decodable>(endpoint: Endpoint) async throws -> T
}
```

### NetworkService (`Core/Networking/NetworkService.swift`)

The concrete `Networking` implementation. Key behaviors:
- **Configured URLSession**: 30s request timeout, 60s resource timeout, `waitsForConnectivity = true`
- **Retry for GET requests**: Up to 3 retries on retryable errors (5xx, transport failures), exponential backoff (1s, 2s, 4s)
- **401 handling**: On `401`, calls `authManager.refreshTokenOrSignOut()`. If refresh succeeds, retries with new token once. If refresh fails, throws `.unauthorized`.
- **Structured logging**: Logs requests at `.debug`, errors at `.error`, retries at `.info`

```swift
import Foundation
import OSLog

class NetworkService: Networking {

    let decoder = JSONDecoder()
    let encoder = JSONEncoder()
    var authManager: AuthManager
    private let session: URLSession

    init(authManager: AuthManager) {
        self.authManager = authManager
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        config.waitsForConnectivity = true
        self.session = URLSession(configuration: config)
    }

    func makeRequest<T: Decodable>(endpoint: Endpoint) async throws -> T {
        let request = try await buildURLRequest(endpoint: endpoint)
        let maxRetries = (endpoint.method == .get) ? 3 : 0
        var lastError: Error?

        for attempt in 0...maxRetries {
            if attempt > 0 {
                let delay = UInt64(pow(2.0, Double(attempt - 1))) * 1_000_000_000
                Log.networking.info("Retry \(attempt)/\(maxRetries) for \(endpoint.method.rawValue) \(endpoint.url)")
                try await Task.sleep(nanoseconds: delay)
            }
            do {
                return try await executeRequest(request, endpoint: endpoint)
            } catch let error as NetworkError where error.isRetryable && attempt < maxRetries {
                lastError = error
                Log.networking.error("Retryable error on attempt \(attempt + 1): \(error.localizedDescription)")
                continue
            } catch {
                throw error
            }
        }
        throw lastError!
    }

    private func buildURLRequest(endpoint: Endpoint) async throws -> URLRequest {
        guard var urlComponents = URLComponents(string: endpoint.url) else {
            throw NetworkError.invalidURL
        }
        if let queryItems = endpoint.queryItems, !queryItems.isEmpty {
            urlComponents.queryItems = queryItems
        }
        guard let url = urlComponents.url else {
            throw NetworkError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = endpoint.method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        if endpoint.requiresAuth {
            guard let token = try await authManager.getIdToken() else {
                throw NetworkError.unauthorized
            }
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        endpoint.headers?.forEach { key, value in
            request.setValue(value, forHTTPHeaderField: key)
        }

        if let body = endpoint.body {
            do {
                request.httpBody = try encoder.encode(body)
            } catch {
                throw NetworkError.encodingError(error)
            }
        }

        Log.networking.debug("\(endpoint.method.rawValue) \(endpoint.url)")
        return request
    }

    private func executeRequest<T: Decodable>(_ request: URLRequest, endpoint: Endpoint) async throws -> T {
        var data: Data
        var response: URLResponse

        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw NetworkError.httpError(error)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.invalidResponse
        }

        if httpResponse.statusCode == 401 && endpoint.requiresAuth {
            Log.networking.info("Received 401, attempting token refresh")
            let refreshed = await authManager.refreshTokenOrSignOut()
            if refreshed {
                var retryRequest = request
                if let newToken = try await authManager.getIdToken() {
                    retryRequest.setValue("Bearer \(newToken)", forHTTPHeaderField: "Authorization")
                }
                do {
                    (data, response) = try await session.data(for: retryRequest)
                } catch {
                    throw NetworkError.httpError(error)
                }
                guard let retryHttpResponse = response as? HTTPURLResponse else {
                    throw NetworkError.invalidResponse
                }
                guard (200...299).contains(retryHttpResponse.statusCode) else {
                    throw NetworkError.serverError(statusCode: retryHttpResponse.statusCode, body: data)
                }
            } else {
                throw NetworkError.unauthorized
            }
        } else {
            guard (200...299).contains(httpResponse.statusCode) else {
                Log.networking.error("HTTP \(httpResponse.statusCode) for \(endpoint.method.rawValue) \(endpoint.url)")
                throw NetworkError.serverError(statusCode: httpResponse.statusCode, body: data)
            }
        }

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw NetworkError.decodingError(error)
        }
    }
}
```

### Connectivity Monitor (`Core/Networking/ConnectivityMonitor.swift`)

```swift
import Network
import Observation

@Observable
class ConnectivityMonitor {
    var isConnected = true
    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "ConnectivityMonitor")

    init() {
        monitor.pathUpdateHandler = { [weak self] path in
            let connected = path.status == .satisfied
            Task { @MainActor in
                self?.isConnected = connected
            }
        }
        monitor.start(queue: queue)
    }

    deinit { monitor.cancel() }
}
```

Injected via `.environment()` and consumed with `@Environment(ConnectivityMonitor.self)`. Show an offline banner in `ContentView` when `!connectivityMonitor.isConnected`.

---

## Repository Pattern

Each domain area gets its own folder under `Data/Repositories/` with three files:

### 1. Protocol (`FeatureRepo.swift`)
```swift
protocol MessagesRepo {
    func fetchPublicMessage() async throws -> MessageResponse
    func fetchPrivateMessage() async throws -> MessageResponse
}
```

### 2. Endpoints (`FeatureEndpoints.swift`)
Namespaced under an enum. Each endpoint is a struct conforming to `Endpoint`.

```swift
import Foundation

enum MessagesEndpoints {

    struct GetPublicMessages: Endpoint {
        var url: String
        var method: HTTPMethod = .get

        init() {
            self.url = "\(Config.value(for: .api))/messages/public"
        }
    }

    struct GetPrivateMessages: Endpoint {
        var url: String
        var method: HTTPMethod = .get
        var requiresAuth: Bool = true

        init() {
            self.url = "\(Config.value(for: .api))/messages/private"
        }
    }
}
```

For POST endpoints with a body:
```swift
struct ExchangeToken: Endpoint {
    var url: String
    var method: HTTPMethod = .post
    var body: (any Encodable)?

    init(idToken: String) {
        self.url = "\(Config.value(for: .api))/auth/google"
        self.body = GoogleAuthRequest(idToken: idToken)
    }
}
```

### 3. Implementation (`FeatureRepository.swift`)
Depends on the `Networking` protocol (not the concrete `NetworkService`).

```swift
class MessagesRepository: MessagesRepo {
    private let networkService: Networking

    init(networkService: Networking) {
        self.networkService = networkService
    }

    func fetchPublicMessage() async throws -> MessageResponse {
        let endpoint = MessagesEndpoints.GetPublicMessages()
        return try await networkService.makeRequest(endpoint: endpoint)
    }

    func fetchPrivateMessage() async throws -> MessageResponse {
        let endpoint = MessagesEndpoints.GetPrivateMessages()
        return try await networkService.makeRequest(endpoint: endpoint)
    }
}
```

### Models (`Data/Models/`)
Plain `Codable` structs. Use `CodingKeys` when the API uses `snake_case`.

```swift
struct User: Codable, Identifiable {
    let userId: String
    let email: String
    let name: String?
    let createdAt: String

    var id: String { userId }

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case email
        case name
        case createdAt = "created_at"
    }
}
```

---

## Dependency Injection (`Core/DI/DependencyContainer.swift`)

Uses Swinject (SPM: `>= 2.10.0`). Single shared container, private init.

**Registration order matters**: services → repositories → view models → post-init wiring.

**Scoping rules:**
- `.container` (singleton): Services, repositories, managers, monitors
- Transient (default): ViewModels that need repository access
- Not registered at all: Simple ViewModels with no dependencies (instantiated directly in views)

```swift
import Foundation
import Swinject

final class DependencyContainer {
    static let shared = DependencyContainer()
    let container: Container

    private init() {
        container = Container()

        // Services (singletons)
        container.register(AuthManager.self) { _ in
            AuthManager()
        }.inObjectScope(.container)

        container.register(Networking.self) { resolver in
            NetworkService(authManager: resolver.resolve(AuthManager.self)!)
        }.inObjectScope(.container)

        container.register(RouteManager.self) { _ in
            RouteManager()
        }.inObjectScope(.container)

        container.register(ConnectivityMonitor.self) { _ in
            ConnectivityMonitor()
        }.inObjectScope(.container)

        // Repositories (singletons)
        container.register(MessagesRepo.self) { resolver in
            MessagesRepository(networkService: resolver.resolve(Networking.self)!)
        }.inObjectScope(.container)

        container.register(UsersRepo.self) { resolver in
            UsersRepository(networkService: resolver.resolve(Networking.self)!)
        }.inObjectScope(.container)

        // ViewModels (transient — new instance per resolve)
        container.register(HomeViewModel.self) { resolver in
            HomeViewModel(messagesRepository: resolver.resolve(MessagesRepo.self)!)
        }

        container.register(DashboardViewModel.self) { resolver in
            DashboardViewModel(messagesRepository: resolver.resolve(MessagesRepo.self)!)
        }

        // Post-init wiring (breaks circular dependency if needed)
        // Example: AuthManager needs AuthRepo, but AuthRepo needs Networking,
        // which needs AuthManager. Wire it after all registrations.
        // let authManager = container.resolve(AuthManager.self)!
        // let authRepo = container.resolve(AuthRepo.self)!
        // authManager.configure(authRepository: authRepo)
    }

    func resolve<T>(_ type: T.Type) -> T {
        guard let resolved = container.resolve(type) else {
            fatalError("Failed to resolve \(type)")
        }
        return resolved
    }
}
```

---

## Navigation (`Core/Navigation/`)

### RouteManager
```swift
import SwiftUI

enum Tab {
    case home
    case dashboard
    case account
}

@Observable
class RouteManager {
    var selectedTab: Tab = .home
    var homePath = NavigationPath()
    var dashboardPath = NavigationPath()
    var accountPath = NavigationPath()
}
```

### Destinations
One `Hashable` enum per tab for type-safe push navigation.

```swift
enum HomeDestination: Hashable {
    case detail(itemId: String)
}

enum DashboardDestination: Hashable {
    // ...
}
```

Use `.navigationDestination(for: HomeDestination.self) { ... }` in each `NavigationStack`.

---

## View / ViewModel Conventions

### ViewModels

All ViewModels are `@Observable` classes. Two categories:

**1. ViewModels with dependencies** (registered in DI container, resolved via `DependencyContainer.shared.resolve()`):
```swift
@Observable
class HomeViewModel {
    private let messagesRepository: MessagesRepo

    var publicMessage: String?
    var isLoading = true
    var error: String?

    init(messagesRepository: MessagesRepo) {
        self.messagesRepository = messagesRepository
    }

    func fetchPublicMessage() async {
        isLoading = true
        error = nil
        do {
            let response = try await messagesRepository.fetchPublicMessage()
            publicMessage = response.message
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}
```

**2. Simple ViewModels** (no dependencies, instantiated directly):
```swift
@Observable
class LoginViewModel {
    var email = ""
    var password = ""
    var isSignUpMode = false

    var isEmailValid: Bool {
        let pattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
        return email.wholeMatch(of: pattern) != nil
    }
}
```

### Views

Views receive their ViewModel via init and store it as `@State`. Environment objects (`AuthManager`, `RouteManager`, `ConnectivityMonitor`) come from `.environment()`.

**Pattern for DI-resolved ViewModels:**
```swift
struct HomeView: View {
    @Environment(AuthManager.self) private var authManager
    @State private var viewModel: HomeViewModel

    init(viewModel: HomeViewModel) {
        _viewModel = State(initialValue: viewModel)
    }

    var body: some View {
        // ...
    }
}
```

Called from ContentView as:
```swift
HomeView(viewModel: DependencyContainer.shared.resolve(HomeViewModel.self))
```

**Pattern for simple ViewModels:**
```swift
LoginView(viewModel: LoginViewModel())
```

### Error + Retry Pattern

Every data-fetching view should handle loading, error, and success states. Always include a retry button on error:

```swift
if viewModel.isLoading {
    ProgressView()
} else if let error = viewModel.error {
    Text(error)
        .foregroundColor(.red)
    Button("Retry") {
        Task { await viewModel.fetchData() }
    }
    .buttonStyle(.borderedProminent)
} else if let data = viewModel.data {
    Text(data)
}
```

The ViewModel must reset `isLoading = true` and `error = nil` at the start of every fetch method so retry works correctly.

---

## App Entry Point (`App/ProjectNameApp.swift`)

```swift
import SwiftUI
import OSLog

@main
struct ProjectNameApp: App {
    @State private var routeManager = DependencyContainer.shared.resolve(RouteManager.self)
    @State private var authManager = DependencyContainer.shared.resolve(AuthManager.self)
    @State private var connectivityMonitor = DependencyContainer.shared.resolve(ConnectivityMonitor.self)

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(routeManager)
                .environment(authManager)
                .environment(connectivityMonitor)
        }
    }
}
```

## Root View (`App/ContentView.swift`)

```swift
struct ContentView: View {
    @Environment(RouteManager.self) private var routeManager
    @Environment(AuthManager.self) private var authManager
    @Environment(ConnectivityMonitor.self) private var connectivityMonitor

    var body: some View {
        @Bindable var routeManager = routeManager
        @Bindable var authManager = authManager

        VStack(spacing: 0) {
            if !connectivityMonitor.isConnected {
                Text("No internet connection")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 6)
                    .background(Color.red)
            }

            TabView(selection: $routeManager.selectedTab) {
                NavigationStack(path: $routeManager.homePath) {
                    HomeView(viewModel: DependencyContainer.shared.resolve(HomeViewModel.self))
                }
                .tabItem { Label("Home", systemImage: "house.fill") }
                .tag(Tab.home)

                // ... more tabs
            }
        }
        .fullScreenCover(isPresented: $authManager.showLoginView) {
            LoginView(viewModel: LoginViewModel())
        }
    }
}
```

Key: use `@Bindable var` inside `body` to get `$` bindings from `@Environment` `@Observable` objects.

---

## Shared Views (`Shared/Views/`)

Reusable view components used across features. Use `@ViewBuilder` generics for customizable content slots:

```swift
struct LoginCard<Greeting: View, Statement: View>: View {
    var onLoginTapped: () -> Void
    private let greeting: Greeting
    private let statement: Statement

    init(
        onLoginTapped: @escaping () -> Void,
        @ViewBuilder greeting: () -> Greeting,
        @ViewBuilder statement: () -> Statement
    ) {
        self.onLoginTapped = onLoginTapped
        self.greeting = greeting()
        self.statement = statement()
    }

    var body: some View {
        VStack {
            greeting.frame(maxWidth: .infinity, alignment: .leading)
            statement.frame(maxWidth: .infinity, alignment: .leading)
            Button(action: onLoginTapped) {
                Text("Login")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(10)
            }
        }
        .padding()
    }
}
```

---

## Adding a New Feature (Checklist)

1. **Model**: Add `Codable` struct(s) to `Data/Models/`
2. **Repository**: Create folder `Data/Repositories/FeatureName/` with:
   - `FeatureNameRepo.swift` (protocol)
   - `FeatureNameEndpoints.swift` (endpoint structs in a namespace enum)
   - `FeatureNameRepository.swift` (implementation taking `Networking`)
3. **DI**: Register repo as `.container` scope, ViewModel as transient in `DependencyContainer`
4. **ViewModel**: Add `Features/FeatureName/FeatureNameViewModel.swift` — `@Observable` class with repo dependency, loading/error state, async fetch methods
5. **View**: Add `Features/FeatureName/FeatureNameView.swift` — takes ViewModel via init, uses `@State`, reads environment objects as needed
6. **Wire up**: Add tab or navigation destination in `ContentView`/`RouteManager`

---

## SPM Dependencies

| Package | Minimum Version | Products Used |
|---------|----------------|---------------|
| Swinject | 2.10.0 | `Swinject` |

Add via Xcode: File → Add Package Dependencies. The pbxproj needs manual entries for `PBXBuildFile`, `XCSwiftPackageProductDependency`, framework build phase, and `packageProductDependencies`.

---

## Summary of Key Rules

1. **`@Observable` everywhere, `ObservableObject` nowhere.** No `@Published`, no `Combine`.
2. **Protocols for all dependencies.** `Networking`, `MessagesRepo`, etc. Concrete types only in DI registration.
3. **Endpoints are structs.** Grouped in namespace enums. Self-contained — each knows its URL, method, body, and auth requirement.
4. **ViewModels don't touch tokens.** Repositories call the network layer; the network layer handles auth via `AuthManager`.
5. **Environment for singletons, init for ViewModels.** `AuthManager`/`RouteManager`/`ConnectivityMonitor` via `.environment()`. ViewModels via init parameter stored as `@State`.
6. **Reset loading state on every fetch.** `isLoading = true; error = nil` at the top of every async method.
7. **Retry is GET-only.** POST/PUT/DELETE are never automatically retried.
8. **Config via xcconfig → Info.plist → `Config.value(for:)`.** Never hardcode URLs.
9. **`import OSLog` in any file that uses `Log.*`.** The `Logging.swift` file defines the loggers but consumers still need the import.
