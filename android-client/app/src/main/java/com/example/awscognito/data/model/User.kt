package com.example.awscognito.data.model

import com.google.gson.annotations.SerializedName

data class User(
    @SerializedName("user_id")
    val userId: String,
    val email: String,
    val name: String?,
    @SerializedName("created_at")
    val createdAt: String
)
