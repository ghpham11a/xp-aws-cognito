//
//  LoginViewModel.swift
//  AWSCognito
//
//  Created by Anthony Pham on 2/8/26.
//
import SwiftUI

@Observable
class LoginViewModel {
    var email = ""
    var password = ""
    var confirmPassword = ""
    var confirmationCode = ""
    var isSignUpMode = false

    var isEmailValid: Bool {
        let pattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
        return email.wholeMatch(of: pattern) != nil
    }

    var emailValidationMessage: String? {
        if email.isEmpty { return nil }
        return isEmailValid ? nil : "Please enter a valid email address"
    }

    var isSignInValid: Bool {
        isEmailValid && !password.isEmpty
    }

    var isSignUpValid: Bool {
        isEmailValid &&
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
