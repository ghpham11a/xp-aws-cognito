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
import GoogleSignIn

enum AuthProvider {
    case cognito
    case apple
    case google
}

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

    // Native social sign-in tokens (stored when using native Google flow)
    // These are Cognito tokens returned from backend after token exchange
    private var nativeIdToken: String?
    private var nativeAccessToken: String?
    private var authProvider: AuthProvider = .cognito

    private let apiService = APIService()

    init() {
        Task {
            await checkAuthStatus()
        }
    }

    func checkAuthStatus() async {
        // Check native token first (for native Google Sign-In)
        if nativeIdToken != nil {
            isAuthenticated = true
            return
        }

        // Check Amplify session (for email/password and web OAuth)
        do {
            let session = try await Amplify.Auth.fetchAuthSession()
            isAuthenticated = session.isSignedIn
            if session.isSignedIn {
                authProvider = .cognito
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

    func getIdToken() async throws -> String? {
        // Return native token if available (from native Google Sign-In)
        if let nativeToken = nativeIdToken {
            return nativeToken
        }

        // Fall back to Amplify session (for email/password and web OAuth)
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

            switch result.nextStep {
            case .completeAutoSignIn:
                needsConfirmation = false
                confirmationEmail = nil
                let signInResult = try await Amplify.Auth.autoSignIn()
                if signInResult.isSignedIn {
                    isAuthenticated = true
                    showLoginView = false
                    await fetchUserAttributes()
                }
            case .done:
                needsConfirmation = false
                confirmationEmail = nil
            default:
                break
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
                authProvider = .cognito
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

        // Sign out from Google SDK if needed
        if authProvider == .google {
            GIDSignIn.sharedInstance.signOut()
        }

        // Sign out from Amplify (for email/password, web OAuth, and Apple hosted UI users)
        if authProvider == .cognito || authProvider == .apple {
            _ = await Amplify.Auth.signOut(options: .init(globalSignOut: false))
        }

        // Clear native tokens (for native Google Sign-In users)
        nativeIdToken = nil
        nativeAccessToken = nil
        authProvider = .cognito

        // Clear all state
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
            let result = try await Amplify.Auth.signInWithWebUI(
                for: .apple,
                presentationAnchor: getPresentationAnchor(),
                options: .preferPrivateSession()
            )
            if result.isSignedIn {
                isAuthenticated = true
                showLoginView = false
                authProvider = .apple
                await fetchUserAttributes()
            }
        } catch let error as AuthError {
            if case .service(_, _, let underlyingError) = error,
               let cognitoError = underlyingError as? AWSCognitoAuthError,
               case .userCancelled = cognitoError {
                // User cancelled - don't show error
            } else {
                self.authError = error.errorDescription
            }
        } catch {
            self.authError = error.localizedDescription
        }

        isLoading = false
    }

    func signInWithGoogle() async {
        isLoading = true
        authError = nil

        do {
            guard let presentingVC = getPresentationAnchor().rootViewController else {
                authError = "Unable to find presenting view controller"
                isLoading = false
                return
            }

            // Step 1: Native Google Sign-In (shows Google UI)
            let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: presentingVC)

            guard let googleIdToken = result.user.idToken?.tokenString else {
                authError = "Google Sign-In did not return an ID token"
                isLoading = false
                return
            }

            let googleEmail = result.user.profile?.email
            let googleName = result.user.profile?.name

            // Step 2: Exchange Google token for Cognito tokens via backend
            let authResponse = try await apiService.exchangeGoogleToken(
                idToken: googleIdToken,
                email: googleEmail,
                fullName: googleName
            )

            // Step 3: Store Cognito tokens and update state
            nativeIdToken = authResponse.idToken
            nativeAccessToken = authResponse.accessToken
            authProvider = .google
            isAuthenticated = true
            showLoginView = false
            email = googleEmail
            userId = result.user.userID

        } catch let error as APIError {
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
