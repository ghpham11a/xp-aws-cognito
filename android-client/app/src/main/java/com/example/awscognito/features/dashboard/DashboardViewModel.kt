package com.example.awscognito.features.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.awscognito.data.model.User
import com.example.awscognito.data.repositories.messages.MessagesRepository
import com.example.awscognito.data.repositories.users.UsersRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DashboardUiState(
    val user: User? = null,
    val privateMessage: String? = null,
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val messagesRepository: MessagesRepository,
    private val usersRepository: UsersRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    fun loadDashboardData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            // Load user and private message in parallel
            val userResult = usersRepository.getCurrentUser()
            val messageResult = messagesRepository.getPrivateMessage()

            val user = userResult.getOrNull()
            val message = messageResult.getOrNull()

            // Check for errors
            val error = when {
                userResult.isFailure -> userResult.exceptionOrNull()?.message
                messageResult.isFailure -> messageResult.exceptionOrNull()?.message
                else -> null
            }

            _uiState.value = DashboardUiState(
                user = user,
                privateMessage = message?.message,
                isLoading = false,
                error = error
            )
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
}
