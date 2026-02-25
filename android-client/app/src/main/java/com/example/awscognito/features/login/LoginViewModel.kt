package com.example.awscognito.features.login

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
import com.example.awscognito.data.repositories.auth.AuthRepository
import com.example.awscognito.data.repositories.auth.AuthResult
import com.example.awscognito.data.repositories.auth.SignUpResult
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LoginUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val isAuthenticated: Boolean = false,
    val needsConfirmation: Boolean = false,
    val confirmationEmail: String? = null,
    val email: String? = null
)

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    fun signIn(email: String, password: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            authRepository.signIn(email, password)
                .onSuccess { result ->
                    when (result) {
                        is AuthResult.Success -> {
                            _uiState.value = _uiState.value.copy(
                                isLoading = false,
                                isAuthenticated = true,
                                email = result.email
                            )
                        }
                        is AuthResult.IncompleteSignIn -> {
                            _uiState.value = _uiState.value.copy(
                                isLoading = false,
                                error = "Sign in incomplete"
                            )
                        }
                    }
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = e.message ?: "Sign in failed"
                    )
                }
        }
    }

    fun signUp(email: String, password: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            authRepository.signUp(email, password)
                .onSuccess { result ->
                    when (result) {
                        is SignUpResult.Complete -> {
                            // Auto sign in after complete signup
                            signIn(email, password)
                        }
                        is SignUpResult.NeedsConfirmation -> {
                            _uiState.value = _uiState.value.copy(
                                isLoading = false,
                                needsConfirmation = true,
                                confirmationEmail = result.email
                            )
                        }
                    }
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = e.message ?: "Sign up failed"
                    )
                }
        }
    }

    fun confirmSignUp(email: String, code: String, password: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            authRepository.confirmSignUp(email, code)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        needsConfirmation = false
                    )
                    // Auto sign in after confirmation
                    signIn(email, password)
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = e.message ?: "Confirmation failed"
                    )
                }
        }
    }

    fun signInWithGoogle(context: Context, webClientId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

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
                Log.d(TAG, "Google sign in cancelled by user")
                _uiState.value = _uiState.value.copy(isLoading = false)
            } catch (e: Exception) {
                Log.e(TAG, "Google sign in error", e)
                _uiState.value = _uiState.value.copy(
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

                        authRepository.exchangeGoogleToken(googleIdToken, email, displayName)
                            .onSuccess {
                                _uiState.value = _uiState.value.copy(
                                    isLoading = false,
                                    isAuthenticated = true,
                                    email = email
                                )
                            }
                            .onFailure { e ->
                                _uiState.value = _uiState.value.copy(
                                    isLoading = false,
                                    error = e.message ?: "Google sign in failed"
                                )
                            }

                    } catch (e: GoogleIdTokenParsingException) {
                        Log.e(TAG, "Failed to parse Google ID token", e)
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            error = "Failed to parse Google credentials"
                        )
                    }
                } else {
                    Log.e(TAG, "Unexpected credential type: ${credential.type}")
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = "Unexpected credential type"
                    )
                }
            }
            else -> {
                Log.e(TAG, "Unexpected credential class: ${credential.javaClass}")
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = "Unexpected credential type"
                )
            }
        }
    }

    fun signInWithApple(activity: Activity, clientId: String, redirectUri: String) {
        _uiState.value = _uiState.value.copy(isLoading = true, error = null)

        val intent = Intent(activity, AppleSignInActivity::class.java).apply {
            putExtra(AppleSignInActivity.EXTRA_CLIENT_ID, clientId)
            putExtra(AppleSignInActivity.EXTRA_REDIRECT_URI, redirectUri)
        }
        activity.startActivity(intent)
    }

    fun handleAppleSignInCallback(
        idToken: String?,
        code: String?,
        email: String?,
        name: String?,
        error: String?
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            if (error != null) {
                Log.e(TAG, "Apple Sign-In callback error: $error")
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = error
                )
                return@launch
            }

            if (idToken == null || code == null) {
                Log.e(TAG, "Apple Sign-In callback missing tokens")
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = "Missing tokens in callback"
                )
                return@launch
            }

            authRepository.exchangeAppleToken(
                identityToken = idToken,
                authorizationCode = code,
                email = email?.takeIf { it.isNotEmpty() },
                fullName = name?.takeIf { it.isNotEmpty() }
            )
                .onSuccess {
                    Log.d(TAG, "Apple Sign-In successful")
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isAuthenticated = true,
                        email = email
                    )
                }
                .onFailure { e ->
                    Log.e(TAG, "Apple token exchange error", e)
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = e.message ?: "Apple sign in failed"
                    )
                }
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }

    companion object {
        private const val TAG = "LoginViewModel"
    }
}
