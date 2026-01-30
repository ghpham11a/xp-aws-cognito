//
//  LoginView.swift
//  AWSCognito
//

import SwiftUI

struct LoginView: View {
    @Bindable var viewModel: AuthViewModel

    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var confirmationCode = ""
    @State private var isSignUpMode = false

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 8) {
                    Image(systemName: "person.circle.fill")
                        .font(.system(size: 80))
                        .foregroundColor(.blue)

                    Text(viewModel.needsConfirmation ? "Confirm Your Email" :
                            (isSignUpMode ? "Create Account" : "Welcome Back"))
                        .font(.title)
                        .fontWeight(.bold)
                }
                .padding(.top, 40)

                if viewModel.needsConfirmation {
                    confirmationForm
                } else if isSignUpMode {
                    signUpForm
                } else {
                    signInForm
                }

                // Error message
                if let error = viewModel.authError {
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
            TextField("Email", text: $email)
                .textFieldStyle(.roundedBorder)
                .textContentType(.emailAddress)
                .autocapitalization(.none)
                .keyboardType(.emailAddress)

            SecureField("Password", text: $password)
                .textFieldStyle(.roundedBorder)
                .textContentType(.password)

            Button(action: {
                Task {
                    await viewModel.signIn(email: email, password: password)
                }
            }) {
                if viewModel.isLoading {
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
            .disabled(viewModel.isLoading || email.isEmpty || password.isEmpty)

            Button("Don't have an account? Sign Up") {
                isSignUpMode = true
                clearFields()
            }
            .foregroundColor(.blue)
        }
    }

    private var signUpForm: some View {
        VStack(spacing: 16) {
            TextField("Email", text: $email)
                .textFieldStyle(.roundedBorder)
                .textContentType(.emailAddress)
                .autocapitalization(.none)
                .keyboardType(.emailAddress)

            SecureField("Password", text: $password)
                .textFieldStyle(.roundedBorder)
                .textContentType(.newPassword)

            SecureField("Confirm Password", text: $confirmPassword)
                .textFieldStyle(.roundedBorder)
                .textContentType(.newPassword)

            if !confirmPassword.isEmpty && password != confirmPassword {
                Text("Passwords do not match")
                    .foregroundColor(.red)
                    .font(.caption)
            }

            if !password.isEmpty && password.count < 8 {
                Text("Password must be at least 8 characters")
                    .foregroundColor(.orange)
                    .font(.caption)
            }

            Button(action: {
                Task {
                    await viewModel.signUp(email: email, password: password)
                }
            }) {
                if viewModel.isLoading {
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
            .disabled(viewModel.isLoading || !isSignUpValid)

            Button("Already have an account? Sign In") {
                isSignUpMode = false
                clearFields()
            }
            .foregroundColor(.blue)
        }
    }

    private var confirmationForm: some View {
        VStack(spacing: 16) {
            Text("We sent a confirmation code to \(viewModel.confirmationEmail ?? "your email")")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)

            TextField("Confirmation Code", text: $confirmationCode)
                .textFieldStyle(.roundedBorder)
                .keyboardType(.numberPad)
                .multilineTextAlignment(.center)

            Button(action: {
                Task {
                    await viewModel.confirmSignUp(code: confirmationCode)
                }
            }) {
                if viewModel.isLoading {
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
            .disabled(viewModel.isLoading || confirmationCode.isEmpty)
        }
    }

    private var isSignUpValid: Bool {
        !email.isEmpty &&
        !password.isEmpty &&
        password.count >= 8 &&
        password == confirmPassword
    }

    private func clearFields() {
        email = ""
        password = ""
        confirmPassword = ""
        confirmationCode = ""
        viewModel.authError = nil
    }
}

#Preview {
    LoginView(viewModel: AuthViewModel())
}
