# iOS AWS Cognito Authentication with Sign in with Apple

A SwiftUI iOS app demonstrating AWS Cognito authentication with email/password sign-up, sign-in, and federated Sign in with Apple using Amplify Swift v2.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Architecture Overview](#architecture-overview)
- [Step 1: AWS Cognito Setup](#step-1-aws-cognito-setup)
- [Step 2: Apple Developer Setup (for Sign in with Apple)](#step-2-apple-developer-setup-for-sign-in-with-apple)
- [Step 3: Connect Apple to Cognito](#step-3-connect-apple-to-cognito)
- [Step 4: Xcode Project Setup](#step-4-xcode-project-setup)
- [Step 5: Amplify Configuration](#step-5-amplify-configuration)
- [Step 6: Code Implementation](#step-6-code-implementation)
- [How It Works](#how-it-works)
- [Common Errors and Fixes](#common-errors-and-fixes)

---

## Prerequisites

- Xcode 15+ (iOS 17+ deployment target)
- An AWS account with access to Amazon Cognito
- An Apple Developer account (for Sign in with Apple)
- Basic familiarity with SwiftUI and async/await

## Architecture Overview

```
App Entry (AWSCognitoApp.swift)
  └── Configures Amplify with AWSCognitoAuthPlugin
  └── Injects AuthManager into environment

AuthManager (@Observable)
  ├── Email/password sign-up, sign-in, confirmation
  ├── Social sign-in (Apple, Google) via Hosted UI
  ├── Sign-out, password change
  └── JWT token retrieval for API calls

LoginView (presented as .fullScreenCover)
  ├── Sign-in form (email/password)
  ├── Sign-up form (email/password + confirmation)
  ├── Email confirmation form
  └── Social sign-in buttons (Apple, Google)
```

The auth flow uses Cognito's Hosted UI for social sign-in. When a user taps "Sign in with Apple," Amplify opens an `ASWebAuthenticationSession` that navigates to Cognito's hosted login page, which redirects to Apple, then back to Cognito, and finally back to the app via a custom URL scheme.

## Step 1: AWS Cognito Setup

### 1.1 Create a User Pool

1. Go to **AWS Console > Amazon Cognito > Create user pool**
2. Configure sign-in:
   - Sign-in options: **Email**
3. Configure security:
   - MFA: Optional or off for development
   - Password policy: Minimum 8 characters (default)
4. Configure sign-up:
   - Self-service sign-up: **Enabled**
   - Required attributes: **email**
   - Verification: **Send email message, verify email address**
5. Create the pool and note the **User Pool ID** (e.g., `us-east-1_XXXXXXXXX`)

### 1.2 Create an App Client

1. In your User Pool, go to **App integration > Create app client**
2. App type: **Public client** (no client secret)
3. Note the **App Client ID**

### 1.3 Configure the Hosted UI Domain

1. Go to **App integration > Domain**
2. Choose **Use a Cognito domain**
3. Enter a domain prefix (e.g., `your-app-name`)
4. Your domain will be: `https://<prefix>.auth.<region>.amazoncognito.com`

### 1.4 Configure App Client OAuth Settings

In **App integration > App client settings**, configure:

| Setting | Value |
|---------|-------|
| **Allowed callback URLs** | `awscognito://callback` |
| **Allowed sign-out URLs** | `awscognito://signout` |
| **Identity providers** | Select "SignInWithApple" (and/or Google, Cognito user pool) |
| **OAuth 2.0 grant types** | Authorization code grant |
| **OpenID Connect scopes** | `openid`, `email`, `profile`, `aws.cognito.signin.user.admin` |

The `aws.cognito.signin.user.admin` scope is required if you call `Amplify.Auth.fetchUserAttributes()` after sign-in.

## Step 2: Apple Developer Setup (for Sign in with Apple)

### 2.1 Create an App ID

1. Go to **Apple Developer > Certificates, Identifiers & Profiles > Identifiers**
2. Create a new **App ID**
3. Enable the **Sign in with Apple** capability

### 2.2 Create a Services ID

1. Under **Identifiers**, create a new **Services ID**
2. Enable **Sign in with Apple**
3. Click **Configure** next to Sign in with Apple:
   - **Primary App ID**: Select your app
   - **Domains and Subdomains**: Add your Cognito domain (e.g., `your-prefix.auth.us-east-1.amazoncognito.com`)
   - **Return URLs**: `https://<your-cognito-domain>/oauth2/idpresponse`
4. Note the **Services ID identifier** (e.g., `com.yourcompany.yourapp.service`)

The return URL is Cognito's callback endpoint -- this is where Apple sends the authorization code. This is NOT the same as your app's redirect URI.

### 2.3 Create a Private Key

1. Under **Keys**, create a new key
2. Enable **Sign in with Apple**
3. Download the `.p8` private key file
4. Note the **Key ID** and your **Team ID** (visible in the top-right of the Apple Developer portal)

## Step 3: Connect Apple to Cognito

### 3.1 Add Apple as an Identity Provider

1. In Cognito, go to **Sign-in experience > Federated identity provider sign-in**
2. Click **Add identity provider > Sign in with Apple**
3. Fill in:
   - **Services ID**: The Services ID from Step 2.2
   - **Team ID**: Your Apple Developer Team ID
   - **Key ID**: The key ID from Step 2.3
   - **Private key**: Paste the contents of the `.p8` file
   - **Authorized scopes**: `name email`

### 3.2 Map Attributes

Map Apple attributes to Cognito user pool attributes:
- `email` -> `email`

### 3.3 Enable Apple on the App Client

Go to **App integration > App client** and ensure "SignInWithApple" is checked under **Identity providers**.

## Step 4: Xcode Project Setup

### 4.1 Add Amplify Swift via SPM

1. In Xcode: **File > Add Package Dependencies**
2. Enter: `https://github.com/aws-amplify/amplify-swift`
3. Set version rule: **Up to Next Major Version** from `2.0.0`
4. Add these products to your target:
   - `Amplify`
   - `AWSCognitoAuthPlugin`

### 4.2 Register the Custom URL Scheme

Create an `Info.plist` at the project root (not inside the source folder if using `PBXFileSystemSynchronizedRootGroup`) with the custom URL scheme:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleURLTypes</key>
    <array>
        <dict>
            <key>CFBundleURLSchemes</key>
            <array>
                <string>awscognito</string>
            </array>
        </dict>
    </array>
</dict>
</plist>
```

Then in your target's **Build Settings**, set:
```
INFOPLIST_FILE = Info.plist
GENERATE_INFOPLIST_FILE = YES
```

This merges your custom keys with Xcode's auto-generated Info.plist. The `awscognito` scheme matches the redirect URIs in `amplifyconfiguration.json`.

**Important:** If the project uses `PBXFileSystemSynchronizedRootGroup` (Xcode 16+), place `Info.plist` at the project root alongside `*.xcodeproj`, NOT inside the synced source folder. Placing it inside the synced folder causes a "Multiple commands produce Info.plist" build error.

## Step 5: Amplify Configuration

Create `amplifyconfiguration.json` in your app's Resources folder:

```json
{
    "auth": {
        "plugins": {
            "awsCognitoAuthPlugin": {
                "IdentityManager": {
                    "Default": {}
                },
                "CognitoUserPool": {
                    "Default": {
                        "PoolId": "<your-user-pool-id>",
                        "AppClientId": "<your-app-client-id>",
                        "Region": "<your-region>"
                    }
                },
                "Auth": {
                    "Default": {
                        "authenticationFlowType": "USER_SRP_AUTH",
                        "socialProviders": ["APPLE", "GOOGLE"],
                        "usernameAttributes": ["EMAIL"],
                        "signupAttributes": ["EMAIL"],
                        "verificationMechanisms": ["EMAIL"],
                        "OAuth": {
                            "WebDomain": "<your-prefix>.auth.<region>.amazoncognito.com",
                            "AppClientId": "<your-app-client-id>",
                            "SignInRedirectURI": "awscognito://callback",
                            "SignOutRedirectURI": "awscognito://signout",
                            "Scopes": [
                                "openid",
                                "email",
                                "profile",
                                "aws.cognito.signin.user.admin"
                            ]
                        }
                    }
                }
            }
        }
    }
}
```

**Critical:** The `OAuth` section must be nested inside `Auth > Default`, not as a sibling of `Auth`. Placing it at the wrong level causes: `AuthError: Make sure that the amplify configuration passed to Auth plugin is valid`.

## Step 6: Code Implementation

### 6.1 Configure Amplify at App Launch

```swift
import SwiftUI
import Amplify
import AWSCognitoAuthPlugin

@main
struct AWSCognitoApp: App {
    @State private var authManager = AuthManager()

    init() {
        do {
            try Amplify.add(plugin: AWSCognitoAuthPlugin())
            try Amplify.configure()
        } catch {
            print("Failed to configure Amplify: \(error)")
        }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(authManager)
        }
    }
}
```

### 6.2 AuthManager - Email/Password Auth

```swift
import SwiftUI
import Amplify
import AWSPluginsCore
import AWSCognitoAuthPlugin

@Observable
@MainActor
final class AuthManager {
    var isAuthenticated = false
    var isLoading = false
    var authError: String?
    var showLoginView = false
    var needsConfirmation = false
    var confirmationEmail: String?

    // Sign up with email and password
    func signUp(email: String, password: String) async {
        isLoading = true
        authError = nil

        let attributes = [AuthUserAttribute(.email, value: email)]
        let options = AuthSignUpRequest.Options(userAttributes: attributes)

        do {
            let result = try await Amplify.Auth.signUp(
                username: email, password: password, options: options
            )
            switch result.nextStep {
            case .confirmUser(_, _, _):
                needsConfirmation = true
                confirmationEmail = email
            case .done:
                await signIn(email: email, password: password)
            case .completeAutoSignIn:
                isAuthenticated = true
                showLoginView = false
            }
        } catch let error as AuthError {
            authError = error.errorDescription
        } catch {
            authError = error.localizedDescription
        }
        isLoading = false
    }

    // Confirm sign-up with verification code
    func confirmSignUp(code: String) async {
        guard let email = confirmationEmail else { return }
        isLoading = true
        authError = nil

        do {
            let result = try await Amplify.Auth.confirmSignUp(
                for: email, confirmationCode: code
            )
            if result.isSignUpComplete {
                needsConfirmation = false
                confirmationEmail = nil
            }
        } catch let error as AuthError {
            authError = error.errorDescription
        } catch {
            authError = error.localizedDescription
        }
        isLoading = false
    }

    // Sign in with email and password
    func signIn(email: String, password: String) async {
        isLoading = true
        authError = nil

        do {
            let result = try await Amplify.Auth.signIn(
                username: email, password: password
            )
            if result.isSignedIn {
                isAuthenticated = true
                showLoginView = false
            }
            if case .confirmSignUp(_) = result.nextStep {
                needsConfirmation = true
                confirmationEmail = email
            }
        } catch let error as AuthError {
            authError = error.errorDescription
        } catch {
            authError = error.localizedDescription
        }
        isLoading = false
    }

    // Sign out (local only to avoid browser popup)
    func signOut() async {
        _ = await Amplify.Auth.signOut(options: .init(globalSignOut: false))
        isAuthenticated = false
    }
}
```

### 6.3 AuthManager - Sign in with Apple

```swift
// Add these methods to AuthManager

func signInWithApple() async {
    isLoading = true
    authError = nil

    do {
        let result = try await Amplify.Auth.signInWithWebUI(
            for: .apple,
            presentationAnchor: getPresentationAnchor(),
            options: .preferPrivateSession()
        )
        if result.isSignedIn {
            isAuthenticated = true
            showLoginView = false
            await fetchUserAttributes()
        }
    } catch let error as AuthError {
        authError = error.errorDescription
    } catch {
        authError = error.localizedDescription
    }
    isLoading = false
}

private func getPresentationAnchor() -> AuthUIPresentationAnchor {
    guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
          let window = scene.windows.first
    else {
        fatalError("No window found")
    }
    return window
}
```

Key details:

- **`signInWithWebUI(for: .apple, ...)`** opens Cognito's Hosted UI via `ASWebAuthenticationSession`, which handles the entire OAuth flow with Apple and returns tokens to the app.
- **`.preferPrivateSession()`** uses an ephemeral browser session. This prevents iOS from showing a "wants to sign in" system alert on sign-out, because no session cookies are persisted. The tradeoff is the user authenticates each time (for Apple this is just Face ID/Touch ID, so it's seamless).
- **Sign-up vs sign-in**: With social providers, Cognito automatically creates the user account on first sign-in. There is no separate "sign up with Apple" API call -- `signInWithWebUI` handles both.

### 6.4 Retrieving JWT Tokens for API Calls

```swift
private func getIdToken() async throws -> String? {
    let session = try await Amplify.Auth.fetchAuthSession()
    if let cognitoTokenProvider = session as? AuthCognitoTokensProvider {
        let tokens = try cognitoTokenProvider.getCognitoTokens().get()
        return tokens.idToken
    }
    return nil
}
```

Use this token in the `Authorization: Bearer <idToken>` header when calling your backend.

### 6.5 Login View with Social Buttons

```swift
// Apple Sign In button
Button(action: {
    Task { await authManager.signInWithApple() }
}) {
    HStack(spacing: 8) {
        Image(systemName: "apple.logo")
            .font(.title2)
        Text("Sign in with Apple")
            .fontWeight(.medium)
    }
    .frame(maxWidth: .infinity)
    .padding()
    .background(Color.black)
    .foregroundColor(.white)
    .cornerRadius(10)
}
```

We use a standard SwiftUI `Button` instead of `SignInWithAppleButton` from `AuthenticationServices` because the actual authentication is handled by Amplify's web UI, not Apple's native Sign in with Apple flow.

### 6.6 Presenting the Login View

```swift
// In ContentView
.fullScreenCover(isPresented: $authManager.showLoginView) {
    LoginView()
}
```

The login view is dismissed by setting `showLoginView = false` in `AuthManager` after successful authentication.

## How It Works

### Email/Password Flow

```
User enters email + password
  └── signUp() -> Cognito creates user
      └── nextStep == .confirmUser
          └── User enters verification code
              └── confirmSignUp() -> Cognito verifies email
                  └── signIn() -> Cognito returns JWT tokens
                      └── isAuthenticated = true, dismiss login
```

### Sign in with Apple Flow

```
User taps "Sign in with Apple"
  └── signInWithWebUI(for: .apple)
      └── ASWebAuthenticationSession opens
          └── Cognito Hosted UI loads
              └── Redirects to Apple's auth page
                  └── User authenticates (Face ID / password)
                      └── Apple sends auth code to Cognito (/oauth2/idpresponse)
                          └── Cognito exchanges code for tokens
                              └── Cognito creates user (if first time)
                                  └── Redirects to awscognito://callback
                                      └── App receives tokens
                                          └── isAuthenticated = true, dismiss login
```

### Sign-Out Flow

```
signOut(globalSignOut: false)
  └── Clears local tokens only (no browser popup)
      └── isAuthenticated = false
```

Using `globalSignOut: false` avoids the iOS system alert that appears when Amplify tries to clear the hosted UI session via a web view. Combined with `.preferPrivateSession()` on sign-in, no session cookies are persisted so there's nothing to clear.

## Common Errors and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Make sure that the amplify configuration passed to Auth plugin is valid` | `OAuth` section is at the wrong nesting level in `amplifyconfiguration.json` | Move `OAuth` inside `Auth > Default`, not as a sibling of `Auth` |
| `Login pages unavailable` | Cognito Hosted UI or identity provider not configured | Ensure the Hosted UI domain exists, Apple is added as an IdP, and the app client has Apple enabled |
| `An error was encountered with the requested page` | Apple identity provider misconfigured in Cognito | Verify the Services ID, Team ID, Key ID, and private key (.p8) are correct in Cognito's Apple IdP settings |
| `Access Token does not have required scopes` | Missing `aws.cognito.signin.user.admin` scope | Add it to both `amplifyconfiguration.json` Scopes array AND the Cognito app client's OpenID Connect scopes |
| `Multiple commands produce Info.plist` | `Info.plist` placed inside a `PBXFileSystemSynchronizedRootGroup` source folder | Move `Info.plist` to the project root (alongside `.xcodeproj`) and set `INFOPLIST_FILE = Info.plist` in build settings |
| `Missing package product 'Amplify'` | Stale SPM cache | **File > Packages > Reset Package Caches** in Xcode, or delete `~/Library/Caches/org.swift.swiftpm` and re-resolve |
| iOS shows "wants to sign in" alert on sign-out | `ASWebAuthenticationSession` triggered during hosted UI sign-out | Use `.preferPrivateSession()` on sign-in and `globalSignOut: false` on sign-out |

## Configuration Checklist

Before testing, verify all three systems are aligned:

### AWS Cognito Console
- [ ] User Pool created with email sign-in
- [ ] App Client is **Public** (no client secret)
- [ ] Hosted UI domain is configured
- [ ] Apple added as a federated identity provider (Services ID, Team ID, Key ID, private key)
- [ ] App client has Apple enabled under Identity providers
- [ ] App client callback URL: `awscognito://callback`
- [ ] App client sign-out URL: `awscognito://signout`
- [ ] OAuth grant type: Authorization code grant
- [ ] Scopes: `openid`, `email`, `profile`, `aws.cognito.signin.user.admin`

### Apple Developer Console
- [ ] App ID with Sign in with Apple enabled
- [ ] Services ID configured with Cognito domain and return URL (`https://<domain>/oauth2/idpresponse`)
- [ ] Private key (.p8) created for Sign in with Apple

### Xcode Project
- [ ] Amplify Swift v2 added via SPM (`Amplify` + `AWSCognitoAuthPlugin`)
- [ ] `amplifyconfiguration.json` in Resources with OAuth nested inside `Auth > Default`
- [ ] `Info.plist` with `awscognito` URL scheme registered
- [ ] `INFOPLIST_FILE` build setting points to `Info.plist`
