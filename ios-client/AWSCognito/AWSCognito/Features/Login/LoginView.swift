//
//  LoginView.swift
//  AWSCognito
//

import SwiftUI
import AuthenticationServices

struct LoginView: View {
    
    @Environment(AuthManager.self) private var authManager
    @Environment(\.dismiss) private var dismiss
    
    @State private var viewModel = ViewModel()

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                
                HStack {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                    }
                    .keyboardShortcut(.cancelAction)
                    
                    Spacer()
                }
                .padding()
                .frame(maxWidth: .infinity)
                
                // Header
                VStack(spacing: 8) {

                    Text(authManager.needsConfirmation ? "Confirm Your Email" :
                            (viewModel.isSignUpMode ? "Create Account" : "Welcome Back"))
                        .font(.title)
                        .fontWeight(.bold)
                }
                .padding(.top, 40)

                if authManager.needsConfirmation {
                    confirmationForm
                } else if viewModel.isSignUpMode {
                    signUpForm
                } else {
                    signInForm
                }

                // Error message
                if let error = authManager.authError {
                    Text(error)
                        .foregroundColor(.red)
                        .font(.caption)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }
            }
            .padding()
        }
    }

    private var signInForm: some View {
        VStack(spacing: 16) {
            TextField("Email", text: $viewModel.email)
                .textFieldStyle(.roundedBorder)
                .textContentType(.emailAddress)
                .autocapitalization(.none)
                .keyboardType(.emailAddress)

            SecureField("Password", text: $viewModel.password)
                .textFieldStyle(.roundedBorder)
                .textContentType(.password)

            Button(action: {
                Task {
                    await authManager.signIn(email: viewModel.email, password: viewModel.password)
                }
            }) {
                if authManager.isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Text("Sign In")
                }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.blue)
            .foregroundColor(.white)
            .cornerRadius(10)
            .disabled(authManager.isLoading || viewModel.email.isEmpty || viewModel.password.isEmpty)

            Button("Don't have an account? Sign Up") {
                viewModel.isSignUpMode = true
                viewModel.clearFields()
                authManager.authError = nil
            }
            .foregroundColor(.blue)

            socialSignInButtons
        }
    }

    private var signUpForm: some View {
        VStack(spacing: 16) {
            TextField("Email", text: $viewModel.email)
                .textFieldStyle(.roundedBorder)
                .textContentType(.emailAddress)
                .autocapitalization(.none)
                .keyboardType(.emailAddress)

            SecureField("Password", text: $viewModel.password)
                .textFieldStyle(.roundedBorder)
                .textContentType(.newPassword)

            SecureField("Confirm Password", text: $viewModel.confirmPassword)
                .textFieldStyle(.roundedBorder)
                .textContentType(.newPassword)

            if !viewModel.confirmPassword.isEmpty && viewModel.password != viewModel.confirmPassword {
                Text("Passwords do not match")
                    .foregroundColor(.red)
                    .font(.caption)
            }

            if !viewModel.password.isEmpty && viewModel.password.count < 8 {
                Text("Password must be at least 8 characters")
                    .foregroundColor(.orange)
                    .font(.caption)
            }

            Button(action: {
                Task {
                    await authManager.signUp(email: viewModel.email, password: viewModel.password)
                }
            }) {
                if authManager.isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Text("Sign Up")
                }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.green)
            .foregroundColor(.white)
            .cornerRadius(10)
            .disabled(authManager.isLoading)

            Button("Already have an account? Sign In") {
                viewModel.isSignUpMode = false
                viewModel.clearFields()
            }
            .foregroundColor(.blue)

            socialSignInButtons
        }
    }

    private var socialSignInButtons: some View {
        VStack(spacing: 16) {
            // Divider with text
            HStack {
                Rectangle()
                    .frame(height: 1)
                    .foregroundColor(.secondary.opacity(0.3))
                Text("or continue with")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                Rectangle()
                    .frame(height: 1)
                    .foregroundColor(.secondary.opacity(0.3))
            }
            .padding(.top, 8)

            // Apple Sign In
            SignInWithAppleButton(
                viewModel.isSignUpMode ? .signUp : .signIn,
                onRequest: { request in
                    request.requestedScopes = [.email, .fullName]
                },
                onCompletion: { result in
                    Task {
                        await authManager.handleAppleSignIn(result: result)
                    }
                }
            )
            .signInWithAppleButtonStyle(.black)
            .frame(height: 50)
            .cornerRadius(10)

            // Google Sign In
            Button(action: {
                Task {
                    await authManager.signInWithGoogle()
                }
            }) {
                HStack(spacing: 8) {
                    Image(systemName: "g.circle.fill")
                        .font(.title2)
                    Text(viewModel.isSignUpMode ? "Sign up with Google" : "Sign in with Google")
                        .fontWeight(.medium)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color(.systemBackground))
                .foregroundColor(.primary)
                .cornerRadius(10)
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(Color.secondary.opacity(0.3), lineWidth: 1)
                )
            }
        }
    }

    private var confirmationForm: some View {
        VStack(spacing: 16) {
            Text("We sent a confirmation code to \(authManager.confirmationEmail ?? "your email")")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            TextField("Confirmation Code", text: $viewModel.confirmationCode)
                .textFieldStyle(.roundedBorder)
                .keyboardType(.numberPad)
                .multilineTextAlignment(.center)
            
            Button(action: {
                Task {
                    await authManager.confirmSignUp(code: viewModel.confirmationCode)
                }
            }) {
                if authManager.isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Text("Confirm")
                }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.blue)
            .foregroundColor(.white)
            .cornerRadius(10)
            .disabled(authManager.isLoading || viewModel.confirmationCode.isEmpty)
        }
    }
}

#Preview {
    LoginView()
}
