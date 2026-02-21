# AWS Cognito Authentication Demo

AWS Cognito authentication demo with Next.js web frontend, Android native app, iOS native app, and FastAPI backend. Demonstrates user authentication (email/password, Google, Apple), JWT validation, and protected API endpoints.

## Integrating Google Sign-In with AWS Cognito

### 1. Google Cloud Console Setup

#### Create OAuth Credentials

1. Go to **Google Cloud Console → APIs & Services → Credentials**
2. Click **Create Credentials → OAuth client ID**
3. Application type: **Web application** (required for Cognito — do NOT use iOS or Android type, even for mobile apps, because Cognito handles the OAuth exchange server-side)
4. Add **Authorized redirect URI**:
   ```
   https://<your-cognito-domain>.auth.<region>.amazoncognito.com/oauth2/idpresponse
   ```
5. Save the **Client ID** and **Client Secret**

#### Configure OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**
2. Add the required scopes:
   - `openid` — associate user with their personal info
   - `.../auth/userinfo.email` — access primary email address
   - `.../auth/userinfo.profile` — access personal info (name, picture)
3. **Publishing status**: If set to "Testing", only designated test users can sign in. Add your Google accounts under **Test users**, or publish the app for general access.

### 2. AWS Cognito Setup

#### Add Google as Identity Provider

1. Go to **Cognito → User Pools → your pool → Sign-in experience**
2. Under **Federated identity provider sign-in**, click **Add identity provider → Google**
3. Enter the **Client ID** and **Client Secret** from Google Cloud Console
4. **Authorized scopes**: `openid email profile`

> **CRITICAL: Scope formatting bug.** The Cognito console may store scopes with commas (e.g., `openid, email, profile`), which causes Google to receive `openid,` and `email,` as literal scope values — triggering **Error 400: invalid_scope**. If you hit this error, fix it via AWS CLI/CloudShell:
> ```bash
> aws cognito-idp update-identity-provider \
>   --user-pool-id <your-pool-id> \
>   --provider-name Google \
>   --provider-details '{
>     "client_id": "<google-client-id>",
>     "client_secret": "<google-client-secret>",
>     "authorize_scopes": "openid email profile"
>   }'
> ```
> All three fields (`client_id`, `client_secret`, `authorize_scopes`) are required in the update command. Use `aws cognito-idp describe-identity-provider` to retrieve current values.

#### Configure App Client Hosted UI

1. Go to **Cognito → App integration → App client**
2. Under **Hosted UI**, click **Edit**
3. **Identity providers**: Add `Google` (alongside Cognito user pool)
4. **OAuth grant types**: Authorization code grant
5. **OpenID Connect scopes**: `openid`, `email`, `profile` (optionally `aws.cognito.signin.user.admin`)
6. **Callback URL(s)**: Add your app's redirect URI (e.g., `awscognito://callback` for mobile, `http://localhost:3000` for web)
7. **Sign-out URL(s)**: Add your app's sign-out URI (e.g., `awscognito://signout`)

#### Set Up a Cognito Domain

1. Go to **Cognito → App integration → Domain**
2. Create a Cognito domain (e.g., `your-app-name`) — this gives you `https://your-app-name.auth.<region>.amazoncognito.com`
3. This domain is used as the `WebDomain` in Amplify configuration and as the redirect target in Google Cloud

### 3. Client Configuration

#### iOS (Amplify Swift)

In `amplifyconfiguration.json`:
```json
{
  "auth": {
    "plugins": {
      "awsCognitoAuthPlugin": {
        "CognitoUserPool": {
          "Default": {
            "PoolId": "<user-pool-id>",
            "AppClientId": "<app-client-id>",
            "Region": "us-east-1"
          }
        },
        "Auth": {
          "Default": {
            "authenticationFlowType": "USER_SRP_AUTH",
            "socialProviders": ["GOOGLE"],
            "OAuth": {
              "WebDomain": "<your-cognito-domain>.auth.us-east-1.amazoncognito.com",
              "AppClientId": "<app-client-id>",
              "SignInRedirectURI": "awscognito://callback",
              "SignOutRedirectURI": "awscognito://signout",
              "Scopes": ["openid", "email", "profile"]
            }
          }
        }
      }
    }
  }
}
```

