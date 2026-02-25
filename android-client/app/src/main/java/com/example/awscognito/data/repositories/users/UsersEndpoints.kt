package com.example.awscognito.data.repositories.users

import com.example.awscognito.data.model.User
import retrofit2.http.GET
import retrofit2.http.Header

interface UsersEndpoints {
    @GET("users/me")
    suspend fun getCurrentUser(
        @Header("Authorization") token: String
    ): User
}