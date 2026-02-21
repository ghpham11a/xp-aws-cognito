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
import AuthenticationServices
import GoogleSignIn

enum AuthProvider {
    case cognito
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

<<<<<<< HEAD
    // Native Apple Sign-In tokens (stored when using native flow)
    private var nativeIdToken: String?
    private var nativeAccessToken: String?

    private let appleSignInService = AppleSignInService()
    private let apiService = APIService()
=======
    // Auth provider tracking
    private var authProvider: AuthProvider = .cognito
    private var googleIdToken: String?
>>>>>>> 49daa21c1f963c4204ea0bb328b5ef24d0649265

    init() {
        Task {
            await checkAuthStatus()
        }
    }

    func checkAuthStatus() async {
<<<<<<< HEAD
        // Check native token first (for native Apple Sign-In)
        if nativeIdToken != nil {
            isAuthenticated = true
            return
        }

        // Check Amplify session (for email/password and web OAuth)
        do {
            let session = try await Amplify.Auth.fetchAuthSession()
            isAuthenticated = session.isSignedIn
=======
        // Try restoring Google session first
        do {
            let googleUser = try await GIDSignIn.sharedInstance.restorePreviousSignIn()
            if let idToken = googleUser.idToken?.tokenString {
                googleIdToken = idToken
                authProvider = .google
                isAuthenticated = true
                email = googleUser.profile?.email
                userId = googleUser.userID
                return
            }
        } catch {
            // No previous Google session, try Cognito
        }

        do {
            let session = try await Amplify.Auth.fetchAuthSession()
            isAuthenticated = session.isSignedIn
            if session.isSignedIn {
                authProvider = .cognito
            }
>>>>>>> 49daa21c1f963c4204ea0bb328b5ef24d0649265
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
<<<<<<< HEAD
        // Return native token if available (from native Apple Sign-In)
        if let nativeToken = nativeIdToken {
            return nativeToken
        }

        // Fall back to Amplify session (for email/password and web OAuth)
=======
        if authProvider == .google {
            return googleIdToken
        }

>>>>>>> 49daa21c1f963c4204ea0bb328b5ef24d0649265
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

<<<<<<< HEAD
        // Sign out from Amplify (for email/password and web OAuth users)
        _ = await Amplify.Auth.signOut(options: .init(globalSignOut: false))

        // Clear native tokens (for native Apple Sign-In users)
        nativeIdToken = nil
        nativeAccessToken = nil

        // Clear all state
=======
        if authProvider == .google {
            GIDSignIn.sharedInstance.signOut()
            googleIdToken = nil
        } else {
            _ = await Amplify.Auth.signOut(options: .init(globalSignOut: false))
        }

        authProvider = .cognito
>>>>>>> 49daa21c1f963c4204ea0bb328b5ef24d0649265
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
            // Step 1: Native Apple Sign-In (shows system UI)
            let appleResult = try await appleSignInService.signIn()

            // Build full name string if available
            var fullName: String? = nil
            if let nameComponents = appleResult.fullName {
                let formatter = PersonNameComponentsFormatter()
                let name = formatter.string(from: nameComponents)
                if !name.isEmpty {
                    fullName = name
                }
            }

            // Step 2: Exchange Apple token for Cognito tokens via backend
            let authResponse = try await apiService.exchangeAppleToken(
                identityToken: appleResult.identityToken,
                authorizationCode: appleResult.authorizationCode,
                email: appleResult.email,
                fullName: fullName
            )

            // Step 3: Store tokens and update state
            nativeIdToken = authResponse.idToken
            nativeAccessToken = authResponse.accessToken
            isAuthenticated = true
            showLoginView = false

            // Extract user info from token (or fetch from /users/me)
            if let email = appleResult.email {
                self.email = email
            }

        } catch let error as AppleSignInError {
            if case .cancelled = error {
                // User cancelled - don't show error
            } else {
                authError = error.errorDescription
            }
        } catch let error as APIError {
            authError = error.errorDescription
        } catch {
            authError = error.localizedDescription
        }

        isLoading = false
    }

    /// Legacy web-based Apple Sign-In (kept for reference)
    func signInWithAppleWeb() async {
        isLoading = true
        authError = nil

        do {
            let result = try await Amplify.Auth.signInWithWebUI(for: .apple, presentationAnchor: getPresentationAnchor(), options: .preferPrivateSession())
            if result.isSignedIn {
                isAuthenticated = true
                showLoginView = false
                authProvider = .cognito
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
            guard let presentingVC = getPresentationAnchor().rootViewController else {
                authError = "Unable to find presenting view controller"
                isLoading = false
                return
            }

            let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: presentingVC)

            guard let idToken = result.user.idToken?.tokenString else {
                authError = "Google Sign-In did not return an ID token"
                isLoading = false
                return
            }

            googleIdToken = idToken
            authProvider = .google
            isAuthenticated = true
            showLoginView = false
            email = result.user.profile?.email
            userId = result.user.userID
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
