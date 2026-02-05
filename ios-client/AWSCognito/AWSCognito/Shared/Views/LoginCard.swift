//
//  LoginCard.swift
//  AWSCognito
//
//  Created by Anthony Pham on 2/4/26.
//

import SwiftUI

struct LoginCard: View {
    
    var onLoginTapped: () -> Void
    
    var body: some View {
        VStack {
            
            Button(action: {
                onLoginTapped()
            }) {
                Text("Login")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(10)
            }
        }
    }
}

