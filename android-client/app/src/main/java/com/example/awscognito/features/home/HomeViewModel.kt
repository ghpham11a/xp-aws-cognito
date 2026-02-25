package com.example.awscognito.features.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.awscognito.data.repositories.messages.MessagesRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HomeUiState(
    val publicMessage: String? = null,
    val isLoading: Boolean = true,
    val error: String? = null
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val messagesRepository: MessagesRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadPublicMessage()
    }

    fun loadPublicMessage() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            messagesRepository.getPublicMessage()
                .onSuccess { response ->
                    _uiState.value = HomeUiState(
                        publicMessage = response.message,
                        isLoading = false
                    )
                }
                .onFailure { e ->
                    _uiState.value = HomeUiState(
                        isLoading = false,
                        error = e.message ?: "Failed to load message"
                    )
                }
        }
    }
}
