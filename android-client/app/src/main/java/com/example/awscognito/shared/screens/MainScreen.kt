package com.example.awscognito.shared.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.outlined.AccountCircle
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.awscognito.features.account.AccountScreen
import com.example.awscognito.features.dashboard.DashboardScreen
import com.example.awscognito.features.home.HomeScreen
import com.example.awscognito.features.login.LoginScreen
import com.example.awscognito.shared.viewmodel.AuthState
import com.example.awscognito.shared.viewmodel.DashboardState

enum class Tab(
    val title: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
) {
    HOME("Home", Icons.Filled.Home, Icons.Outlined.Home),
    DASHBOARD("Dashboard", Icons.Filled.Home, Icons.Outlined.Home),
    ACCOUNT("Account", Icons.Filled.AccountCircle, Icons.Outlined.AccountCircle)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    authState: AuthState,
    dashboardState: DashboardState,
    onSignIn: (String, String) -> Unit,
    onSignUp: (String, String) -> Unit,
    onConfirmSignUp: (String, String, String) -> Unit,
    onSignInWithGoogle: () -> Unit,
    onSignInWithApple: () -> Unit,
    onSignOut: () -> Unit,
    onChangePassword: (String, String, () -> Unit) -> Unit,
    onLoadDashboardData: () -> Unit,
    onClearError: () -> Unit
) {
    var selectedTab by remember { mutableStateOf(Tab.HOME) }
    var showLoginOverlay by remember { mutableStateOf(false) }

    // Reset login overlay when user becomes authenticated
    LaunchedEffect(authState.isAuthenticated) {
        if (authState.isAuthenticated) {
            showLoginOverlay = false
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "AWS Cognito Demo",
                        fontWeight = FontWeight.Bold
                    )
                },
                actions = {
                    if (authState.isAuthenticated) {
                        Surface(
                            color = MaterialTheme.colorScheme.primaryContainer,
                            shape = MaterialTheme.shapes.small
                        ) {
                            Text(
                                text = "Logged In",
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                    }
                }
            )
        },
        bottomBar = {
            NavigationBar {
                Tab.entries.forEach { tab ->
                    NavigationBarItem(
                        icon = {
                            Icon(
                                imageVector = if (selectedTab == tab) tab.selectedIcon else tab.unselectedIcon,
                                contentDescription = tab.title
                            )
                        },
                        label = { Text(tab.title) },
                        selected = selectedTab == tab,
                        onClick = { selectedTab = tab }
                    )
                }
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Always show the selected tab content
            when (selectedTab) {
                Tab.HOME -> HomeScreen()
                Tab.DASHBOARD -> DashboardScreen(
                    authState = authState,
                    dashboardState = dashboardState,
                    onLoadData = onLoadDashboardData,
                    onShowLogin = { showLoginOverlay = true }
                )
                Tab.ACCOUNT -> AccountScreen(
                    authState = authState,
                    onChangePassword = onChangePassword,
                    onSignOut = onSignOut,
                    onShowLogin = { showLoginOverlay = true }
                )
            }

            // Show login overlay on top when requested
            if (showLoginOverlay) {
                LoginScreen(
                    authState = authState,
                    onSignIn = onSignIn,
                    onSignUp = onSignUp,
                    onConfirmSignUp = onConfirmSignUp,
                    onSignInWithGoogle = onSignInWithGoogle,
                    onSignInWithApple = onSignInWithApple,
                    onClearError = onClearError,
                    onDismiss = { showLoginOverlay = false }
                )
            }
        }
    }
}
