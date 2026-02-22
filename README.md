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

This project uses **native SDKs + backend token exchange** — the production-standard approach used by most scaled apps:

1. Native SDK presents provider's sign-in UI (no browser redirect)
2. Provider returns ID token to the app
3. App sends token to backend for verification
4. Backend verifies with provider's JWKS, creates/gets Cognito user, returns Cognito tokens

**All platforms** (iOS, Android, Next.js) use this direct pattern for both Google and Apple sign-in.

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
│  ┌─────────┐    1. Native UI        ┌──────────────────┐                    │
│  │   iOS   │ ─────────────────────> │ ASAuthorization  │                    │
│  │   App   │ <───────────────────── │   Controller     │                    │
│  │         │    Apple ID Token      │ (System sheet)   │                    │
│  │         │                        └──────────────────┘                    │
│  │         │                                                                │
│  │         │    2. POST /auth/apple          ┌─────────────┐                │
│  │         │    {identity_token, code}       │   Backend   │                │
│  │         │ ───────────────────────────────>│  (FastAPI)  │                │
│  │         │                                 │             │                │
│  │         │                  3. Verify      │      │      │                │
│  │         │                     token       │      ▼      │                │
│  │         │                                 │  ┌───────┐  │                │
│  │         │                                 │  │ Apple │  │                │
│  │         │                                 │  │ JWKS  │  │                │
│  │         │                                 │  └───────┘  │                │
│  │         │                                 │      │      │                │
│  │         │                  4. Create/get  │      ▼      │                │
│  │         │                     user        │  ┌───────┐  │                │
│  │         │                                 │  │Cognito│  │                │
│  │         │                                 │  │  User │  │                │
│  │         │                                 │  │ Pool  │  │                │
│  │         │                                 │  └───────┘  │                │
│  │         │                                 │      │      │                │
│  │         │    5. Return Cognito tokens     │      │      │                │
│  │         │ <───────────────────────────────│──────┘      │                │
│  └─────────┘                                 └─────────────┘                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### iOS Implementation (Key Files)

#### 1. AuthManager.swift — Social Sign-In Methods

```swift
// Apple Sign-In: Uses native ASAuthorizationController + backend token exchange
func signInWithApple() async {
    // Step 1: Native Apple Sign-In (shows system sheet)
    let appleIDProvider = ASAuthorizationAppleIDProvider()
    let request = appleIDProvider.createRequest()
    request.requestedScopes = [.fullName, .email]

    let result = try await performAppleSignIn(request: request)

    // Step 2: Extract tokens from authorization
    guard let credential = result.credential as? ASAuthorizationAppleIDCredential,
          let identityTokenData = credential.identityToken,
          let authCodeData = credential.authorizationCode,
          let identityToken = String(data: identityTokenData, encoding: .utf8),
          let authCode = String(data: authCodeData, encoding: .utf8) else {
        throw AuthError.unknown("Missing Apple credentials")
    }

    // Email and name are only provided on FIRST sign-in!
    let email = credential.email
    let fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .compactMap { $0 }.joined(separator: " ")

    // Step 3: Exchange Apple token for Cognito tokens via backend
    let authResponse = try await apiService.exchangeAppleToken(
        identityToken: identityToken,
        authorizationCode: authCode,
        email: email,
        fullName: fullName.isEmpty ? nil : fullName
    )

    // Step 4: Store Cognito tokens locally (not in Amplify)
    nativeIdToken = authResponse.idToken
    nativeAccessToken = authResponse.accessToken
    authProvider = .apple
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

#### 2. AppleSignInDelegate — Async/Await Bridge

```swift
class AppleSignInDelegate: NSObject, ASAuthorizationControllerDelegate,
                           ASAuthorizationControllerPresentationContextProviding {

    private var continuation: CheckedContinuation<ASAuthorization, Error>?

    func performAppleSignIn(request: ASAuthorizationAppleIDRequest) async throws -> ASAuthorization {
        return try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation

            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }

    func authorizationController(controller: ASAuthorizationController,
                                 didCompleteWithAuthorization authorization: ASAuthorization) {
        continuation?.resume(returning: authorization)
        continuation = nil
    }

    func authorizationController(controller: ASAuthorizationController,
                                 didCompleteWithError error: Error) {
        continuation?.resume(throwing: error)
        continuation = nil
    }

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        // Return the key window
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first { $0.isKeyWindow } ?? UIWindow()
    }
}
```

#### 3. APIService.swift — Token Exchange

```swift
struct AppleAuthRequest: Encodable {
    let identityToken: String
    let authorizationCode: String
    let email: String?
    let fullName: String?

    enum CodingKeys: String, CodingKey {
        case identityToken = "identity_token"
        case authorizationCode = "authorization_code"
        case email
        case fullName = "full_name"
    }
}

func exchangeAppleToken(identityToken: String, authorizationCode: String,
                        email: String?, fullName: String?) async throws -> AuthTokenResponse {
    // POST /auth/apple with Apple identity token
    // Returns Cognito tokens: { id_token, access_token, refresh_token, expires_in }
}

