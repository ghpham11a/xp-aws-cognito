package com.example.awscognito.app

import android.app.Application
import android.util.Log
import com.amplifyframework.AmplifyException
import com.amplifyframework.auth.cognito.AWSCognitoAuthPlugin
import com.amplifyframework.core.Amplify
import com.example.awscognito.core.auth.AuthStateManager
import com.example.awscognito.core.networking.AuthInterceptor
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class CognitoApp : Application() {

    // Inject to wire up auth event handling
    @Inject
    lateinit var authInterceptor: AuthInterceptor

    @Inject
    lateinit var authStateManager: AuthStateManager

    override fun onCreate() {
        super.onCreate()

        // Initialize Amplify
        try {
            Amplify.addPlugin(AWSCognitoAuthPlugin())
            Amplify.configure(applicationContext)
            Log.i(TAG, "Initialized Amplify")
        } catch (error: AmplifyException) {
            Log.e(TAG, "Could not initialize Amplify", error)
        }

        // Wire up auth event listener for 401 handling
        authInterceptor.setAuthEventListener(authStateManager)
        Log.d(TAG, "Auth event listener configured")
    }

    companion object {
        private const val TAG = "CognitoApp"
    }
}
