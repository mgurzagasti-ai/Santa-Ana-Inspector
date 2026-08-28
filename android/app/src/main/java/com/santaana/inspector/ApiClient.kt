package com.santaana.inspector

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import java.time.Instant

class ApiClient {
    private val client = OkHttpClient()

    companion object {
        val BASE_URL = BuildConfig.API_BASE_URL.trimEnd('/')
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
        val payload = JSONObject()
            .put("inspectorId", inspectorId)
            .put("type", type)
            .put("timestamp", Instant.now().toString())
            .put("latitude", latitude)
            .put("longitude", longitude)
            .put("accuracyMeters", accuracy)
            .put("phoneId", phoneId)
            .toString()

        return postJson("$BASE_URL/api/checkins", payload)
    }

    fun login(employeeCode: String, pin: String): String? {
        val payload = JSONObject()
            .put("employeeCode", employeeCode)
            .put("pin", pin)
            .toString()

        val request = Request.Builder()
            .url("$BASE_URL/api/inspectors/login")
            .post(payload.toRequestBody(JSON))
            .build()

        return try {
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) return null

                val body = response.body?.string() ?: return null
                JSONObject(body).getJSONObject("inspector").getString("id")
            }
        } catch (_: Exception) {
            null
        }
    }

    fun sendTrackingPoint(
        inspectorId: String,
        latitude: Double,
        longitude: Double,
        accuracy: Float,
        phoneId: String
    ): Boolean {
        val payload = JSONObject()
            .put("inspectorId", inspectorId)
            .put("timestamp", Instant.now().toString())
            .put("latitude", latitude)
            .put("longitude", longitude)
            .put("accuracyMeters", accuracy)
            .put("phoneId", phoneId)
            .toString()

        return postJson("$BASE_URL/api/tracking", payload)
    }

    private fun postJson(url: String, payload: String): Boolean {
        val request = Request.Builder()
            .url(url)
            .post(payload.toRequestBody(JSON))
            .build()

        return try {
            client.newCall(request).execute().use { response ->
                response.isSuccessful
            }
        } catch (_: IOException) {
            false
        }
    }
}
