package com.santaana.inspector

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

class ApiClient {
    private val client = OkHttpClient()

    companion object {
        const val BASE_URL = "http://10.0.2.2:3000"
        private val JSON = "application/json; charset=utf-8".toMediaType()
    }

    fun sendCheckin(
        inspectorId: String,
        type: String,
        latitude: Double,
        longitude: Double,
        accuracy: Float,
        phoneId: String
    ): Boolean {
        val payload = """
            {
              "inspectorId": "$inspectorId",
              "type": "$type",
              "timestamp": "${java.time.Instant.now()}",
              "latitude": $latitude,
              "longitude": $longitude,
              "accuracyMeters": $accuracy,
              "phoneId": "$phoneId"
            }
        """.trimIndent()

        val request = Request.Builder()
            .url("$BASE_URL/api/checkins")
            .post(payload.toRequestBody(JSON))
            .build()

        client.newCall(request).execute().use { response ->
            return response.isSuccessful
        }
    }
}
