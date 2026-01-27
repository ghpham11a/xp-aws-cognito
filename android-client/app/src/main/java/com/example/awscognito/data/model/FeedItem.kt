package com.example.awscognito.data.model

data class FeedItem(
    val id: String,
    val title: String,
    val content: String,
    val type: String
) {
    companion object {
        const val TYPE_ANNOUNCEMENT = "announcement"
        const val TYPE_UPDATE = "update"
        const val TYPE_REPORT = "report"
    }
}
