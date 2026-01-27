# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AWS Cognito authentication demo with Next.js web frontend, Android native app, and FastAPI backend. Demonstrates user authentication, JWT validation, and protected API endpoints.

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

**Backend (server/app/):**
```bash
uvicorn main:app --port 6969 --reload   # Start dev server
pip install -r requirements.txt          # Install dependencies (from server/)
```

### Tunneling for mobile testing

```bash
ngrok http --hostname=feedback-test.ngrok.io 6969
```

## Architecture

```
nextjs-client/                    # Next.js 16 frontend
├── app/
│   ├── layout.tsx                # Root layout with AmplifyProvider
│   └── page.tsx                  # Tab-based SPA (home/dashboard/account)
├── components/
│   ├── AmplifyProvider.tsx       # Initializes Amplify auth
│   ├── DashboardContent.tsx      # Fetches /users/me and /feed from backend
│   └── UserManagement.tsx        # Password change, sign out
└── lib/amplify-config.ts         # Cognito configuration

android-client/                   # Android Jetpack Compose app
├── app/src/main/
│   ├── res/raw/amplifyconfiguration.json  # Cognito config
│   └── java/com/example/awscognito/
│       ├── CognitoApp.kt         # Application class, Amplify init
│       ├── MainActivity.kt       # Main activity with Compose
│       ├── data/
│       │   ├── api/              # Retrofit client for backend
│       │   └── model/            # User, FeedItem data classes
│       └── ui/
│           ├── screens/          # Home, Dashboard, Account, Login screens
│           └── viewmodel/        # AuthViewModel (auth state + API calls)

server/app/                       # FastAPI backend
├── main.py                       # App setup, CORS, routers
├── data/users.json               # Local user storage (created at runtime)
└── routers/
    ├── users.py                  # JWT validation, just-in-time user provisioning
    └── feed.py                   # Protected feed endpoint (future: role-based)
```

## Auth Flow

1. User signs up/in via Amplify Authenticator → Cognito issues JWT
2. Frontend calls backend with `Authorization: Bearer <idToken>`
3. Backend validates JWT against Cognito JWKS (public keys)
4. `GET /users/me` creates local user record on first call (just-in-time provisioning)
5. User data stored in `server/app/data/users.json`

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

**Important:** Cognito App Client must be a "Public client" without a client secret.

## Key Patterns

- **Next.js**: Uses `fetchAuthSession()` from `aws-amplify/auth` to get JWT tokens
- **Android**: Uses `Amplify.Auth.fetchAuthSession()` to get tokens, Retrofit for API calls
- **Backend**: Uses `python-jose` to validate JWTs against Cognito JWKS
- All protected endpoints use `Depends(verify_token)` for auth
- Feed endpoint prepared for role-based filtering via `claims.get("cognito:groups")`

## Android-Specific Notes

- API base URL in `ApiClient.kt` - uses ngrok URL for physical device, `10.0.2.2` for emulator
- Cognito config in `res/raw/amplifyconfiguration.json` (not environment variables)
- Uses Jetpack Compose with Material 3, single-activity architecture
- `AuthViewModel` manages both auth state and dashboard data loading
