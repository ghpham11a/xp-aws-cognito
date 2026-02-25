package com.example.awscognito.core.networking

import android.util.Log
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Listener interface for authentication-related HTTP events.
 */
interface AuthEventListener {
    /**
     * Called when the server returns a 401 Unauthorized response.
     * This typically indicates the token has expired or is invalid.
     */
    fun onUnauthorized()
}

/**
 * OkHttp interceptor that monitors responses for authentication failures.
 * When a 401 response is received, it notifies registered listeners to handle
 * the unauthorized state (e.g., logging out the user).
 */
@Singleton
class AuthInterceptor @Inject constructor() : Interceptor {

    private var listener: AuthEventListener? = null

    /**
     * Set the listener for auth events.
     * Should be called during app initialization after DI is complete.
     */
    fun setAuthEventListener(listener: AuthEventListener) {
        this.listener = listener
    }

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val response = chain.proceed(request)

        when (response.code) {
            401 -> {
                Log.w(TAG, "Received 401 Unauthorized for ${request.url}")
                listener?.onUnauthorized()
            }
            403 -> {
                Log.w(TAG, "Received 403 Forbidden for ${request.url}")
                // Could handle differently if needed
            }
        }

        return response
    }

    companion object {
        private const val TAG = "AuthInterceptor"
    }
}
