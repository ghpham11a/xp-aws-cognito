package com.example.awscognito.features.account

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.awscognito.data.repositories.auth.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AccountUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val passwordChangeSuccess: Boolean = false,
    val signOutSuccess: Boolean = false
)

@HiltViewModel
class AccountViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(AccountUiState())
    val uiState: StateFlow<AccountUiState> = _uiState.asStateFlow()

    fun changePassword(oldPassword: String, newPassword: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isLoading = true,
                error = null,
                passwordChangeSuccess = false
            )

            authRepository.changePassword(oldPassword, newPassword)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        passwordChangeSuccess = true
                    )
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = e.message ?: "Password change failed"
                    )
                }
        }
    }

    fun signOut() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            authRepository.signOut()
                .onSuccess {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        signOutSuccess = true
                    )
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = e.message ?: "Sign out failed"
                    )
                }
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }

    fun clearPasswordSuccess() {
        _uiState.value = _uiState.value.copy(passwordChangeSuccess = false)
    }
}
