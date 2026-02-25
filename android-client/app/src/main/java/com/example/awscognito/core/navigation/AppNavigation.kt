package com.example.awscognito.core.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavDestination.Companion.hasRoute
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.navigation
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navDeepLink
import com.example.awscognito.core.auth.AuthStateManager
import com.example.awscognito.features.account.AccountScreen
import com.example.awscognito.features.dashboard.DashboardScreen
import com.example.awscognito.features.home.HomeScreen
import com.example.awscognito.features.login.LoginScreen

/**
 * Main navigation composable that sets up the NavHost with multi-back-stack support.
 * Uses Hilt-injected ViewModels in each screen for business logic.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppNavigation(
    authStateManager: AuthStateManager,
    googleWebClientId: String,
    appleClientId: String,
    appleRedirectUri: String,
    externalNavController: NavHostController? = null
) {
    val navController: NavHostController = externalNavController ?: rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination

    val authState by authStateManager.authState.collectAsState()

    // Determine if we're on a fullscreen destination (like login) where we hide bottom nav
    val isFullscreenDestination = currentDestination?.hasRoute<LoginRoute>() == true

    // Auto-dismiss login screen when user becomes authenticated
    LaunchedEffect(authState.isAuthenticated) {
        if (authState.isAuthenticated && currentDestination?.hasRoute<LoginRoute>() == true) {
            navController.popBackStack()
        }
    }

    Scaffold(
        topBar = {
            if (!isFullscreenDestination) {
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
            }
        },
        bottomBar = {
            if (!isFullscreenDestination) {
                NavigationBar {
                    Tab.entries.forEach { tab ->
                        val selected = currentDestination?.hierarchy?.any {
                            it.hasRoute(tab.routeClass)
                        } == true

                        NavigationBarItem(
                            icon = {
                                Icon(
                                    imageVector = if (selected) tab.selectedIcon else tab.unselectedIcon,
                                    contentDescription = tab.title
                                )
                            },
                            label = { Text(tab.title) },
                            selected = selected,
                            onClick = {
                                navController.navigate(tab.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }
                        )
                    }
                }
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            NavHost(
                navController = navController,
                startDestination = HomeGraph::class
            ) {
                // Home tab graph
                navigation<HomeGraph>(startDestination = HomeRoute::class) {
                    composable<HomeRoute>(
                        deepLinks = listOf(
                            navDeepLink<HomeRoute>(basePath = "awscognito://home")
                        )
                    ) {
                        HomeScreen()
                    }
                }

                // Dashboard tab graph
                navigation<DashboardGraph>(startDestination = DashboardRoute::class) {
                    composable<DashboardRoute>(
                        deepLinks = listOf(
                            navDeepLink<DashboardRoute>(basePath = "awscognito://dashboard")
                        )
                    ) {
                        DashboardScreen(
                            authState = authState,
                            onShowLogin = {
                                navController.navigate(LoginRoute)
                            }
                        )
                    }
                }

                // Account tab graph
                navigation<AccountGraph>(startDestination = AccountRoute::class) {
                    composable<AccountRoute>(
                        deepLinks = listOf(
                            navDeepLink<AccountRoute>(basePath = "awscognito://account")
                        )
                    ) {
                        AccountScreen(
                            authState = authState,
                            onShowLogin = {
                                navController.navigate(LoginRoute)
                            },
                            onSignedOut = {
                                authStateManager.onSignedOut()
                            }
                        )
                    }
                }

                // Login screen (fullscreen destination)
                composable<LoginRoute>(
                    deepLinks = listOf(
                        navDeepLink<LoginRoute>(basePath = "awscognito://login")
                    )
                ) {
                    LoginScreen(
                        googleWebClientId = googleWebClientId,
                        appleClientId = appleClientId,
                        appleRedirectUri = appleRedirectUri,
                        onAuthenticated = {
                            authStateManager.checkAuthStatus()
                            navController.popBackStack()
                        },
                        onDismiss = {
                            navController.popBackStack()
                        }
                    )
                }
            }
        }
    }
}
