# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AWS Cognito authentication demo with four clients (Next.js, Android, iOS) and a FastAPI backend. All clients authenticate via AWS Amplify, send JWTs to the backend, and the backend validates tokens against Cognito JWKS.

## Commands

**Next.js Frontend (nextjs-client/):**
```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Build for production
npm run lint     # Run ESLint
```

**Android App (android-client/):**
```bash
./gradlew assembleDebug    # Build debug APK
./gradlew assembleRelease  # Build release APK
```

**iOS App (ios-client/AWSCognito/):**
```bash
xcodebuild -scheme AWSCognito -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build
xcodebuild -scheme AWSCognito -destination 'platform=iOS Simulator,name=iPhone 17 Pro' test
```

**Backend (server/):**
```bash
uv sync                                       # Install dependencies (run from server/)
uv sync --dev                                 # Install with dev dependencies
uv run uvicorn app.main:app --port 6969 --reload  # Start dev server
uv run pytest                                 # Run tests
uv run ruff check .                           # Lint code
uv run mypy app                               # Type check
```

**Tunneling for mobile testing:**
```bash
ngrok http --hostname=feedback-test.ngrok.io 6969
ngrok start --all --config ngrok.yml
```

## Architecture

All four clients share the same authentication flow and hit the same backend API. The iOS and Android Cognito configs include OAuth sections for Google/Apple sign-in; the Next.js config is minimal.

### Backend (server/)

FastAPI with clean architecture: app factory pattern, layered structure, and dependency injection.

**Directory Structure:**
```
server/
├── app/
│   ├── main.py              # App factory, lifespan, middleware setup
│   ├── core/                # Cross-cutting concerns
│   │   ├── config.py        # Pydantic settings from .env
│   │   ├── security.py      # JWT verification (TokenClaims dependency)
│   │   ├── exceptions.py    # Custom exceptions + global handlers
│   │   ├── middleware.py    # RequestID, Logging, SecurityHeaders
│   │   └── logging.py       # JSON (prod) / human-readable (dev) formatters
│   ├── api/                 # Thin route controllers
│   │   ├── deps.py          # Shared dependencies re-exports
│   │   ├── router.py        # Main router aggregating v1 routes
│   │   └── v1/              # API version 1
│   │       ├── users.py     # User endpoints
│   │       ├── messages.py  # Message endpoints
│   │       └── auth.py      # Social sign-in token exchange
│   ├── schemas/             # Pydantic request/response models
│   │   ├── auth.py          # AppleAuthRequest, GoogleAuthRequest, AuthTokenResponse
│   │   ├── users.py         # UserResponse, UserCreate
│   │   ├── messages.py      # MessageResponse
│   │   └── common.py        # ErrorResponse, HealthResponse
│   ├── services/            # Business logic layer
│   │   ├── auth_service.py  # Token exchange orchestration
│   │   ├── user_service.py  # User operations
│   │   └── jwks_service.py  # JWKS fetching + caching
│   ├── repositories/        # Data access layer
│   │   └── user_repository.py  # JSON file storage (swappable for DB)
│   └── providers/           # External service integrations
│       ├── cognito.py       # AWS Cognito admin operations
│       ├── apple.py         # Apple token verification
│       └── google.py        # Google token verification
├── data/                    # Persistent data (users.json)
├── tests/                   # Test suite mirroring app/ structure
└── pyproject.toml           # uv project config (deps, scripts, tools)
```

**Key Patterns:**
- **Dependency Injection:** FastAPI `Depends()` for services, repositories, providers
- **Service Layer:** Business logic in services, routes are thin controllers
- **Repository Pattern:** Data access abstracted (JSON now, DB later)
- **Provider Pattern:** External services (Cognito, Apple, Google) wrapped
- **TokenClaims:** Type alias `Annotated[dict, Depends(verify_token)]` for protected endpoints

### Next.js Frontend (nextjs-client/)

Next.js 16 + React 19 + TypeScript + Tailwind 4. Feature-based architecture with modular organization.

**Route Groups:**
- `app/(public)/` — Public pages (home) with shared layout
- `app/(protected)/` — Auth-guarded pages (dashboard, account) with `AuthGuard` wrapper in layout

**Core Libraries (`lib/`):**
- `lib/auth/` — Auth context split into focused modules: `context.tsx` (provider), `amplify-auth.ts` (Amplify operations), `native-auth.ts` (native token management), `token-refresh.ts` (refresh scheduling)
- `lib/api/` — API client layer: `client.ts` (base client with auth header injection), `messages.ts`, `users.ts`, `auth.ts` (token exchange)
- `lib/amplify/` — Amplify config and provider
- `lib/utils/` — JWT decoding, storage helpers

**Features (`features/`):**
- `features/auth/` — Login flows: `LoginPanel` orchestrates form components (`SignInForm`, `SignUpForm`, `ConfirmSignUpForm`, `ForgotPasswordForm`, `ResetPasswordForm`), social auth buttons (`GoogleSignInButton`, `AppleSignInButton`), `AuthGuard`
- `features/dashboard/` — `DashboardContent` + `useDashboardData` hook
- `features/account/` — `AccountContent`, `ChangePasswordForm`
- `features/home/` — `HomeContent`

