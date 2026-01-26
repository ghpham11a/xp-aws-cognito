# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AWS Cognito authentication demo built with Next.js 16 (App Router), AWS Amplify v6, and Tailwind CSS v4. The app demonstrates user authentication with a tab-based interface: public Home, protected Dashboard, and protected Account management.

## Commands

```bash
# Development
npm run dev      # Start dev server at localhost:3000

# Build & Production
npm run build    # Build for production
npm start        # Start production server

# Linting
npm run lint     # Run ESLint
```

All commands should be run from the `nextjs-client/` directory.

## Architecture

```
nextjs-client/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout with AmplifyProvider wrapper
│   ├── page.tsx            # Main page with tab state and auth-conditional rendering
│   └── globals.css         # Tailwind + custom CSS with dark mode support
├── components/
│   ├── AmplifyProvider.tsx # Initializes Amplify, wraps with Authenticator.Provider
│   ├── TabNavigation.tsx   # Client-side tab switching (home/dashboard/account)
│   ├── LoginPanel.tsx      # Amplify Authenticator UI
│   ├── HomeContent.tsx     # Public content
│   ├── DashboardContent.tsx # Protected - displays user info
│   └── UserManagement.tsx  # Protected - password change, sign out
└── lib/
    └── amplify-config.ts   # Amplify/Cognito configuration from env vars
```

**Auth Flow:** AmplifyProvider wraps the app → page.tsx uses `useAuthenticator` hook to check `authStatus` → Dashboard/Account tabs render LoginPanel when unauthenticated, protected content when authenticated.

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=<user-pool-id>
NEXT_PUBLIC_COGNITO_CLIENT_ID=<client-id>
```

**Important:** The Cognito App Client must be a "Public client" without a client secret (browser apps cannot securely store secrets).

## Key Patterns

- All interactive components use `"use client"` directive
- Auth state accessed via `useAuthenticator((context) => [context.authStatus])`
- CSS uses custom properties (`--primary`, `--background`, etc.) with dark mode via `prefers-color-scheme`
- Path alias `@/*` maps to project root
