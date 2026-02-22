package com.example.awscognito

import android.content.Intent
import android.os.Bundle
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
import androidx.lifecycle.viewmodel.compose.viewModel
import com.amplifyframework.core.Amplify
import com.example.awscognito.shared.screens.MainScreen
import com.example.awscognito.shared.theme.AWSCognitoTheme
import com.example.awscognito.shared.viewmodel.AuthViewModel

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
                    android.util.Log.d("MainActivity", "Apple callback received: $uri")
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
        enableEdgeToEdge()

        // Handle OAuth redirect if app was launched fresh from callback
        intent?.let {
            if (it.data != null && it.data?.scheme == "awscognito") {
                // Delay handling until authViewModelRef is set
                val pendingIntent = it
                window.decorView.post {
                    handleDeepLink(pendingIntent)
                }
            }
        }
        setContent {
            AWSCognitoTheme {
                val authViewModel: AuthViewModel = viewModel()
                authViewModelRef = authViewModel

                val authState by authViewModel.authState.collectAsState()
                val dashboardState by authViewModel.dashboardState.collectAsState()

                // Get configuration from resources
                val googleWebClientId = getString(R.string.google_web_client_id)
                val appleClientId = getString(R.string.apple_client_id)
                val appleRedirectUri = getString(R.string.apple_redirect_uri)

                if (authState.isLoading && !authState.isAuthenticated && authState.error == null) {
                    // Show loading while checking initial auth status
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                } else {
                    MainScreen(
                        authState = authState,
                        dashboardState = dashboardState,
                        onSignIn = authViewModel::signIn,
                        onSignUp = authViewModel::signUp,
                        onConfirmSignUp = authViewModel::confirmSignUp,
                        onSignInWithGoogle = {
                            authViewModel.signInWithGoogle(this@MainActivity, googleWebClientId)
                        },
                        onSignInWithApple = {
                            authViewModel.signInWithApple(
                                activity = this@MainActivity,
                                clientId = appleClientId,
                                redirectUri = appleRedirectUri
                            )
                        },
                        onSignOut = authViewModel::signOut,
                        onChangePassword = authViewModel::changePassword,
                        onLoadDashboardData = authViewModel::loadDashboardData,
                        onClearError = authViewModel::clearError
                    )
                }
            }
        }
    }
}
