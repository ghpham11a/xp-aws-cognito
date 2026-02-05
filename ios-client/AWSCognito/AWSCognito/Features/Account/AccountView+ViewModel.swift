//
//  AccountView+ViewModel.swift
//  AWSCognito
//
//  Created by Anthony Pham on 2/4/26.
//

import SwiftUI

extension AccountView {
    @Observable
    class ViewModel {
        var currentPassword = ""
        var newPassword = ""
        var confirmNewPassword = ""
        var showSignOutAlert = false
        
        var isPasswordChangeValid: Bool {
            !currentPassword.isEmpty &&
            !newPassword.isEmpty &&
            newPassword.count >= 8 &&
            newPassword == confirmNewPassword
        }

        func clearPasswordFields() {
            currentPassword = ""
            newPassword = ""
            confirmNewPassword = ""
        }
    }
}
