package com.example.awscognito.data.repositories.messages

import com.example.awscognito.data.model.MessageResponse
import retrofit2.http.GET
import retrofit2.http.Header

interface MessagesEndpoints {
    @GET("messages/public")
    suspend fun getPublicMessage(): MessageResponse

    @GET("messages/private")
    suspend fun getPrivateMessage(
        @Header("Authorization") token: String
    ): MessageResponse
}