func exchangeGoogleToken(idToken: String, email: String?, fullName: String?) async throws -> AuthTokenResponse {
    // POST /auth/google with Google ID token
    // Returns Cognito tokens: { id_token, access_token, refresh_token, expires_in }
}
```

#### 4. Token Retrieval (AuthManager.swift)

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

### Why Native SDK + Backend Exchange?

| Approach | Pros | Cons |
|----------|------|------|
| **Cognito Hosted UI** | Simple setup, Cognito handles everything | Opens browser, less native feel |
| **Native SDK + Backend** | Native UI, better UX, no browser redirects | Requires backend endpoint |

This project uses **native SDKs + backend token exchange** because:
1. **Better UX**: Native system sheets (Apple) and SDK UI (Google) feel more integrated
2. **Production standard**: Most scaled apps use this approach
3. **Full control**: Backend can add custom validation, rate limiting, logging
4. **No browser redirects**: Sign-in stays within the app

### Key Gotchas (iOS)

- **Apple email/name only on first sign-in**: Apple only sends `email` and `fullName` on the FIRST authorization. Store these immediately in your database. To re-trigger, user must: Settings → Apple ID → Password & Security → Apps Using Apple ID → Stop Using.
- **Apple requires Sign In with Apple capability**: Add in Xcode → Signing & Capabilities → + Capability → Sign In with Apple
- **Google Client ID type**: For native iOS Google Sign-In, create an **iOS** OAuth client ID in Google Cloud Console (different from the Web client ID used for Cognito hosted UI)
- **Token storage**: Native social users' tokens are stored in memory (`AuthManager.nativeIdToken`), not in Amplify's secure storage. Consider using Keychain for production.
- **Sign-out**: Must clear native tokens (`nativeIdToken = nil`) and optionally call `Amplify.Auth.signOut()` for email/password users
- **IAM permissions**: Backend needs `cognito-idp:AdminCreateUser`, `AdminGetUser`, `AdminSetUserPassword`, `AdminInitiateAuth` permissions

---

## Android Native Social Sign-In (Google & Apple)

The Android app uses:
- **Native Google Sign-In** via Credential Manager API + backend token exchange
- **Apple Sign-In** via Cognito Hosted UI (web-based)

### Google Sign-In Setup (Android)

#### 1. Google Cloud Console

**Create a Web OAuth Client** (NOT Android type):
1. Go to **Google Cloud Console → APIs & Credentials → Create Credentials → OAuth client ID**
2. Type: **Web application**
3. Save the **Client ID** — this is used in both the Android app and backend

> **Important**: You do NOT need an Android-type OAuth client for Credential Manager. The Web client ID is sufficient.

#### 2. Android Configuration

**gradle/libs.versions.toml** — Add dependencies:
```toml
[versions]
credentials = "1.5.0-rc01"
playServicesAuth = "21.3.0"

[libraries]
google-signin = { group = "com.google.android.gms", name = "play-services-auth", version.ref = "playServicesAuth" }
androidx-credentials = { group = "androidx.credentials", name = "credentials", version.ref = "credentials" }
androidx-credentials-play-services = { group = "androidx.credentials", name = "credentials-play-services-auth", version.ref = "credentials" }
google-id = { group = "com.google.android.libraries.identity.googleid", name = "googleid", version = "1.1.1" }
```

**app/build.gradle.kts** — Add implementations:
```kotlin
implementation(libs.google.signin)
implementation(libs.androidx.credentials)
implementation(libs.androidx.credentials.play.services)
implementation(libs.google.id)
```

**res/values/strings.xml** — Store the Web Client ID:
```xml
<string name="google_web_client_id">YOUR_WEB_CLIENT_ID.apps.googleusercontent.com</string>
```

#### 3. AuthViewModel Implementation

```kotlin
fun signInWithGoogle(context: Context, webClientId: String) {
    viewModelScope.launch {
        val credentialManager = CredentialManager.create(context)

        // Step 1: Request Google ID token using Credential Manager
        val googleIdOption = GetGoogleIdOption.Builder()
            .setFilterByAuthorizedAccounts(false)
            .setServerClientId(webClientId)  // Web Client ID, NOT Android
            .build()

        val request = GetCredentialRequest.Builder()
            .addCredentialOption(googleIdOption)
            .build()

        val result = credentialManager.getCredential(request = request, context = context)

        // Step 2: Extract Google ID token from credential
        val credential = result.credential as CustomCredential
        val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
        val googleIdToken = googleIdTokenCredential.idToken

        // Step 3: Exchange Google token for Cognito tokens via backend
        val authResponse = ApiClient.apiService.exchangeGoogleToken(
            GoogleAuthRequest(
                idToken = googleIdToken,
                email = googleIdTokenCredential.id,
                fullName = googleIdTokenCredential.displayName
            )
        )

        // Step 4: Store Cognito tokens locally
        nativeIdToken = authResponse.idToken
        nativeAccessToken = authResponse.accessToken
        authProvider = AuthProviderType.GOOGLE
    }
}
```

#### 4. API Service (Retrofit)

```kotlin
interface ApiService {
    @POST("auth/google")
    suspend fun exchangeGoogleToken(@Body request: GoogleAuthRequest): AuthTokenResponse
}

