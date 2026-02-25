//
//  AccountView.swift
//  AWSCognito
//

import SwiftUI

struct AccountView: View {
    
    @Environment(RouteManager.self) private var routeManager
    @Environment(AuthManager.self) private var authManager
    
    @State private var viewModel: AccountViewModel
    
    init(viewModel: AccountViewModel) {
        _viewModel = State(initialValue: viewModel)
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                
                if !authManager.isAuthenticated {
                    
                    LoginCard(onLoginTapped: {
                        authManager.presentLoginView()
                    }, greeting: {
                        
                    }, statement: {
                        Text("Sign in to start managing your account")
                    })
                    
                } else {
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
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
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
                        
                        SecureField("Current Password", text: $viewModel.currentPassword)
                            .textFieldStyle(.roundedBorder)
                        
                        SecureField("New Password", text: $viewModel.newPassword)
                            .textFieldStyle(.roundedBorder)
                        
                        SecureField("Confirm New Password", text: $viewModel.confirmNewPassword)
                            .textFieldStyle(.roundedBorder)
                        
                        if !viewModel.confirmNewPassword.isEmpty && viewModel.newPassword != viewModel.confirmNewPassword {
                            Text("Passwords do not match")
                                .foregroundColor(.red)
                                .font(.caption)
                        }
                        
                        if !viewModel.newPassword.isEmpty && viewModel.newPassword.count < 8 {
                            Text("Password must be at least 8 characters")
                                .foregroundColor(.orange)
                                .font(.caption)
                        }
                        
                        if authManager.passwordChangeSuccess {
                            Text("Password changed successfully!")
                                .foregroundColor(.green)
                                .font(.caption)
                        }
                        
                        if let error = authManager.passwordChangeError {
                            Text(error)
                                .foregroundColor(.red)
                                .font(.caption)
                        }
                        
                        Button(action: {
                            Task {
                                await authManager.changePassword(
                                    currentPassword: viewModel.currentPassword,
                                    newPassword: viewModel.newPassword
                                )
                                if authManager.passwordChangeSuccess {
                                    viewModel.clearPasswordFields()
                                }
                            }
                        }) {
                            if authManager.isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Text("Update Password")
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(viewModel.isPasswordChangeValid ? Color.blue : Color.gray)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                        .disabled(!viewModel.isPasswordChangeValid || authManager.isLoading)
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
                            viewModel.showSignOutAlert = true
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
            }
            .background(Color(.systemGroupedBackground))
            .alert("Sign Out", isPresented: $viewModel.showSignOutAlert) {
                Button("Cancel", role: .cancel) {}
                Button("Sign Out", role: .destructive) {
                    Task {
                        await authManager.signOut()
                    }
                }
            } message: {
                Text("Are you sure you want to sign out?")
            }
        }
    }
}

#Preview {
    AccountView(viewModel: AccountViewModel())
}
