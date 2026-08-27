package com.santaana.inspector

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Bundle
import android.provider.Settings
import android.view.Gravity
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationServices
import kotlin.concurrent.thread

class MainActivity : AppCompatActivity() {
    private val api = ApiClient()
    private val locationPermissionCode = 1001
    private lateinit var statusText: TextView
    private lateinit var employeeInput: EditText
    private lateinit var pinInput: EditText
    private var loggedInspectorId: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestLocationPermission()
        renderLogin()
    }

    private fun renderLogin() {
        val root = baseLayout()

        val logo = ImageView(this).apply {
            setImageResource(R.drawable.logo_santa_ana)
            adjustViewBounds = true
            maxHeight = 160
        }

        employeeInput = EditText(this).apply {
            hint = "Legajo"
            setSingleLine(true)
        }

        pinInput = EditText(this).apply {
            hint = "Clave"
            inputType = android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_VARIATION_PASSWORD
            setSingleLine(true)
        }

        statusText = TextView(this).apply {
            text = "Ingrese con su legajo de inspector"
            gravity = Gravity.CENTER
        }

        val login = Button(this).apply {
            text = "Ingresar"
            setOnClickListener {
                val legajo = employeeInput.text.toString().trim()
                val pin = pinInput.text.toString().trim()
                if (legajo.isNotEmpty() && pin.isNotEmpty()) {
                    loggedInspectorId = legajo
                    renderCheckin()
                } else {
                    statusText.text = "Complete legajo y clave"
                }
            }
        }

        root.addView(logo)
        root.addView(employeeInput)
        root.addView(pinInput)
        root.addView(login)
        root.addView(statusText)
        setContentView(root)
    }

    private fun renderCheckin() {
        val root = baseLayout()
        statusText = TextView(this).apply {
            text = "Listo para marcar horario"
            gravity = Gravity.CENTER
        }

        val entry = Button(this).apply {
            text = "Marcar entrada"
            setOnClickListener { mark("entrada") }
        }

        val exit = Button(this).apply {
            text = "Marcar salida"
            setOnClickListener { mark("salida") }
        }

        root.addView(TextView(this).apply {
            text = "Santa Ana Inspector"
            textSize = 24f
            gravity = Gravity.CENTER
        })
        root.addView(entry)
        root.addView(exit)
        root.addView(statusText)
        setContentView(root)
    }

    @SuppressLint("MissingPermission")
    private fun mark(type: String) {
        val inspectorId = loggedInspectorId ?: return
        statusText.text = "Obteniendo ubicacion..."
        val fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        fusedLocationClient.lastLocation.addOnSuccessListener { location ->
            if (location == null) {
                statusText.text = "No se pudo obtener ubicacion GPS"
                return@addOnSuccessListener
            }

            statusText.text = "Enviando marca..."
            val phoneId = Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID)
            thread {
                val ok = api.sendCheckin(
                    inspectorId,
                    type,
                    location.latitude,
                    location.longitude,
                    location.accuracy,
                    phoneId
                )
                runOnUiThread {
                    statusText.text = if (ok) "Marca enviada: $type" else "Error enviando marca"
                }
            }
        }
    }

    private fun requestLocationPermission() {
        val fine = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
        if (fine != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION),
                locationPermissionCode
            )
        }
    }

    private fun baseLayout(): LinearLayout {
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(36, 36, 36, 36)
        }
    }
}
