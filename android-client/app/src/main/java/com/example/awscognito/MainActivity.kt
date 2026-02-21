package com.example.awscognito

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
import com.example.awscognito.shared.screens.MainScreen
import com.example.awscognito.shared.theme.AWSCognitoTheme
import com.example.awscognito.shared.viewmodel.AuthViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            AWSCognitoTheme {
                val authViewModel: AuthViewModel = viewModel()
                val authState by authViewModel.authState.collectAsState()
                val dashboardState by authViewModel.dashboardState.collectAsState()

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
                        onSignInWithGoogle = { authViewModel.signInWithGoogle(this@MainActivity) },
                        onSignInWithApple = { authViewModel.signInWithApple(this@MainActivity) },
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
