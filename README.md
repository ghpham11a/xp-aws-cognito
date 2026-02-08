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
