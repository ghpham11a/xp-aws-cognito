package com.example.awscognito.shared.viewmodel

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.amplifyframework.auth.AuthUserAttributeKey
import com.amplifyframework.auth.options.AuthSignUpOptions
import com.amplifyframework.core.Amplify
import com.example.awscognito.data.model.AppleAuthRequest
import com.example.awscognito.data.model.GoogleAuthRequest
import com.example.awscognito.data.networking.ApiClient
import com.example.awscognito.data.model.FeedItem
import com.example.awscognito.data.model.User
import com.example.awscognito.features.login.AppleSignInActivity.Companion.EXTRA_CLIENT_ID
import com.example.awscognito.features.login.AppleSignInActivity.Companion.EXTRA_REDIRECT_URI
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlin.coroutines.suspendCoroutine

enum class AuthProviderType {
    COGNITO,
    GOOGLE,
    APPLE
}

data class AuthState(
    val isAuthenticated: Boolean = false,
    val isLoading: Boolean = true,
    val userId: String? = null,
    val email: String? = null,
    val error: String? = null,
    val needsConfirmation: Boolean = false,
    val confirmationEmail: String? = null
)

data class DashboardState(
    val user: User? = null,
    val feedItems: List<FeedItem> = emptyList(),
    val privateMessage: String? = null,
    val isLoading: Boolean = false,
    val error: String? = null
)

class AuthViewModel : ViewModel() {
    private val _authState = MutableStateFlow(AuthState())
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    private val _dashboardState = MutableStateFlow(DashboardState())
    val dashboardState: StateFlow<DashboardState> = _dashboardState.asStateFlow()

    // Native social sign-in tokens (stored when using native Google flow)
    // These are Cognito tokens returned from backend after token exchange
    private var nativeIdToken: String? = null
    private var nativeAccessToken: String? = null
    private var authProvider: AuthProviderType = AuthProviderType.COGNITO

    init {
        checkAuthStatus()
    }

    fun checkAuthStatus() {
        viewModelScope.launch {
            _authState.value = _authState.value.copy(isLoading = true)

            // Check native token first (for native Google Sign-In)
            // Don't call Amplify methods for native auth - we manage our own tokens
            if (nativeIdToken != null && authProvider == AuthProviderType.GOOGLE) {
                _authState.value = _authState.value.copy(
                    isAuthenticated = true,
                    isLoading = false
                )
                return@launch
            }

            try {
                val session = suspendCoroutine { continuation ->
                    Amplify.Auth.fetchAuthSession(
                        { continuation.resume(it) },
                        { continuation.resumeWithException(it) }
                    )
                }

                if (session.isSignedIn) {
                    try {
                        val attributes = suspendCoroutine { continuation ->
                            Amplify.Auth.fetchUserAttributes(
                                { continuation.resume(it) },
                                { continuation.resumeWithException(it) }
                            )
                        }

                        val email = attributes.find { it.key == AuthUserAttributeKey.email() }?.value
                        val userId = attributes.find { it.key.keyString == "sub" }?.value

                        _authState.value = AuthState(
                            isAuthenticated = true,
                            isLoading = false,
                            userId = userId,
                            email = email
                        )
                    } catch (e: Exception) {
                        // Attributes fetch failed but session is valid
                        Log.w(TAG, "Could not fetch user attributes", e)
                        _authState.value = AuthState(
                            isAuthenticated = true,
                            isLoading = false
                        )
                    }
                } else {
                    _authState.value = AuthState(isAuthenticated = false, isLoading = false)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error checking auth status", e)
                _authState.value = AuthState(isAuthenticated = false, isLoading = false)
            }
        }
    }

    fun signUp(email: String, password: String) {
        viewModelScope.launch {
            _authState.value = _authState.value.copy(isLoading = true, error = null)
            try {
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
                    _authState.value = _authState.value.copy(
                        isLoading = false,
                        needsConfirmation = false
                    )
                    signIn(email, password)
                } else {
                    _authState.value = _authState.value.copy(
                        isLoading = false,
                        needsConfirmation = true,
                        confirmationEmail = email
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "Sign up error", e)
                _authState.value = _authState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Sign up failed"
                )
            }
        }
    }

