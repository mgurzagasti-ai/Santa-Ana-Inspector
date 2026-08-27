package com.santaana.inspector

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlin.concurrent.thread

class TrackingService : Service() {
    private val api = ApiClient()
    private val channelId = "santa_ana_tracking"
    private val notificationId = 2001
    private val fusedLocationClient by lazy { LocationServices.getFusedLocationProviderClient(this) }
    private var inspectorId: String = ""

    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            val location = result.lastLocation ?: return
            val currentInspectorId = inspectorId
            if (currentInspectorId.isBlank()) return

            val phoneId = Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID)
            thread {
                api.sendTrackingPoint(
                    currentInspectorId,
                    location.latitude,
                    location.longitude,
                    location.accuracy,
                    phoneId
                )
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        inspectorId = intent?.getStringExtra(EXTRA_INSPECTOR_ID).orEmpty()
        createNotificationChannel()
        startForeground(notificationId, buildNotification())
        startLocationUpdates()
        return START_STICKY
    }

    override fun onDestroy() {
        fusedLocationClient.removeLocationUpdates(locationCallback)
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun startLocationUpdates() {
        val fine = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
        val coarse = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION)
        if (fine != PackageManager.PERMISSION_GRANTED && coarse != PackageManager.PERMISSION_GRANTED) {
            stopSelf()
            return
        }

        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 60000L)
            .setMinUpdateIntervalMillis(30000L)
            .setMinUpdateDistanceMeters(25f)
            .build()

        fusedLocationClient.requestLocationUpdates(request, locationCallback, mainLooper)
    }

    private fun buildNotification() =
        NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.logo_santa_ana)
            .setContentTitle("Santa Ana Inspector")
            .setContentText("Rastreo de turno activo")
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(NotificationManager::class.java)
        val channel = NotificationChannel(
            channelId,
            "Rastreo de turno",
            NotificationManager.IMPORTANCE_LOW
        )
        manager.createNotificationChannel(channel)
    }

    companion object {
        const val EXTRA_INSPECTOR_ID = "inspector_id"
    }
}
