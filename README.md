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

### Key Gotchas (iOS)

- **Google Client ID type**: For native iOS Google Sign-In, create an **iOS** OAuth client ID in Google Cloud Console (different from the Web client ID used for Cognito hosted UI)
- **Token storage**: Native Google users' tokens are stored in memory (`AuthManager.nativeIdToken`), not in Amplify's secure storage. Consider using Keychain for production.
- **Sign-out**: Must handle both `GIDSignIn.sharedInstance.signOut()` (Google) and `Amplify.Auth.signOut()` (Cognito/Apple) depending on auth provider
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

Apple Sign-In on Android uses Cognito's Hosted UI (web-based flow).

#### 1. Amplify Configuration

**res/raw/amplifyconfiguration.json**:
```json
{
  "auth": {
    "plugins": {
      "awsCognitoAuthPlugin": {
        "CognitoUserPool": {
          "Default": {
            "PoolId": "us-east-1_XXXXXX",
            "AppClientId": "your-app-client-id",
            "Region": "us-east-1"
          }
        },
        "Auth": {
          "Default": {
            "authenticationFlowType": "USER_SRP_AUTH",
            "socialProviders": ["APPLE", "GOOGLE"],
            "OAuth": {
              "WebDomain": "your-domain.auth.us-east-1.amazoncognito.com",
              "AppClientId": "your-app-client-id",
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

#### 2. AndroidManifest.xml

Register the deep link scheme for OAuth callbacks:
```xml
<activity
    android:name=".MainActivity"
    android:exported="true"
    android:launchMode="singleTask">
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="awscognito" />
    </intent-filter>
</activity>
```

#### 3. MainActivity — Handle OAuth Callback

```kotlin
class MainActivity : ComponentActivity() {

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // Handle OAuth redirect callback from Cognito Hosted UI
        if (intent.data?.scheme == "awscognito") {
            Amplify.Auth.handleWebUISignInResponse(intent)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Handle OAuth redirect if app was launched fresh from callback
        intent?.let {
            if (it.data?.scheme == "awscognito") {
                Amplify.Auth.handleWebUISignInResponse(it)
            }
        }
        // ... rest of onCreate
    }
}
```

#### 4. AuthViewModel — Apple Sign-In

```kotlin
fun signInWithApple(activity: Activity) {
    viewModelScope.launch {
        val result = suspendCoroutine { continuation ->
            Amplify.Auth.signInWithSocialWebUI(
                AuthProvider.apple(),
                activity,
                { continuation.resume(it) },
                { continuation.resumeWithException(it) }
            )
        }

        if (result.isSignedIn) {
            authProvider = AuthProviderType.APPLE
            checkAuthStatus()  // Fetch user attributes from Amplify session
        }
    }
}
```

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
| **Apple Sign-In stuck at loading** | OAuth callback not handled | Add `Amplify.Auth.handleWebUISignInResponse(intent)` in `onNewIntent` and `onCreate` |
| **"Access Token does not have required scopes"** | Missing scope for `fetchUserAttributes()` | Add `aws.cognito.signin.user.admin` to Cognito scopes, or handle the error gracefully |
| **Password policy error** | Cognito requires special characters | Password generation includes `Aa1!` prefix to meet policy |

### Android vs iOS Comparison

| Aspect | Android | iOS |
|--------|---------|-----|
| **Google Sign-In** | Credential Manager API | GIDSignIn SDK |
| **Google Client ID** | Web Client ID | iOS Client ID |
| **Apple Sign-In** | Cognito Hosted UI | Cognito Hosted UI (or native) |
| **OAuth Callback** | `Amplify.Auth.handleWebUISignInResponse()` | Automatic via URL scheme |
| **Token Storage** | In-memory (`nativeIdToken`) | In-memory (`nativeIdToken`) |
