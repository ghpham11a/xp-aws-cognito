package com.example.awscognito.core.auth

import android.util.Base64
import android.util.Log
import org.json.JSONObject

/**
 * Utility class for JWT token operations.
 */
object JwtUtils {

    private const val TAG = "JwtUtils"

    /**
     * Buffer time in seconds before actual expiration to consider token expired.
     * This prevents edge cases where token expires during an API call.
     */
    private const val EXPIRATION_BUFFER_SECONDS = 60

    /**
     * Check if a JWT token is expired.
     *
     * @param token The JWT token string
     * @return true if expired or invalid, false if still valid
     */
    fun isTokenExpired(token: String?): Boolean {
        if (token.isNullOrBlank()) return true

        return try {
            val expirationTime = getExpirationTime(token)
            if (expirationTime == null) {
                Log.w(TAG, "Could not extract expiration from token")
                return false // Assume valid if we can't parse
            }

            val currentTime = System.currentTimeMillis() / 1000
            val isExpired = currentTime >= (expirationTime - EXPIRATION_BUFFER_SECONDS)

            if (isExpired) {
                Log.d(TAG, "Token is expired. Current: $currentTime, Expiration: $expirationTime")
            }

            isExpired
        } catch (e: Exception) {
            Log.e(TAG, "Error checking token expiration", e)
            false // Assume valid on error, let the server reject if invalid
        }
    }

    /**
     * Get the expiration time from a JWT token.
     *
     * @param token The JWT token string
     * @return Unix timestamp of expiration, or null if unable to parse
     */
    fun getExpirationTime(token: String): Long? {
        return try {
            val parts = token.split(".")
            if (parts.size != 3) {
                Log.w(TAG, "Invalid JWT format: expected 3 parts, got ${parts.size}")
                return null
            }

            // Decode the payload (second part)
            val payload = parts[1]
            val decodedBytes = Base64.decode(payload, Base64.URL_SAFE or Base64.NO_WRAP)
            val decodedPayload = String(decodedBytes, Charsets.UTF_8)

            val json = JSONObject(decodedPayload)
            if (json.has("exp")) {
                json.getLong("exp")
            } else {
                Log.w(TAG, "JWT payload does not contain 'exp' claim")
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing JWT token", e)
            null
        }
    }

    /**
     * Get the time until token expiration in seconds.
     *
     * @param token The JWT token string
     * @return Seconds until expiration, or null if unable to determine
     */
    fun getSecondsUntilExpiration(token: String?): Long? {
        if (token.isNullOrBlank()) return null

        return try {
            val expirationTime = getExpirationTime(token) ?: return null
            val currentTime = System.currentTimeMillis() / 1000
            (expirationTime - currentTime).coerceAtLeast(0)
        } catch (e: Exception) {
            Log.e(TAG, "Error calculating time until expiration", e)
            null
        }
    }
}
