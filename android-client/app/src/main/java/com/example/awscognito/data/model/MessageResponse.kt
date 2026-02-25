package com.example.awscognito.data.model

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class MessageResponse(
    val message: String,
    val authenticated: Boolean
)
