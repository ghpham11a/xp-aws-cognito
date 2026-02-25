package com.example.awscognito.data.repositories.messages

import com.example.awscognito.core.auth.AuthTokenProvider
import com.example.awscognito.data.model.MessageResponse
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Exception thrown when authentication is required but the user is not authenticated
 * or the token has expired.
 */
class AuthenticationRequiredException(
    message: String = "Authentication required",
    val isExpired: Boolean = false
) : Exception(message)

/**
 * Repository for message-related API operations.
 */
@Singleton
class MessagesRepository @Inject constructor(
    private val messagesEndpoints: MessagesEndpoints,
    private val authTokenProvider: AuthTokenProvider
) {
    /**
     * Get the public message (no authentication required).
     */
    suspend fun getPublicMessage(): Result<MessageResponse> {
        return try {
            val response = messagesEndpoints.getPublicMessage()
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Get the private message (authentication required).
     */
    suspend fun getPrivateMessage(): Result<MessageResponse> {
        return try {
            val token = authTokenProvider.getIdToken()
                ?: return Result.failure(
                    AuthenticationRequiredException(
                        message = "Session expired. Please sign in again.",
                        isExpired = true
                    )
                )

            val response = messagesEndpoints.getPrivateMessage("Bearer $token")
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
