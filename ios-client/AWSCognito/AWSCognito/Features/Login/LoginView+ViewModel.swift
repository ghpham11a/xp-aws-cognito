//
//  LoginView+ViewModel.swift
//  AWSCognito
//
//  Created by Anthony Pham on 2/4/26.
//
import SwiftUI

extension LoginView {
    @Observable
    class ViewModel {
        var email = ""
        var password = ""
        var confirmPassword = ""
        var confirmationCode = ""
        var isSignUpMode = false
        
        var isSignUpValid: Bool {
            !email.isEmpty &&
            !password.isEmpty &&
            password.count >= 8 &&
            password == confirmPassword
        }
        
        func clearFields() {
            email = ""
            password = ""
            confirmPassword = ""
            confirmationCode = ""
        }
    }
}
