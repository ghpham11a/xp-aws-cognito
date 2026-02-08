//
//  LoginCard.swift
//  AWSCognito
//
//  Created by Anthony Pham on 2/4/26.
//

import SwiftUI

struct LoginCard<Greeting: View, Statement: View>: View {
    
    var onLoginTapped: () -> Void
    private let greeting: Greeting
    private let statement: Statement
    
    init(
        onLoginTapped: @escaping () -> Void,
        @ViewBuilder greeting: () -> Greeting,
        @ViewBuilder statement: () -> Statement
    ) {
        self.onLoginTapped = onLoginTapped
        self.greeting = greeting()
        self.statement = statement()
    }
    
    var body: some View {
        VStack {
            
            greeting
                .frame(maxWidth: .infinity, alignment: .leading)
            
            statement
                .frame(maxWidth: .infinity, alignment: .leading)
            
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
        .padding()
    }
}

