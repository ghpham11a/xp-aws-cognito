//
//  AuthManager.swift
//  AWSCognito
//
//  Created by Anthony Pham on 2/4/26.
//

import SwiftUI
import Amplify
import AWSPluginsCore
import AWSCognitoAuthPlugin

@Observable
@MainActor
final class AuthManager {
    
    var isAuthenticated = false
    var isLoading = false
    var userId: String?
    var email: String?
    var authError: String?
    var showLoginView = false

    // Signup confirmation state
    var needsConfirmation = false
    var confirmationEmail: String?

    // Dashboard state
    var user: User?
    var feedItems: [FeedItem] = []
    var dashboardLoading = false
    var dashboardError: String?

    // Password change state
    var passwordChangeSuccess = false
    var passwordChangeError: String?
    
    init() {
        Task {
            await checkAuthStatus()
        }
    }
    
    func checkAuthStatus() async {
        do {
            let session = try await Amplify.Auth.fetchAuthSession()
            isAuthenticated = session.isSignedIn
            if session.isSignedIn {
                
            }
        } catch {
            print("err: \(error)")
        }
    }
    
    private func fetchUserAttributes() async {
        do {
            let attributes = try await Amplify.Auth.fetchUserAttributes()
            for attribute in attributes {
                switch attribute.key {
                case .email:
                    email = attribute.value
                case .sub:
                    userId = attribute.value
                default:
                    break
                }
            }
        } catch {
            print("err: \(error)")
        }
    }
    
    private func provisionUser() async {
        guard let token = try? await getIdToken() else { return }
        do {
            // let currentUser = try await NetworkService.shared.request(url: "", authToken: token)
        } catch {
            print("err: \(error)")
        }
    }
    
    private func getIdToken() async throws -> String? {
        let session = try await Amplify.Auth.fetchAuthSession()
        if let cognitoTokenProvider = session as? AuthCognitoTokensProvider {
            let tokens = try cognitoTokenProvider.getCognitoTokens().get()
            return tokens.idToken
        }
        return nil
    }
    
    func signUp(email: String, password: String) async {
        isLoading = true
        authError = nil

        let userAttributes = [AuthUserAttribute(.email, value: email)]
        let options = AuthSignUpRequest.Options(userAttributes: userAttributes)

        do {
            let result = try await Amplify.Auth.signUp(
                username: email,
                password: password,
                options: options
            )

            switch result.nextStep {
            case .confirmUser(_, _, _):
                needsConfirmation = true
                confirmationEmail = email
            case .done:
                await signIn(email: email, password: password)
            case .completeAutoSignIn:
                isAuthenticated = true
                showLoginView = false
                await fetchUserAttributes()
            }
        } catch let error as AuthError {
            authError = error.errorDescription
        } catch {
            authError = error.localizedDescription
        }

        isLoading = false
    }

    func confirmSignUp(code: String) async {
        guard let email = confirmationEmail else {
            authError = "No email to confirm"
            return
        }

        isLoading = true
        authError = nil

        do {
            let result = try await Amplify.Auth.confirmSignUp(
                for: email,
                confirmationCode: code
            )

            if result.isSignUpComplete {
                needsConfirmation = false
                confirmationEmail = nil
            }
        } catch let error as AuthError {
            authError = error.errorDescription
        } catch {
            authError = error.localizedDescription
        }

        isLoading = false
    }

    func signIn(email: String, password: String) async {
        isLoading = true
        authError = nil

        do {
            let result = try await Amplify.Auth.signIn(
                username: email,
                password: password
            )

            if result.isSignedIn {
                isAuthenticated = true
                showLoginView = false
                await fetchUserAttributes()
            }

            if case .confirmSignUp(_) = result.nextStep {
                needsConfirmation = true
                confirmationEmail = email
            }
    
        } catch let error as AuthError {
            authError = error.errorDescription
        } catch {
            authError = error.localizedDescription
        }
        
        print("authError \(authError ?? "")")

        isLoading = false
    }

    func signOut() async {
        isLoading = true

        _ = await Amplify.Auth.signOut(options: .init(globalSignOut: false))
        isAuthenticated = false
        userId = nil
        email = nil
        user = nil
        feedItems = []
        needsConfirmation = false
        confirmationEmail = nil

        isLoading = false
    }

    func changePassword(currentPassword: String, newPassword: String) async {
        isLoading = true
        passwordChangeError = nil
        passwordChangeSuccess = false

        do {
            try await Amplify.Auth.update(oldPassword: currentPassword, to: newPassword)
            passwordChangeSuccess = true
        } catch let error as AuthError {
            passwordChangeError = error.errorDescription
        } catch {
            passwordChangeError = error.localizedDescription
        }

        isLoading = false
    }
    
    func presentLoginView() {
        showLoginView = true
    }

    // MARK: - Social Sign In

    func signInWithApple() async {
        isLoading = true
        authError = nil

        do {
            let result = try await Amplify.Auth.signInWithWebUI(for: .apple, presentationAnchor: getPresentationAnchor(), options: .preferPrivateSession())
            if result.isSignedIn {
                isAuthenticated = true
                showLoginView = false
                await fetchUserAttributes()
            }
        } catch let error as AuthError {
            authError = error.errorDescription
        } catch {
            authError = error.localizedDescription
        }

        isLoading = false
    }

    func signInWithGoogle() async {
        isLoading = true
        authError = nil

        do {
            let result = try await Amplify.Auth.signInWithWebUI(for: .google, presentationAnchor: getPresentationAnchor(), options: .preferPrivateSession())
            if result.isSignedIn {
                isAuthenticated = true
                showLoginView = false
                await fetchUserAttributes()
            }
        } catch let error as AuthError {
            authError = error.errorDescription
        } catch {
            authError = error.localizedDescription
        }

        isLoading = false
    }

    private func getPresentationAnchor() -> AuthUIPresentationAnchor {
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = scene.windows.first
        else {
            fatalError("No window found")
        }
        return window
    }
}
