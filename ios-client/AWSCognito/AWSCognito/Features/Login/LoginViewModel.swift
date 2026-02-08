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