data class GoogleAuthRequest(
    @SerializedName("id_token") val idToken: String,
    val email: String?,
    @SerializedName("full_name") val fullName: String?
)

data class AuthTokenResponse(
    @SerializedName("id_token") val idToken: String,
    @SerializedName("access_token") val accessToken: String,
    @SerializedName("refresh_token") val refreshToken: String?,
    @SerializedName("expires_in") val expiresIn: Int
)
```

### Apple Sign-In Setup (Android)

Android Apple Sign-In uses **Custom Chrome Tabs** with a **backend redirect** — the production-standard approach. Apple blocks embedded WebViews for security, so Custom Tabs provide a secure browser environment.

#### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ANDROID APPLE SIGN-IN FLOW (Production)                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐  1. Launch Custom Tab    ┌────────────────┐                    │
│  │ Android │ ───────────────────────> │  Apple Auth    │                    │
│  │   App   │                          │ (appleid.apple │                    │
│  │         │                          │   .com/auth)   │                    │
│  │         │                          └────────┬───────┘                    │
│  │         │                                   │                            │
│  │         │                     2. User signs in, Apple POSTs form_post    │
│  │         │                                   │                            │
│  │         │                                   ▼                            │
│  │         │                          ┌────────────────┐                    │
│  │         │                          │    Backend     │                    │
│  │         │                          │  /auth/apple/  │                    │
│  │         │                          │   callback     │                    │
│  │         │                          └────────┬───────┘                    │
│  │         │                                   │                            │
│  │         │  3. Redirect to awscognito://     │                            │
│  │         │     apple-callback?id_token=...   │                            │
│  │         │ <─────────────────────────────────┘                            │
│  │         │                                                                │
│  │         │  4. MainActivity handles deep link                             │
│  │         │     ├── Extracts id_token, code, email, name                   │
│  │         │     └── Calls AuthViewModel.handleAppleSignInCallback()        │
│  │         │                                                                │
│  │         │  5. POST /auth/apple           ┌─────────────┐                 │
│  │         │     {id_token, code, email}    │   Backend   │                 │
│  │         │ ──────────────────────────────>│             │                 │
│  │         │                                │ Verify with │                 │
│  │         │                                │ Apple JWKS  │                 │
│  │         │                                │      ▼      │                 │
│  │         │                                │  ┌───────┐  │                 │
│  │         │                                │  │Cognito│  │                 │
│  │         │                                │  │ User  │  │                 │
│  │         │                                │  │ Pool  │  │                 │
│  │         │                                │  └───────┘  │                 │
│  │         │  6. Return Cognito tokens      │      │      │                 │
│  │         │ <──────────────────────────────│──────┘      │                 │
│  └─────────┘                                └─────────────┘                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 1. Apple Developer Console

**Create a Services ID** for the backend callback:

1. Go to **Certificates, Identifiers & Profiles → Identifiers**
2. Click **+** → Select **Services IDs** → Continue
3. Identifier: `com.yourcompany.services.yourapp`
4. Enable **Sign In with Apple** → Configure
5. **Domains**: `your-backend.ngrok.dev` (or production domain)
6. **Return URLs**: `https://your-backend.ngrok.dev/auth/apple/callback`

> **Important**: The redirect URI points to your **backend**, not the app. The backend then redirects to your app via custom URL scheme.

#### 2. Dependencies (gradle/libs.versions.toml)

```toml
[versions]
browser = "1.8.0"

[libraries]
androidx-browser = { group = "androidx.browser", name = "browser", version.ref = "browser" }
```

**app/build.gradle.kts**:
```kotlin
implementation(libs.androidx.browser)
```

#### 3. Configuration (res/values/strings.xml)

```xml
<!-- Apple Sign-In -->
<string name="apple_client_id">com.yourcompany.services.yourapp</string>
<string name="apple_redirect_uri">https://your-backend.ngrok.dev/auth/apple/callback</string>
```

#### 4. AppleSignInActivity — Launch Custom Tab

```kotlin
class AppleSignInActivity : ComponentActivity() {

    companion object {
        const val EXTRA_CLIENT_ID = "client_id"
        const val EXTRA_REDIRECT_URI = "redirect_uri"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val clientId = intent.getStringExtra(EXTRA_CLIENT_ID)
        val redirectUri = intent.getStringExtra(EXTRA_REDIRECT_URI)

        if (clientId == null || redirectUri == null) {
            finish()
            return
        }

        // Build Apple Sign In URL with form_post response mode
        val authUrl = buildString {
            append("https://appleid.apple.com/auth/authorize")
            append("?client_id=").append(Uri.encode(clientId))
            append("&redirect_uri=").append(Uri.encode(redirectUri))
            append("&response_type=code%20id_token")
            append("&scope=name%20email")
            append("&response_mode=form_post")  // Apple POSTs to backend
        }

        // Open in Custom Chrome Tab (NOT WebView — Apple blocks WebViews)
        val customTabsIntent = CustomTabsIntent.Builder()
            .setShowTitle(true)
            .build()

        customTabsIntent.launchUrl(this, Uri.parse(authUrl))

        // Finish immediately - callback goes to MainActivity via deep link
        finish()
    }
}
```

