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

**Backend (server/app/):**
```bash
uvicorn main:app --port 6969 --reload   # Start dev server (run from server/app/)
pip install -r requirements.txt          # Install dependencies (run from server/)
```

**Tunneling for mobile testing:**
```bash
ngrok http --hostname=feedback-test.ngrok.io 6969
ngrok start --all --config ngrok.yml
```

## Architecture

All four clients share the same authentication flow and hit the same backend API. The iOS and Android Cognito configs include OAuth sections for Google/Apple sign-in; the Next.js config is minimal.

### Backend (server/app/)

FastAPI with app factory pattern (`create_app()` in `main.py`). Routers: `users.py` (JWT validation, just-in-time user provisioning to `data/users.json`) and `messages.py` (public + private message endpoints). All protected endpoints use `Depends(verify_token)`. JWT validation uses `python-jose` with JWKS caching. Custom middleware stack: RequestID, Logging, SecurityHeaders. Config via `pydantic-settings` loaded from `.env`.

### Next.js Frontend (nextjs-client/)

Next.js 16 + React 19 + TypeScript + Tailwind 4. Auth state managed via `AuthProvider` context (`lib/auth-context.tsx`). `AmplifyProvider` component initializes Amplify and wraps the app. Route-based pages under `app/` (home, dashboard, account). Amplify config in `lib/amplify-config.ts`.

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

**Protected (JWT required):** `GET /users/me`, `GET /users`, `GET /users/{user_id}`, `GET /feed`, `GET /messages/private`

**Public:** `GET /`, `GET /health`, `GET /messages/public`

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
```

**Mobile clients:** Cognito settings are in `amplifyconfiguration.json` files, not environment variables. API base URL is hardcoded in `APIService.swift` (iOS) and `ApiClient.kt` (Android) — currently set to the ngrok tunnel URL.

**Important:** Cognito App Client must be a "Public client" without a client secret.

## Key Patterns

- **Token retrieval:** Next.js uses `fetchAuthSession()`, Android casts to `AWSCognitoAuthSession`, iOS casts to `AuthCognitoTokensProvider`
- **Social sign-in:** iOS supports Apple and Google via `signInWithWebUI(for:)`. Next.js uses `signInWithRedirect({ provider: 'Google' })`. Android has placeholders.
- **iOS DI:** All services/ViewModels created by Swinject. Views resolve ViewModels via `DependencyContainer.shared.resolve()`. Singletons (`.container` scope): APIService, AuthManager, RouteManager, MessagesRepository. Transient: ViewModels.
