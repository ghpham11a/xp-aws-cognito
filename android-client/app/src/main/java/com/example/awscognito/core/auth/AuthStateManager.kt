package com.example.awscognito.core.auth

import android.util.Log
import com.example.awscognito.core.networking.AuthEventListener
import com.example.awscognito.data.repositories.auth.AuthRepository
import com.example.awscognito.data.repositories.auth.AuthStatus
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Shared state representing the current authentication status.
 */
data class AuthState(
    val isAuthenticated: Boolean = false,
    val isLoading: Boolean = true,
    val userId: String? = null,
    val email: String? = null,
    val sessionExpired: Boolean = false
)

/**
 * Singleton manager for observing authentication state changes across the app.
 * This allows different screens/ViewModels to react to auth state changes.
 *
 * Implements AuthEventListener to handle 401 responses from the server.
 */
@Singleton
class AuthStateManager @Inject constructor(
    private val authRepository: AuthRepository
) : AuthEventListener {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    private val _authState = MutableStateFlow(AuthState())
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    init {
        checkAuthStatus()
    }

    /**
     * Check the current authentication status and update state.
     */
    fun checkAuthStatus() {
        scope.launch {
            _authState.value = _authState.value.copy(isLoading = true, sessionExpired = false)

            when (val status = authRepository.checkAuthStatus()) {
                is AuthStatus.Authenticated -> {
                    _authState.value = AuthState(
                        isAuthenticated = true,
                        isLoading = false,
                        email = status.email,
                        userId = status.userId
                    )
                }
                is AuthStatus.NotAuthenticated -> {
                    _authState.value = AuthState(
                        isAuthenticated = false,
                        isLoading = false
                    )
                }
            }
        }
    }

    /**
     * Update state when user signs in.
     */
    fun onSignedIn(email: String?, userId: String? = null) {
        _authState.value = AuthState(
            isAuthenticated = true,
            isLoading = false,
            email = email,
            userId = userId
        )
    }

    /**
     * Update state when user signs out.
     */
    fun onSignedOut() {
        scope.launch {
            // Clear tokens via repository
            authRepository.signOut()

            _authState.value = AuthState(
                isAuthenticated = false,
                isLoading = false
            )
        }
    }

    /**
     * Called when the server returns a 401 Unauthorized response.
     * This indicates the session has expired and the user needs to re-authenticate.
     */
    override fun onUnauthorized() {
        Log.w(TAG, "Session expired - received 401 from server")

        scope.launch {
            // Clear tokens
            authRepository.signOut()

            // Update state to show session expired
            _authState.value = AuthState(
                isAuthenticated = false,
                isLoading = false,
                sessionExpired = true
            )
        }
    }

    /**
     * Clear the session expired flag after the user has been notified.
     */
    fun clearSessionExpiredFlag() {
        _authState.value = _authState.value.copy(sessionExpired = false)
    }

    companion object {
        private const val TAG = "AuthStateManager"
    }
}