#### 5. AndroidManifest.xml

```xml
<!-- AppleSignInActivity - no intent-filter, just launches Custom Tab -->
<activity
    android:name=".features.login.AppleSignInActivity"
    android:exported="false"
    android:theme="@style/Theme.AWSCognito" />

<!-- MainActivity - handles ALL deep links -->
<activity
    android:name=".MainActivity"
    android:exported="true"
    android:launchMode="singleTask">
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="awscognito" />
    </intent-filter>
</activity>
```

> **Critical**: Only MainActivity should have the `awscognito://` intent-filter. Having multiple activities with the same scheme causes an app chooser loop.

#### 6. MainActivity — Handle Apple Callback Deep Link

```kotlin
class MainActivity : ComponentActivity() {

    private var authViewModelRef: AuthViewModel? = null

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleDeepLink(intent)
    }

    private fun handleDeepLink(intent: Intent) {
        val uri = intent.data ?: return

        if (uri.scheme == "awscognito") {
            when (uri.host) {
                "apple-callback" -> {
                    // Handle Apple Sign-In callback from backend redirect
                    val error = uri.getQueryParameter("error")
                    val idToken = uri.getQueryParameter("id_token")
                    val code = uri.getQueryParameter("code")
                    val email = uri.getQueryParameter("email")
                    val name = uri.getQueryParameter("name")

                    authViewModelRef?.handleAppleSignInCallback(
                        idToken = idToken,
                        code = code,
                        email = email,
                        name = name,
                        error = error
                    )
                }
                else -> {
                    // Handle other OAuth redirects (Cognito hosted UI)
                    Amplify.Auth.handleWebUISignInResponse(intent)
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Handle deep link if app was launched fresh from callback
        intent?.let {
            if (it.data?.scheme == "awscognito") {
                // Delay handling until authViewModelRef is set
                window.decorView.post { handleDeepLink(it) }
            }
        }
        // ... setContent with authViewModel initialization
    }
}
```

#### 7. AuthViewModel — Token Exchange

```kotlin
fun signInWithApple(activity: Activity, clientId: String, redirectUri: String) {
    _authState.value = _authState.value.copy(isLoading = true, error = null)

    // Launch AppleSignInActivity (opens Custom Tab)
    val intent = Intent(activity, AppleSignInActivity::class.java).apply {
        putExtra(AppleSignInActivity.EXTRA_CLIENT_ID, clientId)
        putExtra(AppleSignInActivity.EXTRA_REDIRECT_URI, redirectUri)
    }
    activity.startActivity(intent)
}

fun handleAppleSignInCallback(
    idToken: String?,
    code: String?,
    email: String?,
    name: String?,
    error: String?
) {
    viewModelScope.launch {
        if (error != null) {
            _authState.value = AuthState(error = "Apple sign-in error: $error")
            return@launch
        }

        if (idToken == null || code == null) {
            _authState.value = AuthState(error = "Missing Apple credentials")
            return@launch
        }

        try {
            // Exchange Apple token for Cognito tokens via backend
            val authResponse = ApiClient.apiService.exchangeAppleToken(
                AppleAuthRequest(
                    identityToken = idToken,
                    authorizationCode = code,
                    email = email,
                    fullName = name
                )
            )

            // Store Cognito tokens locally
            nativeIdToken = authResponse.idToken
            nativeAccessToken = authResponse.accessToken
            authProvider = AuthProviderType.APPLE

            _authState.value = AuthState(
                isAuthenticated = true,
                username = email,
                email = email
            )
        } catch (e: Exception) {
            _authState.value = AuthState(error = "Apple sign-in failed: ${e.message}")
        }
    }
}
```

#### 8. API Service (Retrofit)

```kotlin
interface ApiService {
    @POST("auth/apple")
    suspend fun exchangeAppleToken(@Body request: AppleAuthRequest): AuthTokenResponse
}

data class AppleAuthRequest(
    @SerializedName("identity_token") val identityToken: String,
    @SerializedName("authorization_code") val authorizationCode: String,
    val email: String?,
    @SerializedName("full_name") val fullName: String?
)
```

---

## FastAPI Backend Auth Endpoints

The backend handles token exchange for native social sign-in flows. All endpoints verify provider tokens using JWKS, create/get Cognito users, and return Cognito tokens.

### POST /auth/google — Google Token Exchange

Exchanges a Google ID token (from native SDK) for Cognito tokens.

**Request:**
```json
{
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "email": "user@example.com",
  "full_name": "John Doe"
}
```

**Response:**
```json
{
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600
}
```

### POST /auth/apple — Apple Token Exchange

Exchanges an Apple identity token for Cognito tokens.

