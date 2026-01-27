package com.example.awscognito.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.awscognito.data.model.FeedItem
import com.example.awscognito.ui.viewmodel.AuthState
import com.example.awscognito.ui.viewmodel.DashboardState

@Composable
fun DashboardScreen(
    authState: AuthState,
    dashboardState: DashboardState,
    onLoadData: () -> Unit,
    onShowLogin: () -> Unit
) {
    if (!authState.isAuthenticated) {
        LaunchedEffect(Unit) {
            onShowLogin()
        }
        return
    }

    LaunchedEffect(authState.isAuthenticated) {
        if (authState.isAuthenticated) {
            onLoadData()
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Welcome card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Welcome!",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = authState.email ?: "User",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }
            }
        }

        // Account info card
        item {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Your Account Info",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    if (dashboardState.isLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp))
                    } else if (dashboardState.user != null) {
                        InfoRow(label = "User ID", value = dashboardState.user.userId)
                        InfoRow(label = "Email", value = dashboardState.user.email)
                        dashboardState.user.name?.let {
                            InfoRow(label = "Name", value = it)
                        }
                        InfoRow(label = "Created", value = dashboardState.user.createdAt)
                    }
                }
            }
        }

        // Feed section header
        item {
            Text(
                text = "Your Feed",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold
            )
        }

        // Error state
        if (dashboardState.error != null) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer
                    )
                ) {
                    Text(
                        text = dashboardState.error,
                        modifier = Modifier.padding(16.dp),
                        color = MaterialTheme.colorScheme.onErrorContainer
                    )
                }
            }
        }

        // Loading state
        if (dashboardState.isLoading) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
        }

        // Empty state
        if (!dashboardState.isLoading && dashboardState.feedItems.isEmpty() && dashboardState.error == null) {
            item {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Text(
                        text = "No feed items available",
                        modifier = Modifier.padding(16.dp),
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        // Feed items
        items(dashboardState.feedItems) { feedItem ->
            FeedItemCard(feedItem = feedItem)
        }
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium
        )
    }
}

@Composable
private fun FeedItemCard(feedItem: FeedItem) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = feedItem.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.weight(1f)
                )
                FeedTypeBadge(type = feedItem.type)
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = feedItem.content,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun FeedTypeBadge(type: String) {
    val (backgroundColor, textColor) = when (type) {
        FeedItem.TYPE_ANNOUNCEMENT -> Color(0xFF2196F3) to Color.White
        FeedItem.TYPE_UPDATE -> Color(0xFF4CAF50) to Color.White
        FeedItem.TYPE_REPORT -> Color(0xFFFFC107) to Color.Black
        else -> MaterialTheme.colorScheme.secondary to MaterialTheme.colorScheme.onSecondary
    }

    Surface(
        color = backgroundColor,
        shape = MaterialTheme.shapes.small
    ) {
        Text(
            text = type.replaceFirstChar { it.uppercase() },
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall,
            color = textColor
        )
    }
}
