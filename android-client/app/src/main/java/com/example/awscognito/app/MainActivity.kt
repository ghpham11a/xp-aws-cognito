package com.example.awscognito.app

import android.content.Intent
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.lifecycleScope
import androidx.navigation.NavHostController
import androidx.navigation.compose.rememberNavController
import com.amplifyframework.core.Amplify
import com.example.awscognito.R
import com.example.awscognito.core.auth.AuthStateManager
import com.example.awscognito.core.navigation.AppNavigation
import com.example.awscognito.data.repositories.auth.AuthRepository
import com.example.awscognito.shared.theme.AWSCognitoTheme
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var authStateManager: AuthStateManager

    @Inject
    lateinit var authRepository: AuthRepository

    private var navControllerRef: NavHostController? = null

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
                    Log.d(TAG, "Apple callback received: $uri")
                    val error = uri.getQueryParameter("error")
                    val idToken = uri.getQueryParameter("id_token")
                    val code = uri.getQueryParameter("code")
                    val email = uri.getQueryParameter("email")
                    val name = uri.getQueryParameter("name")

                    handleAppleSignInCallback(idToken, code, email, name, error)
                }
                "home", "dashboard", "account", "login" -> {
                    // Handle navigation deep links via NavController
                    Log.d(TAG, "Navigation deep link received: $uri")
                    navControllerRef?.handleDeepLink(intent)
                }
                else -> {
                    // Handle other OAuth redirects (Cognito hosted UI)
                    Amplify.Auth.handleWebUISignInResponse(intent)
                }
            }
        }
    }

    private fun handleAppleSignInCallback(
        idToken: String?,
        code: String?,
        email: String?,
        name: String?,
        error: String?
    ) {
        lifecycleScope.launch {
            if (error != null) {
                Log.e(TAG, "Apple Sign-In callback error: $error")
                return@launch
            }

            if (idToken == null || code == null) {
                Log.e(TAG, "Apple Sign-In callback missing tokens")
                return@launch
            }

            authRepository.exchangeAppleToken(
                identityToken = idToken,
                authorizationCode = code,
                email = email?.takeIf { it.isNotEmpty() },
                fullName = name?.takeIf { it.isNotEmpty() }
            )
                .onSuccess {
                    Log.d(TAG, "Apple Sign-In successful")
                    authStateManager.onSignedIn(email)
                }
                .onFailure { e ->
                    Log.e(TAG, "Apple token exchange error", e)
                }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Handle OAuth redirect if app was launched fresh from callback
        intent?.let {
            if (it.data != null && it.data?.scheme == "awscognito") {
                val pendingIntent = it
                window.decorView.post {
                    handleDeepLink(pendingIntent)
                }
            }
        }

        setContent {
            AWSCognitoTheme {
                val navController = rememberNavController()
                navControllerRef = navController

                val authState by authStateManager.authState.collectAsState()

                // Get configuration from resources
                val googleWebClientId = getString(R.string.google_web_client_id)
                val appleClientId = getString(R.string.apple_client_id)
                val appleRedirectUri = getString(R.string.apple_redirect_uri)

                if (authState.isLoading) {
                    // Show loading while checking initial auth status
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                } else {
                    AppNavigation(
                        authStateManager = authStateManager,
                        googleWebClientId = googleWebClientId,
                        appleClientId = appleClientId,
                        appleRedirectUri = appleRedirectUri,
                        externalNavController = navController
                    )
                }
            }
        }
    }

    companion object {
        private const val TAG = "MainActivity"
    }
}