In `Info.plist`, register the URL scheme for the callback:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>awscognito</string>
    </array>
  </dict>
</array>
```

Sign in with Google in Swift:
```swift
let result = try await Amplify.Auth.signInWithWebUI(
    for: .google,
    presentationAnchor: window,
    options: .preferPrivateSession()
)
```

#### Android (Amplify Android)

In `res/raw/amplifyconfiguration.json`, use the same structure as iOS. The OAuth section is identical.

Sign in with Google in Kotlin:
```kotlin
Amplify.Auth.signInWithSocialWebUI(
    AuthProvider.google(),
    activity,
    { result -> /* handle success */ },
    { error -> /* handle error */ }
)
```

#### Next.js (Amplify JS)

Configure Amplify with the OAuth settings in your Amplify config, then use:
```typescript
import { signInWithRedirect } from 'aws-amplify/auth';

await signInWithRedirect({ provider: 'Google' });
```

### 4. Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| **Error 400: invalid_scope** | Cognito sends scopes with commas to Google (e.g., `openid,` instead of `openid`) | Update scopes via AWS CLI with space-separated values (see above) |
| **Error 400: redirect_uri_mismatch** | Google OAuth client missing the Cognito callback URI | Add `https://<cognito-domain>/oauth2/idpresponse` to Authorized redirect URIs in Google Cloud Console |
| **Error 401: invalid_client** | Wrong Client ID or Client Secret in Cognito | Verify credentials match between Google Cloud Console and Cognito IdP config |
| **Access denied (403)** | OAuth consent screen in "Testing" mode | Add user email to test users in Google Cloud Console, or publish the app |
| **Missing package product 'AWSCognitoAuthPlugin'** | SPM packages not resolved | Run `xcodebuild -resolvePackageDependencies -scheme AWSCognito` |

### 5. Key Gotchas

- **OAuth client type must be "Web application"** in Google Cloud Console, even for mobile apps. Cognito acts as the OAuth intermediary and needs a client secret, which iOS/Android-type Google clients don't provide.
- **Cognito App Client must be a public client** (no client secret) for Amplify SDK compatibility. This is separate from the Google OAuth client secret.
- **The `aws.cognito.signin.user.admin` scope** is Cognito-specific and should NOT appear in the Google IdP's authorized scopes. It can optionally be included in the App Client's OpenID Connect scopes and the Amplify config's `Scopes` array.
- **Callback URL scheme** (e.g., `awscognito://`) must be registered in both the Cognito App Client and the mobile app's URL scheme configuration (Info.plist for iOS, AndroidManifest for Android).

---

## Native Social Sign-In (Google & Apple)

This project supports two approaches for social sign-in:

1. **Cognito Hosted UI** — Amplify handles the OAuth flow via Cognito's web-based hosted UI
2. **Native SDKs** — Uses Google/Apple's native SDKs for a seamless experience, with backend token exchange