    fun confirmSignUp(email: String, code: String, password: String) {
        viewModelScope.launch {
            _authState.value = _authState.value.copy(isLoading = true, error = null)
            try {
                suspendCoroutine { continuation ->
                    Amplify.Auth.confirmSignUp(
                        email,
                        code,
                        { continuation.resume(it) },
                        { continuation.resumeWithException(it) }
                    )
                }

                _authState.value = _authState.value.copy(
                    isLoading = false,
                    needsConfirmation = false
                )
                signIn(email, password)
            } catch (e: Exception) {
                Log.e(TAG, "Confirm sign up error", e)
                _authState.value = _authState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Confirmation failed"
                )
            }
        }
    }

    fun signIn(email: String, password: String) {
        viewModelScope.launch {
            _authState.value = _authState.value.copy(isLoading = true, error = null)
            try {
                val result = suspendCoroutine { continuation ->
                    Amplify.Auth.signIn(
                        email,
                        password,
                        { continuation.resume(it) },
                        { continuation.resumeWithException(it) }
                    )
                }

                if (result.isSignedIn) {
                    authProvider = AuthProviderType.COGNITO
                    checkAuthStatus()
                } else {
                    _authState.value = _authState.value.copy(
                        isLoading = false,
                        error = "Sign in incomplete"
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "Sign in error", e)
                _authState.value = _authState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Sign in failed"
                )
            }
        }
    }

    fun signOut() {
        viewModelScope.launch {
            _authState.value = _authState.value.copy(isLoading = true)
            try {
                // Sign out from Amplify (for email/password, web OAuth, and Apple hosted UI users)
                if (authProvider == AuthProviderType.COGNITO || authProvider == AuthProviderType.APPLE) {
                    suspendCoroutine { continuation ->
                        Amplify.Auth.signOut { continuation.resume(it) }
                    }
                }

                // Clear native tokens (for native Google Sign-In users)
                nativeIdToken = null
                nativeAccessToken = null
                authProvider = AuthProviderType.COGNITO

                _authState.value = AuthState(isAuthenticated = false, isLoading = false)
                _dashboardState.value = DashboardState()
            } catch (e: Exception) {
                Log.e(TAG, "Sign out error", e)
                _authState.value = _authState.value.copy(isLoading = false)
            }
        }
    }

    fun changePassword(oldPassword: String, newPassword: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _authState.value = _authState.value.copy(isLoading = true, error = null)
            try {
                suspendCoroutine { continuation ->
                    Amplify.Auth.updatePassword(
                        oldPassword,
                        newPassword,
                        { continuation.resume(Unit) },
                        { continuation.resumeWithException(it) }
                    )
                }
                _authState.value = _authState.value.copy(isLoading = false)
                onSuccess()
            } catch (e: Exception) {
                Log.e(TAG, "Change password error", e)
                _authState.value = _authState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Password change failed"
                )
            }
        }
    }

    fun loadDashboardData() {
        viewModelScope.launch {
            _dashboardState.value = _dashboardState.value.copy(isLoading = true, error = null)
            try {
                val token = getIdToken()
                if (token == null) {
                    _dashboardState.value = _dashboardState.value.copy(
                        isLoading = false,
                        error = "Not authenticated"
                    )
                    return@launch
                }

                val bearerToken = "Bearer $token"
                val user = ApiClient.apiService.getCurrentUser(bearerToken)
                val privateMessage = ApiClient.apiService.getPrivateMessage(bearerToken)

                // Note: /feed endpoint not implemented on server
                _dashboardState.value = DashboardState(
                    user = user,
                    feedItems = emptyList(),
                    privateMessage = privateMessage.message,
                    isLoading = false
                )
            } catch (e: Exception) {
                Log.e(TAG, "Load dashboard error", e)
                _dashboardState.value = _dashboardState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load data"
                )
            }
        }
    }

    private suspend fun getIdToken(): String? {
        // Return native token if available (from native Google Sign-In)
        if (nativeIdToken != null) {
            return nativeIdToken
        }

        // Fall back to Amplify session (for email/password and web OAuth)
        return try {
            suspendCoroutine { continuation ->
                Amplify.Auth.fetchAuthSession(
                    { session ->
                        val cognitoSession = session as? com.amplifyframework.auth.cognito.AWSCognitoAuthSession
                        val token = cognitoSession?.userPoolTokensResult?.value?.idToken
                        continuation.resume(token)
                    },
                    { continuation.resumeWithException(it) }
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting ID token", e)
            null
        }
    }

    fun clearError() {
        _authState.value = _authState.value.copy(error = null)
    }

    // MARK: - Social Sign In

    /**
     * Native Google Sign-In using Credential Manager API.
     * Exchanges Google ID token for Cognito tokens via backend.
     */
    fun signInWithGoogle(context: Context, webClientId: String) {
        viewModelScope.launch {
            _authState.value = _authState.value.copy(isLoading = true, error = null)
            try {
                val credentialManager = CredentialManager.create(context)

                val googleIdOption = GetGoogleIdOption.Builder()
                    .setFilterByAuthorizedAccounts(false)
                    .setServerClientId(webClientId)
                    .build()

                val request = GetCredentialRequest.Builder()
                    .addCredentialOption(googleIdOption)
                    .build()

                val result = credentialManager.getCredential(
                    request = request,
                    context = context
                )

                handleGoogleSignInResult(result)

            } catch (e: androidx.credentials.exceptions.GetCredentialCancellationException) {
                // User cancelled - don't show error
                Log.d(TAG, "Google sign in cancelled by user")
                _authState.value = _authState.value.copy(isLoading = false)
            } catch (e: Exception) {
                Log.e(TAG, "Google sign in error", e)
                _authState.value = _authState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Google sign in failed"
                )
            }
        }
    }

    private suspend fun handleGoogleSignInResult(result: GetCredentialResponse) {
        val credential = result.credential

        when (credential) {
            is CustomCredential -> {
                if (credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                    try {
                        val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
                        val googleIdToken = googleIdTokenCredential.idToken
                        val email = googleIdTokenCredential.id
                        val displayName = googleIdTokenCredential.displayName

                        // Exchange Google token for Cognito tokens via backend
                        val authResponse = ApiClient.apiService.exchangeGoogleToken(
                            GoogleAuthRequest(
                                idToken = googleIdToken,
                                email = email,
                                fullName = displayName
                            )
                        )

                        // Store Cognito tokens and update state
                        nativeIdToken = authResponse.idToken
                        nativeAccessToken = authResponse.accessToken
                        authProvider = AuthProviderType.GOOGLE

                        _authState.value = AuthState(
                            isAuthenticated = true,
                            isLoading = false,
                            email = email,
                            userId = null // Will be fetched from /users/me if needed
                        )

                    } catch (e: GoogleIdTokenParsingException) {
                        Log.e(TAG, "Failed to parse Google ID token", e)
                        _authState.value = _authState.value.copy(
                            isLoading = false,
                            error = "Failed to parse Google credentials"
                        )
                    }
                } else {
                    Log.e(TAG, "Unexpected credential type: ${credential.type}")
                    _authState.value = _authState.value.copy(
                        isLoading = false,
                        error = "Unexpected credential type"
                    )
                }
            }
            else -> {
                Log.e(TAG, "Unexpected credential class: ${credential.javaClass}")
                _authState.value = _authState.value.copy(
                    isLoading = false,
                    error = "Unexpected credential type"
                )
            }
        }
    }

    /**
     * Native Apple Sign-In using Custom Chrome Tabs.
     * Launches AppleSignInActivity which opens Chrome Tab.
     * Callback comes via deep link to MainActivity.
     */
    fun signInWithApple(
        activity: Activity,
        clientId: String,
        redirectUri: String
    ) {
        _authState.value = _authState.value.copy(isLoading = true, error = null)

        val intent = Intent(activity, com.example.awscognito.features.login.AppleSignInActivity::class.java).apply {
            putExtra(EXTRA_CLIENT_ID, clientId)
            putExtra(EXTRA_REDIRECT_URI, redirectUri)
        }
        activity.startActivity(intent)
    }

    /**
     * Handle Apple Sign-In callback from deep link.
     * Called by MainActivity when awscognito://apple-callback is received.
     */
    fun handleAppleSignInCallback(
        idToken: String?,
        code: String?,
        email: String?,
        name: String?,
        error: String?
    ) {
        viewModelScope.launch {
            _authState.value = _authState.value.copy(isLoading = true, error = null)

            if (error != null) {
                Log.e(TAG, "Apple Sign-In callback error: $error")
                _authState.value = _authState.value.copy(
                    isLoading = false,
                    error = error
                )
                return@launch
            }

            if (idToken == null || code == null) {
                Log.e(TAG, "Apple Sign-In callback missing tokens")
                _authState.value = _authState.value.copy(
                    isLoading = false,
                    error = "Missing tokens in callback"
                )
                return@launch
            }

            try {
                Log.d(TAG, "Exchanging Apple token with backend")
                // Exchange Apple token for Cognito tokens via backend
                val authResponse = ApiClient.apiService.exchangeAppleToken(
                    AppleAuthRequest(
                        identityToken = idToken,
                        authorizationCode = code,
                        email = email?.takeIf { it.isNotEmpty() },
                        fullName = name?.takeIf { it.isNotEmpty() }
                    )
                )

                // Store Cognito tokens and update state
                nativeIdToken = authResponse.idToken
                nativeAccessToken = authResponse.accessToken
                authProvider = AuthProviderType.APPLE

                Log.d(TAG, "Apple Sign-In successful")
                _authState.value = AuthState(
                    isAuthenticated = true,
                    isLoading = false,
                    email = email,
                    userId = null
                )

            } catch (e: Exception) {
                Log.e(TAG, "Apple token exchange error", e)
                _authState.value = _authState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Apple sign in failed"
                )
            }
        }
    }

    companion object {
        private const val TAG = "AuthViewModel"
    }
}
