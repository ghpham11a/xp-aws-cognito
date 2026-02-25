package com.example.awscognito.data.model

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class User(
    @Json(name = "user_id")
    val userId: String,
    val email: String,
    val name: String?,
    @Json(name = "created_at")
    val createdAt: String
)
