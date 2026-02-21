package com.example.awscognito.data.model

import com.google.gson.annotations.SerializedName

data class GoogleAuthRequest(
    @SerializedName("id_token")
    val idToken: String,
    val email: String?,
    @SerializedName("full_name")
    val fullName: String?
)

data class AuthTokenResponse(
    @SerializedName("id_token")
    val idToken: String,
    @SerializedName("access_token")
    val accessToken: String,
    @SerializedName("refresh_token")
    val refreshToken: String?,
    @SerializedName("expires_in")
    val expiresIn: Int
)
