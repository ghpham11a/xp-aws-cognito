package com.example.awscognito.data.repositories.auth

import com.example.awscognito.data.model.AppleAuthRequest
import com.example.awscognito.data.model.AuthTokenResponse
import com.example.awscognito.data.model.GoogleAuthRequest
import retrofit2.http.Body
import retrofit2.http.POST

interface AuthEndpoints {

    @POST("auth/google")
    suspend fun exchangeGoogleToken(
        @Body request: GoogleAuthRequest
    ): AuthTokenResponse

    @POST("auth/apple")
    suspend fun exchangeAppleToken(
        @Body request: AppleAuthRequest
    ): AuthTokenResponse
}