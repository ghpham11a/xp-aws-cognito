package com.example.awscognito.data.repositories.users

import com.example.awscognito.core.auth.AuthTokenProvider
import com.example.awscognito.data.model.User
import com.example.awscognito.data.repositories.messages.AuthenticationRequiredException
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for user-related API operations.
 */
@Singleton
class UsersRepository @Inject constructor(
    private val usersEndpoints: UsersEndpoints,
    private val authTokenProvider: AuthTokenProvider
) {
    /**
     * Get the current authenticated user's profile.
     * This also triggers just-in-time user provisioning on the backend.
     */
    suspend fun getCurrentUser(): Result<User> {
        return try {
            val token = authTokenProvider.getIdToken()
                ?: return Result.failure(
                    AuthenticationRequiredException(
                        message = "Session expired. Please sign in again.",
                        isExpired = true
                    )
                )

            val user = usersEndpoints.getCurrentUser("Bearer $token")
            Result.success(user)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
