package com.example.awscognito.ui.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.amplifyframework.auth.AuthUserAttribute
import com.amplifyframework.auth.AuthUserAttributeKey
import com.amplifyframework.auth.options.AuthSignUpOptions
import com.amplifyframework.core.Amplify
import com.example.awscognito.data.api.ApiClient
import com.example.awscognito.data.model.FeedItem
import com.example.awscognito.data.model.User
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlin.coroutines.suspendCoroutine

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
    val isLoading: Boolean = false,
    val error: String? = null
)

class AuthViewModel : ViewModel() {
    private val _authState = MutableStateFlow(AuthState())
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    private val _dashboardState = MutableStateFlow(DashboardState())
    val dashboardState: StateFlow<DashboardState> = _dashboardState.asStateFlow()

    init {
        checkAuthStatus()
    }

    fun checkAuthStatus() {
        viewModelScope.launch {
            _authState.value = _authState.value.copy(isLoading = true)
            try {
                val session = suspendCoroutine { continuation ->
                    Amplify.Auth.fetchAuthSession(
                        { continuation.resume(it) },
                        { continuation.resumeWithException(it) }
                    )
                }

                if (session.isSignedIn) {
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
                suspendCoroutine { continuation ->
                    Amplify.Auth.signOut { continuation.resume(it) }
                }
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
                val feedItems = ApiClient.apiService.getFeed(bearerToken)

                _dashboardState.value = DashboardState(
                    user = user,
                    feedItems = feedItems,
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

    companion object {
        private const val TAG = "AuthViewModel"
    }
}
