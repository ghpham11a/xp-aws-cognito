package com.example.awscognito.core.auth

/**
 * Abstraction for retrieving authentication tokens.
 * Supports both Amplify-managed sessions and native social sign-in tokens.
 */
interface AuthTokenProvider {
    /**
     * Get the current ID token for API authorization.
     * Returns null if not authenticated or if token is expired.
     *
     * @param validateExpiration If true, returns null for expired tokens
     */
    suspend fun getIdToken(validateExpiration: Boolean = true): String?

    /**
     * Get the current access token.
     * Returns null if not authenticated or if token is expired.
     *
     * @param validateExpiration If true, returns null for expired tokens
     */
    suspend fun getAccessToken(validateExpiration: Boolean = true): String?

    /**
     * Check if the user is currently authenticated with a valid (non-expired) token.
     */
    suspend fun isAuthenticated(): Boolean

    /**
     * Check if the current token is expired.
     * Returns true if expired or no token exists.
     */
    fun isTokenExpired(): Boolean

    /**
     * Store tokens from native social sign-in (Google, Apple).
     */
    fun setNativeTokens(idToken: String, accessToken: String, provider: AuthProviderType)

    /**
     * Clear stored native tokens.
     */
    fun clearNativeTokens()

    /**
     * Get the current auth provider type.
     */
    fun getAuthProvider(): AuthProviderType
}

enum class AuthProviderType {
    COGNITO,
    GOOGLE,
    APPLE
}
