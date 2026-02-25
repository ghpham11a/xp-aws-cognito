package com.example.awscognito.core.navigation

import kotlinx.serialization.Serializable

/**
 * Type-safe navigation routes using Kotlin serialization.
 * Each route is a serializable object that can be used with Navigation Compose.
 */

// Graph routes (for nested navigation graphs)
@Serializable
data object HomeGraph

@Serializable
data object DashboardGraph

@Serializable
data object AccountGraph

// Screen routes
@Serializable
data object HomeRoute

@Serializable
data object DashboardRoute

@Serializable
data object AccountRoute

@Serializable
data object LoginRoute
