package com.example.awscognito.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.example.awscognito.ui.viewmodel.AuthState

@Composable
fun LoginScreen(
    authState: AuthState,
    onSignIn: (String, String) -> Unit,
    onSignUp: (String, String) -> Unit,
    onConfirmSignUp: (String, String, String) -> Unit,
    onClearError: () -> Unit
) {
    var isSignUp by remember { mutableStateOf(false) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var confirmationCode by remember { mutableStateOf("") }
    var localError by remember { mutableStateOf<String?>(null) }

    // Clear local error when switching modes
    LaunchedEffect(isSignUp) {
        localError = null
        onClearError()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(32.dp))

        Text(
            text = if (authState.needsConfirmation) "Confirm Email"
                   else if (isSignUp) "Create Account"
                   else "Sign In",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = if (authState.needsConfirmation) "Enter the code sent to your email"
                   else if (isSignUp) "Sign up to get started"
                   else "Welcome back",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(32.dp))

        // Show error if any
        val errorMessage = authState.error ?: localError
        if (errorMessage != null) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.errorContainer
                )
            ) {
                Text(
                    text = errorMessage,
                    modifier = Modifier.padding(16.dp),
                    color = MaterialTheme.colorScheme.onErrorContainer
                )
            }
            Spacer(modifier = Modifier.height(16.dp))
        }

        if (authState.needsConfirmation) {
            // Confirmation code form
            OutlinedTextField(
                value = confirmationCode,
                onValueChange = { confirmationCode = it },
                label = { Text("Confirmation Code") },
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Number,
                    imeAction = ImeAction.Done
                ),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = {
                    onConfirmSignUp(authState.confirmationEmail ?: email, confirmationCode, password)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                enabled = !authState.isLoading && confirmationCode.isNotBlank()
            ) {
                if (authState.isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text("Confirm")
                }
            }
        } else {
            // Email/Password form
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Email") },
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Email,
                    imeAction = ImeAction.Next
                ),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Password") },
                modifier = Modifier.fillMaxWidth(),
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Password,
                    imeAction = if (isSignUp) ImeAction.Next else ImeAction.Done
                ),
                singleLine = true
            )

            if (isSignUp) {
                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(
                    value = confirmPassword,
                    onValueChange = { confirmPassword = it },
                    label = { Text("Confirm Password") },
                    modifier = Modifier.fillMaxWidth(),
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Password,
                        imeAction = ImeAction.Done
                    ),
                    singleLine = true
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = {
                    localError = null
                    if (isSignUp) {
                        if (password != confirmPassword) {
                            localError = "Passwords do not match"
                            return@Button
                        }
                        if (password.length < 8) {
                            localError = "Password must be at least 8 characters"
                            return@Button
                        }
                        onSignUp(email, password)
                    } else {
                        onSignIn(email, password)
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                enabled = !authState.isLoading && email.isNotBlank() && password.isNotBlank()
            ) {
                if (authState.isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text(if (isSignUp) "Sign Up" else "Sign In")
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            TextButton(
                onClick = {
                    isSignUp = !isSignUp
                    localError = null
                    onClearError()
                }
            ) {
                Text(
                    if (isSignUp) "Already have an account? Sign In"
                    else "Don't have an account? Sign Up"
                )
            }
        }
    }
}
