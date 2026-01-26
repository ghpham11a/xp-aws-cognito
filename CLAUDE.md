# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AWS Cognito authentication demo with a Next.js frontend and FastAPI backend. Demonstrates user authentication, JWT validation, and protected API endpoints.

## Commands

**Frontend (nextjs-client/):**
```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Build for production
npm run lint     # Run ESLint
```

**Backend (server/app/):**
```bash
uvicorn main:app --port 6969 --reload   # Start dev server
pip install -r requirements.txt          # Install dependencies (from server/)
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

- Frontend uses `fetchAuthSession()` from `aws-amplify/auth` to get JWT tokens
- Backend uses `python-jose` to validate JWTs against Cognito JWKS
- All protected endpoints use `Depends(verify_token)` for auth
- Feed endpoint prepared for role-based filtering via `claims.get("cognito:groups")`
