package com.example.awscognito.features.login

import android.net.Uri
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.browser.customtabs.CustomTabsIntent

/**
 * Apple Sign-In launcher using Custom Chrome Tabs.
 *
 * This activity simply launches the Custom Tab with Apple's auth URL.
 * The callback flow is:
 * 1. This activity opens Apple auth in Chrome Custom Tab
 * 2. User signs in with Apple
 * 3. Apple POSTs to backend /auth/apple/callback
 * 4. Backend redirects to awscognito://apple-callback?id_token=...&code=...
 * 5. MainActivity catches the deep link (has intent-filter for awscognito://)
 * 6. MainActivity calls AuthViewModel.handleAppleSignInCallback()
 *
 * This activity finishes immediately after launching the Custom Tab.
 */
class AppleSignInActivity : ComponentActivity() {

    companion object {
        const val EXTRA_CLIENT_ID = "client_id"
        const val EXTRA_REDIRECT_URI = "redirect_uri"
        const val RESULT_ID_TOKEN = "id_token"
        const val RESULT_AUTH_CODE = "authorization_code"
        const val RESULT_EMAIL = "email"
        const val RESULT_NAME = "name"
        const val RESULT_ERROR = "error"
        private const val TAG = "AppleSignInActivity"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val clientId = intent.getStringExtra(EXTRA_CLIENT_ID)
        val redirectUri = intent.getStringExtra(EXTRA_REDIRECT_URI)

        if (clientId == null || redirectUri == null) {
            Log.e(TAG, "Missing client_id or redirect_uri")
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
            append("&response_mode=form_post")
        }

        Log.d(TAG, "Opening Apple auth URL in Custom Tab")

        // Open in Custom Chrome Tab
        val customTabsIntent = CustomTabsIntent.Builder()
            .setShowTitle(true)
            .build()

        customTabsIntent.launchUrl(this, Uri.parse(authUrl))

        // Finish this activity - the callback will go to MainActivity
        finish()
    }
}