**Request:**
```json
{
  "identity_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "authorization_code": "c1234567890abcdef...",
  "email": "user@example.com",
  "full_name": "John Doe"
}
```

**Response:** Same as Google.

### POST /auth/apple/callback — Apple OAuth Callback (Android)

This endpoint receives Apple's `form_post` OAuth response and redirects to the mobile app via custom URL scheme. This is the **production-standard pattern** for Android OAuth with providers that require POST callbacks.

**Why this endpoint exists:**
- Apple uses `response_mode=form_post` for security (token in POST body, not URL fragment)
- Mobile apps can't directly receive POST requests
- Solution: Backend receives POST, then redirects to app via `awscognito://apple-callback?id_token=...`

**Request (form data from Apple):**
```
code=authorization_code_here
id_token=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
user={"name":{"firstName":"John","lastName":"Doe"},"email":"user@example.com"}
```

**Response:** HTML page with meta refresh + JavaScript redirect to:
```
awscognito://apple-callback?id_token=...&code=...&email=...&name=...
```

**Implementation (server/app/routers/auth.py):**

```python
@router.post("/apple/callback", response_class=HTMLResponse)
async def apple_callback(
    code: str = Form(None),
    id_token: str = Form(None),
    state: str = Form(None),
    user: str = Form(None),      # JSON string with email/name (first sign-in only)
    error: str = Form(None),
):
    """
    OAuth callback for Apple Sign-In (form_post response mode).

    Flow:
    1. Mobile app opens Apple auth in browser/Custom Tab
    2. Apple POSTs authorization response to this endpoint
    3. This endpoint redirects to app's custom URL scheme with tokens
    4. App receives tokens and completes sign-in
    """
    # Build redirect URL to mobile app
    app_scheme = "awscognito"
    app_path = "apple-callback"

    params = {}
    if error:
        params["error"] = error
    else:
        if id_token:
            params["id_token"] = id_token
        if code:
            params["code"] = code
        if user:
            # Parse user JSON to extract email and name
            try:
                user_data = json.loads(user)
                if "email" in user_data:
                    params["email"] = user_data["email"]
                if "name" in user_data:
                    name_parts = []
                    if user_data["name"].get("firstName"):
                        name_parts.append(user_data["name"]["firstName"])
                    if user_data["name"].get("lastName"):
                        name_parts.append(user_data["name"]["lastName"])
                    if name_parts:
                        params["name"] = " ".join(name_parts)
            except (json.JSONDecodeError, KeyError, TypeError):
                pass

    redirect_url = f"{app_scheme}://{app_path}?{urlencode(params)}"

    # Return HTML that redirects to the app
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta http-equiv="refresh" content="0;url={redirect_url}">
        <title>Redirecting...</title>
        <script>window.location.href = "{redirect_url}";</script>
    </head>
    <body>
        <p>Redirecting to app...</p>
        <p>If not redirected, <a href="{redirect_url}">click here</a>.</p>
    </body>
    </html>
    """

    return HTMLResponse(content=html_content)
```

### Token Verification (JWKS)

Both `/auth/google` and `/auth/apple` verify tokens using the provider's public keys:

```python
@lru_cache(maxsize=1)
def get_google_jwks() -> dict:
    """Fetch and cache Google's JWKS."""
    response = httpx.get("https://www.googleapis.com/oauth2/v3/certs")
    return response.json()

@lru_cache(maxsize=1)
def get_apple_jwks() -> dict:
    """Fetch and cache Apple's JWKS."""
    response = httpx.get("https://appleid.apple.com/auth/keys")
    return response.json()

def verify_google_token(id_token_str: str) -> dict:
    """Verify Google ID token signature and claims."""
    unverified_header = jwt.get_unverified_header(id_token_str)
    kid = unverified_header.get("kid")

    # Find matching key in JWKS
    jwks = get_google_jwks()
    key = next((k for k in jwks["keys"] if k["kid"] == kid), None)

    if not key:
        # Clear cache and retry (key rotation)
        get_google_jwks.cache_clear()
        # ... retry logic

    # Verify and decode
    claims = jwt.decode(
        id_token_str,
        jwk.construct(key).to_pem().decode("utf-8"),
        algorithms=["RS256"],
        audience=google_client_id,  # Verify audience matches your client ID
    )

    return claims
```

### Cognito User Management

```python
def admin_get_or_create_user(cognito_client, user_pool_id, provider_sub, email, full_name):
    """Get existing user or create new one linked to social provider."""

    # Use email as username (Cognito User Pool configured with email as username)
    username = email  # NOT apple_sub or google_sub — Cognito requires email

    try:
        cognito_client.admin_get_user(UserPoolId=user_pool_id, Username=username)
        return username
    except cognito_client.exceptions.UserNotFoundException:
        pass

    # Create new user with verified email
    cognito_client.admin_create_user(
        UserPoolId=user_pool_id,
        Username=username,
        UserAttributes=[
            {"Name": "email", "Value": email},
            {"Name": "email_verified", "Value": "true"},
            {"Name": "name", "Value": full_name} if full_name else None,
        ],
        MessageAction="SUPPRESS",  # Don't send welcome email
    )

    # Set random password (social users don't use passwords)
    temp_password = "Aa1!" + secrets.token_urlsafe(24)  # Meets Cognito policy
    cognito_client.admin_set_user_password(
        UserPoolId=user_pool_id,
        Username=username,
        Password=temp_password,
        Permanent=True,
    )

    return username
```

