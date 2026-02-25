package com.example.awscognito.core.auth

import android.util.Log
import com.amplifyframework.auth.cognito.AWSCognitoAuthSession
import com.amplifyframework.core.Amplify
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlin.coroutines.suspendCoroutine

/**
 * Implementation of AuthTokenProvider that handles both Amplify sessions
 * and native social sign-in tokens.
 *
 * Includes JWT token expiration validation to proactively detect expired tokens
 * before making API calls.
 */
@Singleton
class AuthTokenProviderImpl @Inject constructor() : AuthTokenProvider {

    // Native social sign-in tokens (from Google/Apple via backend token exchange)
    private var nativeIdToken: String? = null
    private var nativeAccessToken: String? = null
    private var authProvider: AuthProviderType = AuthProviderType.COGNITO

    override suspend fun getIdToken(validateExpiration: Boolean): String? {
        // Check native token first
        nativeIdToken?.let { token ->
            if (validateExpiration && JwtUtils.isTokenExpired(token)) {
                Log.w(TAG, "Native ID token is expired")
                return null
            }
            return token
        }

        // Fall back to Amplify session
        return try {
            val token = suspendCoroutine { continuation ->
                Amplify.Auth.fetchAuthSession(
                    { session ->
                        val cognitoSession = session as? AWSCognitoAuthSession
                        val idToken = cognitoSession?.userPoolTokensResult?.value?.idToken
                        continuation.resume(idToken)
                    },
                    { continuation.resumeWithException(it) }
                )
            }

            // Validate expiration if requested
            if (validateExpiration && JwtUtils.isTokenExpired(token)) {
                Log.w(TAG, "Amplify ID token is expired")
                return null
            }

            token
        } catch (e: Exception) {
            Log.e(TAG, "Error getting ID token", e)
            null
        }
    }

    override suspend fun getAccessToken(validateExpiration: Boolean): String? {
        // Check native token first
        nativeAccessToken?.let { token ->
            if (validateExpiration && JwtUtils.isTokenExpired(token)) {
                Log.w(TAG, "Native access token is expired")
                return null
            }
            return token
        }

        // Fall back to Amplify session
        return try {
            val token = suspendCoroutine { continuation ->
                Amplify.Auth.fetchAuthSession(
                    { session ->
                        val cognitoSession = session as? AWSCognitoAuthSession
                        val accessToken = cognitoSession?.userPoolTokensResult?.value?.accessToken
                        continuation.resume(accessToken)
                    },
                    { continuation.resumeWithException(it) }
                )
            }

            // Validate expiration if requested
            if (validateExpiration && JwtUtils.isTokenExpired(token)) {
                Log.w(TAG, "Amplify access token is expired")
                return null
            }

            token
        } catch (e: Exception) {
            Log.e(TAG, "Error getting access token", e)
            null
        }
    }

    override suspend fun isAuthenticated(): Boolean {
        // Check native tokens first (with expiration validation)
        nativeIdToken?.let { token ->
            if (!JwtUtils.isTokenExpired(token)) {
                return true
            }
            // Token is expired, clear it
            Log.d(TAG, "Native token expired, clearing")
            clearNativeTokens()
        }

        // Check Amplify session
        return try {
            suspendCoroutine { continuation ->
                Amplify.Auth.fetchAuthSession(
                    { session ->
                        if (!session.isSignedIn) {
                            continuation.resume(false)
                            return@fetchAuthSession
                        }

                        // Also verify token isn't expired
                        val cognitoSession = session as? AWSCognitoAuthSession
                        val idToken = cognitoSession?.userPoolTokensResult?.value?.idToken
                        val isValid = idToken != null && !JwtUtils.isTokenExpired(idToken)
                        continuation.resume(isValid)
                    },
                    { continuation.resume(false) }
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking auth status", e)
            false
        }
    }

    override fun isTokenExpired(): Boolean {
        // Check native token first
        nativeIdToken?.let { token ->
            return JwtUtils.isTokenExpired(token)
        }

        // For Amplify tokens, we can't check synchronously
        // Return false and let the async methods handle it
        return false
    }

    override fun setNativeTokens(idToken: String, accessToken: String, provider: AuthProviderType) {
        // Validate tokens before storing
        if (JwtUtils.isTokenExpired(idToken)) {
            Log.w(TAG, "Attempted to store expired ID token")
        }

        this.nativeIdToken = idToken
        this.nativeAccessToken = accessToken
        this.authProvider = provider

        // Log token expiration info for debugging
        JwtUtils.getSecondsUntilExpiration(idToken)?.let { seconds ->
            Log.d(TAG, "Stored native token, expires in ${seconds / 60} minutes")
        }
    }

    override fun clearNativeTokens() {
        nativeIdToken = null
        nativeAccessToken = null
        authProvider = AuthProviderType.COGNITO
    }

    override fun getAuthProvider(): AuthProviderType = authProvider

    companion object {
        private const val TAG = "AuthTokenProvider"
    }
}
