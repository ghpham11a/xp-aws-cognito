package com.example.awscognito.data.networking

import com.example.awscognito.data.model.AppleAuthRequest
import com.example.awscognito.data.model.AuthTokenResponse
import com.example.awscognito.data.model.FeedItem
import com.example.awscognito.data.model.GoogleAuthRequest
import com.example.awscognito.data.model.MessageResponse
import com.example.awscognito.data.model.User
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST

interface ApiService {
    @GET("users/me")
    suspend fun getCurrentUser(
        @Header("Authorization") token: String
    ): User

    @GET("feed")
    suspend fun getFeed(
        @Header("Authorization") token: String
    ): List<FeedItem>

    @GET("messages/public")
    suspend fun getPublicMessage(): MessageResponse

    @GET("messages/private")
    suspend fun getPrivateMessage(
        @Header("Authorization") token: String
    ): MessageResponse

    // Auth endpoints
    @POST("auth/google")
    suspend fun exchangeGoogleToken(
        @Body request: GoogleAuthRequest
    ): AuthTokenResponse

    @POST("auth/apple")
    suspend fun exchangeAppleToken(
        @Body request: AppleAuthRequest
    ): AuthTokenResponse
}