**Shared Components (`components/`):**
- `components/ui/` — Reusable primitives: Button, Input, FormField, Card, LoadingSpinner
- `components/layout/` — AppHeader, Navigation
- `components/icons/` — AppleIcon, GoogleIcon

**Configuration:**
- `config/env.ts` — Centralized `NEXT_PUBLIC_*` environment variables
- `config/constants.ts` — Application constants (token refresh buffer, storage keys, nav items)
- `types/` — Shared TypeScript types (`auth.ts`, `api.ts`, `global.d.ts` for SDK declarations)

### Android (android-client/)

Kotlin + Jetpack Compose + Material 3, single-activity architecture. `AuthViewModel` (in `shared/viewmodel/`) manages auth state and API calls using StateFlow. Feature screens in `features/` (home, dashboard, account, login). Retrofit + OkHttp for API calls (`data/networking/`). Cognito config in `res/raw/amplifyconfiguration.json`. Amplify callbacks converted to suspend functions via `suspendCoroutine`.

### iOS (ios-client/AWSCognito/)

SwiftUI with `@Observable` macro (iOS 17+). Swinject DI container (`Core/DI/DependencyContainer.swift`) registers all services, repositories, and ViewModels. `AuthManager` and `RouteManager` are resolved from the container and injected via `.environment()`. Feature ViewModels (`HomeViewModel`, `DashboardViewModel`, `LoginViewModel`, `AccountViewModel`) are resolved from the container via `@State`. API calls flow: View -> ViewModel -> `MessagesRepository` -> `APIService`. Cognito config in `Resources/amplifyconfiguration.json`. SPM dependencies: amplify-swift (>= 2.0.0) + Swinject (>= 2.10.0).

**Important iOS build setting:** `SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor` — all types are implicitly `@MainActor`.

**Xcode project uses `PBXFileSystemSynchronizedRootGroup`** — new Swift files added to the `AWSCognito/` directory are automatically included in the build without manual pbxproj edits. However, adding new SPM dependencies requires editing `project.pbxproj` (add `PBXBuildFile`, `XCSwiftPackageProductDependency`, framework build phase entry, and `packageProductDependencies`).

## Auth Flow

1. User signs up/in via Amplify → Cognito issues JWT
2. Client calls backend with `Authorization: Bearer <idToken>`
3. Backend validates JWT against Cognito JWKS (public keys)
4. `GET /users/me` creates local user record on first call (just-in-time provisioning)

## API Endpoints

**Protected (JWT required):** `GET /users/me`, `GET /users`, `GET /users/{user_id}`, `GET /messages/private`

**Public:** `GET /`, `GET /health`, `GET /messages/public`

**Auth (token exchange):** `POST /auth/apple`, `POST /auth/google`, `POST /auth/apple/callback` (Android OAuth redirect)

## Environment Variables

**Frontend (.env.local):**
```
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=<user-pool-id>
NEXT_PUBLIC_COGNITO_CLIENT_ID=<client-id>
NEXT_PUBLIC_API_URL=http://localhost:6969
```

**Backend (.env):**
```
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=<user-pool-id>
COGNITO_CLIENT_ID=<client-id>
AWS_ACCESS_KEY_ID=<access-key>
AWS_SECRET_ACCESS_KEY=<secret-key>

# Native social sign-in (comma-separated for multiple platforms)
APPLE_BUNDLE_ID=com.example.AWSCognito,com.example.services.AWSCognito
GOOGLE_CLIENT_ID=<ios-client-id>,<web-client-id>
```

**Mobile clients:** Cognito settings are in `amplifyconfiguration.json` files, not environment variables. API base URL is hardcoded in `APIService.swift` (iOS) and `ApiClient.kt` (Android) — currently set to the ngrok tunnel URL.

**Important:** Cognito App Client must be a "Public client" without a client secret.

## Key Patterns

- **Token retrieval:** Next.js uses `useAuth().getIdToken()` (checks native tokens first, falls back to Amplify's `fetchAuthSession()`), Android casts to `AWSCognitoAuthSession`, iOS casts to `AuthCognitoTokensProvider`
- **Next.js API calls:** Use `lib/api/` functions which automatically inject auth headers via `apiClient.setTokenProvider()`
- **Native social sign-in:** All platforms use native SDKs (Apple's ASAuthorizationController, Google's GIDSignIn/Credential Manager) + backend token exchange via `POST /auth/apple` and `POST /auth/google`. Backend verifies provider tokens against JWKS, creates/gets Cognito user, returns Cognito tokens.
- **iOS DI:** All services/ViewModels created by Swinject. Views resolve ViewModels via `DependencyContainer.shared.resolve()`. Singletons (`.container` scope): APIService, AuthManager, RouteManager, MessagesRepository. Transient: ViewModels.
- **Apple "Hide My Email":** Users can choose to hide their email, resulting in private relay addresses like `xyz@privaterelay.appleid.com`. Email/name only sent on first sign-in.