The iOS app uses **native SDKs** for Google Sign-In and **Cognito Hosted UI** for Apple Sign-In.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GOOGLE SIGN-IN FLOW                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐    1. Native UI    ┌──────────────┐                            │
│  │   iOS   │ ─────────────────> │ Google SDK   │                            │
│  │   App   │ <───────────────── │ (GIDSignIn)  │                            │
│  │         │    Google ID Token │              │                            │
│  │         │                    └──────────────┘                            │
│  │         │                                                                │
│  │         │    2. POST /auth/google           ┌─────────────┐              │
│  │         │    {id_token, email, name}        │   Backend   │              │
│  │         │ ─────────────────────────────────>│  (FastAPI)  │              │
│  │         │                                   │             │              │
│  │         │                    3. Verify      │      │      │              │
│  │         │                       token       │      ▼      │              │
│  │         │                                   │  ┌───────┐  │              │
│  │         │                                   │  │Google │  │              │
│  │         │                                   │  │ JWKS  │  │              │
│  │         │                                   │  └───────┘  │              │
│  │         │                                   │      │      │              │
│  │         │                    4. Create/get  │      ▼      │              │
│  │         │                       user        │  ┌───────┐  │              │
│  │         │                                   │  │Cognito│  │              │
│  │         │                                   │  │  User │  │              │
│  │         │                                   │  │ Pool  │  │              │
│  │         │                                   │  └───────┘  │              │
│  │         │                                   │      │      │              │
│  │         │    5. Return Cognito tokens       │      │      │              │
│  │         │    {id_token, access_token}       │      │      │              │
│  │         │ <─────────────────────────────────│──────┘      │              │
│  └─────────┘                                   └─────────────┘              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              APPLE SIGN-IN FLOW                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐    Amplify signInWithWebUI(for: .apple)    ┌───────────────┐   │
│  │   iOS   │ ─────────────────────────────────────────> │ Cognito       │   │
│  │   App   │                                            │ Hosted UI     │   │
│  │         │                                            │      │        │   │
│  │         │                                            │      ▼        │   │
│  │         │                                            │ ┌──────────┐  │   │
│  │         │                                            │ │  Apple   │  │   │
│  │         │                                            │ │   IdP    │  │   │
│  │         │                                            │ └──────────┘  │   │
│  │         │                                            │      │        │   │
│  │         │    Returns Cognito tokens via callback     │      │        │   │
│  │         │ <───────────────────────────────────────── │──────┘        │   │
│  └─────────┘    (awscognito://callback)                 └───────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### iOS Implementation (Key Files)

#### 1. AuthManager.swift — Social Sign-In Methods

```swift
// Apple Sign-In: Uses Cognito Hosted UI via Amplify
func signInWithApple() async {
    let result = try await Amplify.Auth.signInWithWebUI(
        for: .apple,
        presentationAnchor: getPresentationAnchor(),
        options: .preferPrivateSession()
    )
    // Amplify handles token storage automatically
}

// Google Sign-In: Uses native SDK + backend token exchange
func signInWithGoogle() async {
    // Step 1: Native Google Sign-In (shows Google UI)
    let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: presentingVC)
    let googleIdToken = result.user.idToken?.tokenString

    // Step 2: Exchange Google token for Cognito tokens via backend
    let authResponse = try await apiService.exchangeGoogleToken(
        idToken: googleIdToken,
        email: result.user.profile?.email,
        fullName: result.user.profile?.name
    )

    // Step 3: Store Cognito tokens locally (not in Amplify)
    nativeIdToken = authResponse.idToken
    nativeAccessToken = authResponse.accessToken
}
```

#### 2. APIService.swift — Token Exchange

```swift
func exchangeGoogleToken(idToken: String, email: String?, fullName: String?) async throws -> AuthTokenResponse {
    // POST /auth/google with Google ID token
    // Returns Cognito tokens: { id_token, access_token, refresh_token, expires_in }
}
```

#### 3. Token Retrieval (AuthManager.swift)

```swift
func getIdToken() async throws -> String? {
    // Native Google users: return stored Cognito token
    if let nativeToken = nativeIdToken {
        return nativeToken
    }
    // Amplify users (email/password, Apple): get from Amplify session
    let session = try await Amplify.Auth.fetchAuthSession()
    if let cognitoTokenProvider = session as? AuthCognitoTokensProvider {
        return try cognitoTokenProvider.getCognitoTokens().get().idToken
    }
    return nil
}
```

### Backend Implementation (Key Files)

#### 1. server/app/routers/auth.py

**Google Token Exchange (`POST /auth/google`):**

```python
@router.post("/google", response_model=AuthTokenResponse)
async def google_sign_in(request: GoogleAuthRequest):
    # 1. Verify Google ID token using Google's JWKS
    claims = verify_google_token(request.id_token)

    # 2. Get or create Cognito user with email as username
    username = admin_get_or_create_google_user(
        cognito_client, user_pool_id, google_sub, email, full_name
    )

    # 3. Generate Cognito tokens using ADMIN_USER_PASSWORD_AUTH
    tokens = admin_initiate_auth(cognito_client, user_pool_id, client_id, username)

    return tokens  # { id_token, access_token, refresh_token, expires_in }
```

**Apple Token Exchange (`POST /auth/apple`):**
- Same pattern as Google, but verifies against Apple's JWKS (`https://appleid.apple.com/auth/keys`)
- Username format: `apple_{sub}` (Apple's unique user identifier)

#### 2. Token Verification

```python
def verify_google_token(id_token_str: str) -> dict:
    # Fetch Google's JWKS (cached)
    jwks = get_google_jwks()  # https://www.googleapis.com/oauth2/v3/certs

    # Find key matching token's kid
    key = find_key_by_kid(jwks, unverified_header["kid"])

    # Verify signature, audience (Google Client ID), and issuer
    claims = jwt.decode(id_token_str, key, algorithms=["RS256"], audience=google_client_id)

    return claims
```

#### 3. Cognito User Creation

```python
def admin_get_or_create_google_user(cognito_client, user_pool_id, google_sub, email, full_name):
    # Check if user exists
    try:
        cognito_client.admin_get_user(UserPoolId=user_pool_id, Username=email)
        return email
    except UserNotFoundException:
        pass

    # Create new user with verified email
    cognito_client.admin_create_user(
        UserPoolId=user_pool_id,
        Username=email,
        UserAttributes=[
            {"Name": "email", "Value": email},
            {"Name": "email_verified", "Value": "true"},
        ],
        MessageAction="SUPPRESS",  # Don't send welcome email
    )

    # Set random password (social users don't use passwords)
    cognito_client.admin_set_user_password(...)

    return email
```

### Environment Variables (server/.env)

```bash
# Google Sign-In (iOS OAuth Client ID from Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Apple Sign-In (iOS app bundle identifier)
APPLE_BUNDLE_ID=com.example.AWSCognito

# AWS credentials for Cognito admin operations
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

### AWS Cognito App Client Requirements

For the backend to issue tokens via `ADMIN_USER_PASSWORD_AUTH`, the Cognito App Client must:

1. **Enable `ALLOW_ADMIN_USER_PASSWORD_AUTH`** in the app client's auth flows
2. Be a **public client** (no client secret) for Amplify SDK compatibility
3. Have the backend's IAM user/role with `cognito-idp:Admin*` permissions

### Why Two Different Approaches?

| Approach | Provider | Pros | Cons |
|----------|----------|------|------|
| **Cognito Hosted UI** | Apple | Simple setup, Cognito handles everything | Opens Safari/webview |
| **Native SDK + Backend** | Google | Native UI, better UX | Requires backend endpoint |

Apple Sign-In works well with Cognito's hosted UI because Apple's native SDK (`ASAuthorizationController`) integrates seamlessly with the system. Google Sign-In benefits from the native SDK approach because it provides a smoother, more Google-like experience without browser redirects.

### Key Gotchas

- **Google Client ID type**: For native iOS Google Sign-In, create an **iOS** OAuth client ID in Google Cloud Console (different from the Web client ID used for Cognito hosted UI)
- **Token storage**: Native Google users' tokens are stored in memory (`AuthManager.nativeIdToken`), not in Amplify's secure storage. Consider using Keychain for production.
- **Sign-out**: Must handle both `GIDSignIn.sharedInstance.signOut()` (Google) and `Amplify.Auth.signOut()` (Cognito/Apple) depending on auth provider
- **IAM permissions**: Backend needs `cognito-idp:AdminCreateUser`, `AdminGetUser`, `AdminSetUserPassword`, `AdminInitiateAuth` permissions