### Cognito Token Generation

```python
def admin_initiate_auth(cognito_client, user_pool_id, client_id, username):
    """Generate Cognito tokens using ADMIN_USER_PASSWORD_AUTH."""

    # Set a temporary password for this auth
    temp_password = "Aa1!" + secrets.token_urlsafe(24)
    cognito_client.admin_set_user_password(
        UserPoolId=user_pool_id,
        Username=username,
        Password=temp_password,
        Permanent=True,
    )

    # Authenticate with the temporary password
    response = cognito_client.admin_initiate_auth(
        UserPoolId=user_pool_id,
        ClientId=client_id,
        AuthFlow="ADMIN_USER_PASSWORD_AUTH",  # Requires app client setting
        AuthParameters={
            "USERNAME": username,
            "PASSWORD": temp_password,
        },
    )

    auth_result = response.get("AuthenticationResult", {})
    return {
        "id_token": auth_result.get("IdToken"),
        "access_token": auth_result.get("AccessToken"),
        "refresh_token": auth_result.get("RefreshToken"),
        "expires_in": auth_result.get("ExpiresIn", 3600),
    }
```

---

### Backend Configuration for Android

#### Server Environment Variables (.env)

```bash
# Google Sign-In — comma-separated list for multiple platforms (iOS, Android/Web)
GOOGLE_CLIENT_ID=ios-client-id.apps.googleusercontent.com,web-client-id.apps.googleusercontent.com

# AWS credentials for Cognito admin operations
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1

# Cognito
COGNITO_USER_POOL_ID=us-east-1_XXXXXX
COGNITO_CLIENT_ID=your-app-client-id
```

> **Multiple Google Client IDs**: The backend accepts multiple client IDs (comma-separated) to support tokens from different platforms. Each platform may send tokens with a different audience.

#### IAM Permissions Required

The AWS credentials need these Cognito permissions:
```json
{
  "Effect": "Allow",
  "Action": [
    "cognito-idp:AdminGetUser",
    "cognito-idp:AdminCreateUser",
    "cognito-idp:AdminSetUserPassword",
    "cognito-idp:AdminInitiateAuth"
  ],
  "Resource": "arn:aws:cognito-idp:us-east-1:*:userpool/your-user-pool-id"
}
```

#### Cognito App Client Settings

1. **Enable `ALLOW_ADMIN_USER_PASSWORD_AUTH`** — Required for backend token generation
2. **Callback URLs**: Add `awscognito://callback`
3. **Sign-out URLs**: Add `awscognito://signout`
4. **Identity providers**: Enable Apple (for hosted UI flow)

### Key Gotchas (Android)

| Issue | Cause | Fix |
|-------|-------|-----|
| **"Invalid audience" error** | Backend `GOOGLE_CLIENT_ID` doesn't match Android app's Web Client ID | Use the same Web Client ID in both `strings.xml` and server `.env` |
| **"audience must be a string"** | python-jose doesn't accept list | Backend iterates through client IDs (already fixed in this codebase) |
| **Apple blank WebView** | Apple blocks embedded WebViews for security | Use Custom Chrome Tabs, NOT WebView |
| **App chooser loop after Apple sign-in** | Multiple activities with same URL scheme intent-filter | Only MainActivity should have `awscognito://` intent-filter |
| **Apple callback not received** | Backend redirect URL wrong | Ensure backend redirects to `awscognito://apple-callback?...` |
| **Apple email is null** | Apple only sends email on first sign-in | Store email in database on first sign-in; subsequent logins won't include it |
| **"Access Token does not have required scopes"** | Missing scope for `fetchUserAttributes()` | Add `aws.cognito.signin.user.admin` to Cognito scopes, or handle the error gracefully |
| **Password policy error** | Cognito requires special characters | Password generation includes `Aa1!` prefix to meet policy |

### Android vs iOS Comparison

| Aspect | Android | iOS |
|--------|---------|-----|
| **Google Sign-In** | Credential Manager API | GIDSignIn SDK |
| **Google Client ID** | Web Client ID | iOS Client ID |
| **Apple Sign-In** | Custom Chrome Tabs + Backend Redirect | ASAuthorizationController (native) |
| **Apple Callback** | Deep link from backend (`awscognito://apple-callback`) | Direct SDK response |
| **Token Storage** | In-memory (`nativeIdToken`) | In-memory (`nativeIdToken`) |

> **Why different Apple implementations?**
> - **iOS**: Apple's native `ASAuthorizationController` provides a system-level sign-in sheet — seamless and direct
> - **Android**: No native Apple SDK. Uses Custom Chrome Tabs → backend callback → deep link redirect. This is the production-standard approach for Android Apple Sign-In.

