package com.example.awscognito.data.model

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class GoogleAuthRequest(
    @Json(name = "id_token")
    val idToken: String,
    val email: String?,
    @Json(name = "full_name")
    val fullName: String?
)

@JsonClass(generateAdapter = true)
data class AppleAuthRequest(
    @Json(name = "identity_token")
    val identityToken: String,
    @Json(name = "authorization_code")
    val authorizationCode: String,
    val email: String?,
    @Json(name = "full_name")
    val fullName: String?
)

@JsonClass(generateAdapter = true)
data class AuthTokenResponse(
    @Json(name = "id_token")
    val idToken: String,
    @Json(name = "access_token")
    val accessToken: String,
    @Json(name = "refresh_token")
    val refreshToken: String?,
    @Json(name = "expires_in")
    val expiresIn: Int
)
