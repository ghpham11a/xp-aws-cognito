package com.example.awscognito.data.api

import com.example.awscognito.data.model.FeedItem
import com.example.awscognito.data.model.User
import retrofit2.http.GET
import retrofit2.http.Header

interface ApiService {
    @GET("users/me")
    suspend fun getCurrentUser(
        @Header("Authorization") token: String
    ): User

    @GET("feed")
    suspend fun getFeed(
        @Header("Authorization") token: String
    ): List<FeedItem>
}