---

## Next.js Native Social Sign-In (Google & Apple)

The Next.js app uses native SDK popup flows for both Google and Apple sign-in, exchanging tokens with the backend for Cognito credentials.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS SOCIAL SIGN-IN FLOW                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐   1. Click button    ┌────────────────────┐                   │
│  │  Next.js │ ──────────────────>  │  Google/Apple SDK  │                   │
│  │   App    │                      │  (Popup Window)    │                   │
│  │          │   2. User signs in   │                    │                   │
│  │          │ <──────────────────  │  Returns id_token  │                   │
│  │          │                      └────────────────────┘                   │
│  │          │                                                               │
│  │          │   3. POST /auth/google or /auth/apple     ┌─────────────┐     │
│  │          │   {id_token, email, name}                 │   Backend   │     │
│  │          │ ─────────────────────────────────────────>│  (FastAPI)  │     │
│  │          │                                           │             │     │
│  │          │                            4. Verify      │      │      │     │
│  │          │                               token       │      ▼      │     │
│  │          │                                           │  ┌───────┐  │     │
│  │          │                                           │  │ JWKS  │  │     │
│  │          │                                           │  └───────┘  │     │
│  │          │                                           │      │      │     │
│  │          │                            5. Create/get  │      ▼      │     │
│  │          │                               user        │  ┌───────┐  │     │
│  │          │                                           │  │Cognito│  │     │
│  │          │                                           │  └───────┘  │     │
│  │          │                                           │      │      │     │
│  │          │   6. Return Cognito tokens                │      │      │     │
│  │          │ <─────────────────────────────────────────│──────┘      │     │
│  │          │                                           └─────────────┘     │
│  │          │   7. Store in localStorage                                    │
│  └──────────┘                                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Google Sign-In Setup (Next.js)

#### 1. Google Cloud Console

1. Go to **Google Cloud Console → APIs & Credentials → Create Credentials → OAuth client ID**
2. Type: **Web application**
3. Add **Authorized JavaScript origins**:
   - `http://localhost:3000` (development)
   - `https://yourdomain.com` (production)
4. Save the **Client ID**

> **Note**: No redirect URI needed — Google Identity Services uses popup mode.

#### 2. Environment Variables

**.env.local**:
```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
NEXT_PUBLIC_API_URL=http://localhost:6969
```

#### 3. GoogleSignInButton Component

**components/GoogleSignInButton.tsx** — Key implementation details:

```typescript
// 1. Load Google Identity Services script
useEffect(() => {
  const script = document.createElement("script");
  script.src = "https://accounts.google.com/gsi/client";
  script.async = true;
  script.onload = () => setScriptLoaded(true);
  document.body.appendChild(script);
}, []);

// 2. Initialize and render Google's branded button
useEffect(() => {
  window.google.accounts.id.initialize({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    callback: (response) => {
      // response.credential is the Google ID token (JWT)
      const payload = JSON.parse(atob(response.credential.split(".")[1]));
      onSuccess(response.credential, payload.email, payload.name);
    },
  });

  window.google.accounts.id.renderButton(buttonRef.current, {
    theme: "outline",
    size: "large",
    type: "standard",
    text: "continue_with",
  });
}, [scriptLoaded]);
```

#### 4. Token Exchange (auth-context.tsx)

```typescript
const handleSignInWithGoogleNative = async (idToken: string, email?: string, name?: string) => {
  // 1. Send Google token to backend
  const response = await fetch(`${apiUrl}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken, email, full_name: name }),
  });

  const tokens = await response.json();

  // 2. Store Cognito tokens in localStorage
  const nativeTokensData = {
    idToken: tokens.id_token,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + (tokens.expires_in * 1000),
  };
  localStorage.setItem("native_auth_tokens", JSON.stringify(nativeTokensData));

  // 3. Decode token to get user info
  const payload = JSON.parse(atob(tokens.id_token.split(".")[1]));
  setUser({ userId: payload.sub, signInDetails: { loginId: payload.email } });
  setAuthStatus("authenticated");
};
```

---

### Apple Sign-In Setup (Next.js)

Apple Sign-In requires HTTPS on a registered domain (localhost won't work). Use ngrok for local testing.

#### 1. Apple Developer Console

**Create a Services ID** (different from your App ID):

1. Go to **Certificates, Identifiers & Profiles → Identifiers**
2. Click **+** → Select **Services IDs** → Continue
3. Description: `My Web App`
4. Identifier: `com.example.services.myapp` (this is your **Client ID**)
5. Click **Continue** → **Register**

**Configure Sign In with Apple**:

1. Select the Services ID you just created
2. Check **Sign In with Apple** → Click **Configure**
3. **Primary App ID**: Select your main App ID
4. **Domains and Subdomains**: `yourdomain.com` (or ngrok subdomain)
5. **Return URLs**: `https://yourdomain.com` (just the origin, no path)
6. Click **Save** → **Continue** → **Save**

#### 2. Environment Variables

