//
//  AuthViewModel.swift
//  AWSCognito
//

import Foundation
import Amplify
import AWSCognitoAuthPlugin
import AWSPluginsCore
import Observation

@Observable
@MainActor
final class AuthViewModel {
    // Auth state
    var isAuthenticated = false
    var isLoading = false
    var userId: String?
    var email: String?
    var authError: String?

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
                await fetchUserAttributes()
            }
        } catch {
            print("Error checking auth status: \(error)")
            isAuthenticated = false
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
            print("Error fetching user attributes: \(error)")
        }
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
                await fetchUserAttributes()
            }
        } catch let error as AuthError {
            authError = error.errorDescription
        } catch {
            authError = error.localizedDescription
        }

        isLoading = false
    }

    func signOut() async {
        isLoading = true

        _ = await Amplify.Auth.signOut()
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

    func loadDashboardData() async {
        dashboardLoading = true
        dashboardError = nil

        do {
            guard let token = try await getIdToken() else {
                dashboardError = "Failed to get authentication token"
                dashboardLoading = false
                return
            }

            // Fetch user and feed in parallel
            async let userResult = APIService.shared.fetchCurrentUser(token: token)
            async let feedResult = APIService.shared.fetchFeed(token: token)

            user = try await userResult
            feedItems = try await feedResult
        } catch {
            dashboardError = error.localizedDescription
        }

        dashboardLoading = false
    }

    private func getIdToken() async throws -> String? {
        let session = try await Amplify.Auth.fetchAuthSession()

        if let cognitoTokenProvider = session as? AuthCognitoTokensProvider {
            let tokens = try cognitoTokenProvider.getCognitoTokens().get()
            return tokens.idToken
        }
        return nil
    }
}
