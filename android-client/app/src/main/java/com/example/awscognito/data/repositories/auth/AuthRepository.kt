package com.example.awscognito.data.repositories.auth

import android.util.Log
import com.amplifyframework.auth.AuthUserAttributeKey
import com.amplifyframework.auth.options.AuthSignUpOptions
import com.amplifyframework.core.Amplify
import com.example.awscognito.core.auth.AuthProviderType
import com.example.awscognito.core.auth.AuthTokenProvider
import com.example.awscognito.data.model.AppleAuthRequest
import com.example.awscognito.data.model.AuthTokenResponse
import com.example.awscognito.data.model.GoogleAuthRequest
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlin.coroutines.suspendCoroutine

/**
 * Repository for authentication operations.
 * Handles Cognito auth, social sign-in token exchange, and session management.
 */
@Singleton
class AuthRepository @Inject constructor(
    private val authEndpoints: AuthEndpoints,
    private val authTokenProvider: AuthTokenProvider
) {
    /**
     * Sign in with email and password.
     */
    suspend fun signIn(email: String, password: String): Result<AuthResult> {
        return try {
            val result = suspendCoroutine { continuation ->
                Amplify.Auth.signIn(
                    email,
                    password,
                    { continuation.resume(it) },
                    { continuation.resumeWithException(it) }
                )
            }

            if (result.isSignedIn) {
                val userInfo = fetchUserAttributes()
                Result.success(AuthResult.Success(userInfo.email, userInfo.userId))
            } else {
                Result.success(AuthResult.IncompleteSignIn)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Sign in error", e)
            Result.failure(e)
        }
    }

    /**
     * Sign up with email and password.
     */
    suspend fun signUp(email: String, password: String): Result<SignUpResult> {
        return try {
            val options = AuthSignUpOptions.builder()
                .userAttribute(AuthUserAttributeKey.email(), email)
                .build()

            val result = suspendCoroutine { continuation ->
                Amplify.Auth.signUp(
                    email,
                    password,
                    options,
                    { continuation.resume(it) },
                    { continuation.resumeWithException(it) }
                )
            }

            if (result.isSignUpComplete) {
                Result.success(SignUpResult.Complete)
            } else {
                Result.success(SignUpResult.NeedsConfirmation(email))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Sign up error", e)
            Result.failure(e)
        }
    }

    /**
     * Confirm sign up with verification code.
     */
    suspend fun confirmSignUp(email: String, code: String): Result<Unit> {
        return try {
            suspendCoroutine { continuation ->
                Amplify.Auth.confirmSignUp(
                    email,
                    code,
                    { continuation.resume(it) },
                    { continuation.resumeWithException(it) }
                )
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "Confirm sign up error", e)
            Result.failure(e)
        }
    }

    /**
     * Sign out the current user.
     */
    suspend fun signOut(): Result<Unit> {
        return try {
            val provider = authTokenProvider.getAuthProvider()

            // Sign out from Amplify for Cognito and Apple users
            if (provider == AuthProviderType.COGNITO || provider == AuthProviderType.APPLE) {
                suspendCoroutine { continuation ->
                    Amplify.Auth.signOut { continuation.resume(it) }
                }
            }

            // Clear native tokens
            authTokenProvider.clearNativeTokens()

            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "Sign out error", e)
            Result.failure(e)
        }
    }

    /**
     * Change password for the current user.
     */
    suspend fun changePassword(oldPassword: String, newPassword: String): Result<Unit> {
        return try {
            suspendCoroutine { continuation ->
                Amplify.Auth.updatePassword(
                    oldPassword,
                    newPassword,
                    { continuation.resume(Unit) },
                    { continuation.resumeWithException(it) }
                )
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "Change password error", e)
            Result.failure(e)
        }
    }

    /**
     * Check current authentication status.
     */
    suspend fun checkAuthStatus(): AuthStatus {
        // Check native tokens first
        if (authTokenProvider.isAuthenticated()) {
            val userInfo = try {
                fetchUserAttributes()
            } catch (e: Exception) {
                UserInfo(null, null)
            }
            return AuthStatus.Authenticated(userInfo.email, userInfo.userId)
        }

        return AuthStatus.NotAuthenticated
    }

    /**
     * Exchange Google ID token for Cognito tokens.
     */
    suspend fun exchangeGoogleToken(
        idToken: String,
        email: String?,
        displayName: String?
    ): Result<AuthTokenResponse> {
        return try {
            val response = authEndpoints.exchangeGoogleToken(
                GoogleAuthRequest(
                    idToken = idToken,
                    email = email,
                    fullName = displayName
                )
            )

            // Store the tokens
            authTokenProvider.setNativeTokens(
                response.idToken,
                response.accessToken,
                AuthProviderType.GOOGLE
            )

            Result.success(response)
        } catch (e: Exception) {
            Log.e(TAG, "Google token exchange error", e)
            Result.failure(e)
        }
    }

    /**
     * Exchange Apple tokens for Cognito tokens.
     */
    suspend fun exchangeAppleToken(
        identityToken: String,
        authorizationCode: String,
        email: String?,
        fullName: String?
    ): Result<AuthTokenResponse> {
        return try {
            val response = authEndpoints.exchangeAppleToken(
                AppleAuthRequest(
                    identityToken = identityToken,
                    authorizationCode = authorizationCode,
                    email = email,
                    fullName = fullName
                )
            )

            // Store the tokens
            authTokenProvider.setNativeTokens(
                response.idToken,
                response.accessToken,
                AuthProviderType.APPLE
            )

            Result.success(response)
        } catch (e: Exception) {
            Log.e(TAG, "Apple token exchange error", e)
            Result.failure(e)
        }
    }

    private suspend fun fetchUserAttributes(): UserInfo {
        return try {
            val attributes = suspendCoroutine { continuation ->
                Amplify.Auth.fetchUserAttributes(
                    { continuation.resume(it) },
                    { continuation.resumeWithException(it) }
                )
            }

            val email = attributes.find { it.key == AuthUserAttributeKey.email() }?.value
            val userId = attributes.find { it.key.keyString == "sub" }?.value

            UserInfo(email, userId)
        } catch (e: Exception) {
            Log.w(TAG, "Could not fetch user attributes", e)
            UserInfo(null, null)
        }
    }

    companion object {
        private const val TAG = "AuthRepository"
    }
}

// Result types
sealed class AuthResult {
    data class Success(val email: String?, val userId: String?) : AuthResult()
    data object IncompleteSignIn : AuthResult()
}

sealed class SignUpResult {
    data object Complete : SignUpResult()
    data class NeedsConfirmation(val email: String) : SignUpResult()
}

sealed class AuthStatus {
    data class Authenticated(val email: String?, val userId: String?) : AuthStatus()
    data object NotAuthenticated : AuthStatus()
}

data class UserInfo(val email: String?, val userId: String?)