**.env.local**:
```bash
NEXT_PUBLIC_APPLE_CLIENT_ID=com.example.services.myapp
NEXT_PUBLIC_APPLE_REDIRECT_URI=https://yourdomain.com
NEXT_PUBLIC_API_URL=http://localhost:6969
```

#### 3. Backend Configuration

**server/.env**:
```bash
# The Services ID (same as NEXT_PUBLIC_APPLE_CLIENT_ID)
APPLE_BUNDLE_ID=com.example.services.myapp
```

#### 4. AppleSignInButton Component

**components/AppleSignInButton.tsx** — Key implementation details:

```typescript
// 1. Load Apple Sign In JS SDK
useEffect(() => {
  const script = document.createElement("script");
  script.src = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
  script.async = true;
  script.onload = () => setScriptLoaded(true);
  document.body.appendChild(script);
}, []);

// 2. Initialize Apple Sign In
useEffect(() => {
  window.AppleID.auth.init({
    clientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID,  // Services ID
    scope: "name email",
    redirectURI: process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI,  // Just the origin
    usePopup: true,  // Use popup instead of redirect
  });
}, [scriptLoaded]);

// 3. Handle sign-in click
const handleClick = async () => {
  const response = await window.AppleID.auth.signIn();

  const idToken = response.authorization.id_token;
  const code = response.authorization.code;
  const email = response.user?.email;  // Only on first sign-in!
  const name = response.user?.name
    ? `${response.user.name.firstName} ${response.user.name.lastName}`
    : undefined;

  onSuccess(idToken, code, email, name);
};
```

#### 5. Token Exchange (auth-context.tsx)

```typescript
const handleSignInWithAppleNative = async (
  idToken: string,
  code: string,
  email?: string,
  name?: string
) => {
  // 1. Send Apple token to backend
  const response = await fetch(`${apiUrl}/auth/apple`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identity_token: idToken,
      authorization_code: code,
      email,
      full_name: name,
    }),
  });

  const tokens = await response.json();

  // 2. Store Cognito tokens in localStorage
  localStorage.setItem("native_auth_tokens", JSON.stringify({
    idToken: tokens.id_token,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + (tokens.expires_in * 1000),
  }));

  // 3. Set authenticated state
  const payload = JSON.parse(atob(tokens.id_token.split(".")[1]));
  setUser({ userId: payload.sub, signInDetails: { loginId: payload.email } });
  setAuthStatus("authenticated");
};
```

---

### Local Development with ngrok

Since Apple requires HTTPS on a registered domain:

```bash
# Start ngrok tunnel with stable subdomain
ngrok http --hostname=myapp.ngrok.dev 3000
```

Then register in Apple Developer Console:
- **Domain**: `myapp.ngrok.dev`
- **Return URL**: `https://myapp.ngrok.dev`

Update **.env.local**:
```bash
NEXT_PUBLIC_APPLE_REDIRECT_URI=https://myapp.ngrok.dev
```

---

### Token Storage & Retrieval

Native social sign-in tokens are stored separately from Amplify:

```typescript
// Retrieve token for API calls
const handleGetIdToken = async (): Promise<string | null> => {
  // 1. Check native tokens first (Google/Apple via backend)
  const stored = localStorage.getItem("native_auth_tokens");
  if (stored) {
    const tokens = JSON.parse(stored);
    if (tokens.expiresAt > Date.now()) {
      return tokens.idToken;
    }
  }

  // 2. Fall back to Amplify (email/password, Cognito hosted UI)
  const session = await fetchAuthSession();
  return session.tokens?.idToken?.toString() || null;
};
```

---

### Key Gotchas (Next.js)

| Issue | Cause | Fix |
|-------|-------|-----|
| **Apple: `invalid_request`** | Redirect URI doesn't match Apple Developer Console | Ensure `NEXT_PUBLIC_APPLE_REDIRECT_URI` exactly matches the Return URL (just origin, no path) |
| **Apple: Email is undefined** | Apple only sends email on first sign-in | Store email in your database on first sign-in; subsequent logins won't include it. To re-trigger: Settings → Apple ID → Password & Security → Apps Using Apple ID → Stop Using |
| **Apple: Doesn't work on localhost** | Apple requires HTTPS on registered domain | Use ngrok with a stable subdomain |
| **Google: Popup blocked** | Browser popup blocker | Ensure sign-in is triggered by user click, not programmatically |
| **Backend: `InvalidParameterException`** | Cognito expects email as username | Backend must use email (not provider sub) as Cognito username |
| **Tokens not persisting** | localStorage cleared | Check browser settings; consider using cookies for SSR |

### Environment Variables Summary

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth Web Client ID | `123456.apps.googleusercontent.com` |
| `NEXT_PUBLIC_APPLE_CLIENT_ID` | Apple Services ID | `com.example.services.myapp` |
| `NEXT_PUBLIC_APPLE_REDIRECT_URI` | Apple return URL (origin only) | `https://myapp.ngrok.dev` |
| `NEXT_PUBLIC_API_URL` | Backend URL for token exchange | `http://localhost:6969` |
