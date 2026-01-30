//
//  AccountView.swift
//  AWSCognito
//

import SwiftUI

struct AccountView: View {
    var viewModel: AuthViewModel

    @State private var currentPassword = ""
    @State private var newPassword = ""
    @State private var confirmNewPassword = ""
    @State private var showSignOutAlert = false

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Profile Card
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Image(systemName: "person.circle.fill")
                            .font(.title)
                            .foregroundColor(.blue)
                        Text("Profile")
                            .font(.title2)
                            .fontWeight(.bold)
                    }

                    if let email = viewModel.email {
                        InfoRow(label: "Email", value: email)
                    }
                    if let userId = viewModel.userId {
                        InfoRow(label: "User ID", value: userId)
                    }
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(.systemBackground))
                .cornerRadius(12)
                .shadow(color: .black.opacity(0.1), radius: 5, x: 0, y: 2)

                // Change Password Card
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        Image(systemName: "lock.rotation")
                            .foregroundColor(.blue)
                        Text("Change Password")
                            .font(.headline)
                    }

                    SecureField("Current Password", text: $currentPassword)
                        .textFieldStyle(.roundedBorder)

                    SecureField("New Password", text: $newPassword)
                        .textFieldStyle(.roundedBorder)

                    SecureField("Confirm New Password", text: $confirmNewPassword)
                        .textFieldStyle(.roundedBorder)

                    if !confirmNewPassword.isEmpty && newPassword != confirmNewPassword {
                        Text("Passwords do not match")
                            .foregroundColor(.red)
                            .font(.caption)
                    }

                    if !newPassword.isEmpty && newPassword.count < 8 {
                        Text("Password must be at least 8 characters")
                            .foregroundColor(.orange)
                            .font(.caption)
                    }

                    if viewModel.passwordChangeSuccess {
                        Text("Password changed successfully!")
                            .foregroundColor(.green)
                            .font(.caption)
                    }

                    if let error = viewModel.passwordChangeError {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.caption)
                    }

                    Button(action: {
                        Task {
                            await viewModel.changePassword(
                                currentPassword: currentPassword,
                                newPassword: newPassword
                            )
                            if viewModel.passwordChangeSuccess {
                                clearPasswordFields()
                            }
                        }
                    }) {
                        if viewModel.isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Text("Update Password")
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(isPasswordChangeValid ? Color.blue : Color.gray)
                    .foregroundColor(.white)
                    .cornerRadius(10)
                    .disabled(!isPasswordChangeValid || viewModel.isLoading)
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(.systemBackground))
                .cornerRadius(12)
                .shadow(color: .black.opacity(0.1), radius: 5, x: 0, y: 2)

                // Sign Out Card
                VStack(spacing: 12) {
                    HStack {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                            .foregroundColor(.red)
                        Text("Sign Out")
                            .font(.headline)
                        Spacer()
                    }

                    Text("Sign out of your account on this device.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    Button(action: {
                        showSignOutAlert = true
                    }) {
                        Text("Sign Out")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.red)
                            .foregroundColor(.white)
                            .cornerRadius(10)
                    }
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(.systemBackground))
                .cornerRadius(12)
                .shadow(color: .black.opacity(0.1), radius: 5, x: 0, y: 2)
            }
            .padding()
        }
        .background(Color(.systemGroupedBackground))
        .alert("Sign Out", isPresented: $showSignOutAlert) {
            Button("Cancel", role: .cancel) {}
            Button("Sign Out", role: .destructive) {
                Task {
                    await viewModel.signOut()
                }
            }
        } message: {
            Text("Are you sure you want to sign out?")
        }
    }

    private var isPasswordChangeValid: Bool {
        !currentPassword.isEmpty &&
        !newPassword.isEmpty &&
        newPassword.count >= 8 &&
        newPassword == confirmNewPassword
    }

    private func clearPasswordFields() {
        currentPassword = ""
        newPassword = ""
        confirmNewPassword = ""
    }
}

#Preview {
    AccountView(viewModel: AuthViewModel())
}
