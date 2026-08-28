package com.santaana.inspector

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Toast
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
                    statusText.text = "Validando inspector..."
                    isEnabled = false
                    thread {
                        val inspectorId = api.login(legajo, pin)
                        runOnUiThread {
                            isEnabled = true
                            when (inspectorId) {
                                is ApiClient.LoginResult.Success -> {
                                    loggedInspectorId = inspectorId.inspectorId
                                    renderCheckin()
                                }
                                ApiClient.LoginResult.InvalidCredentials -> {
                                    statusText.text = "Inspector no registrado o clave incorrecta"
                                }
                                ApiClient.LoginResult.ConnectionError -> {
                                    statusText.text = "No se pudo conectar con el servidor"
                                }
                            }
                        }
                    }
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

        val close = Button(this).apply {
            text = "Cerrar app"
            setOnClickListener { closeApp() }
        }

        root.addView(TextView(this).apply {
            text = "Santa Ana Inspector"
            textSize = 24f
            gravity = Gravity.CENTER
        })
        root.addView(entry)
        root.addView(exit)
        root.addView(close)
        root.addView(statusText)
        setContentView(root)
    }

    @SuppressLint("MissingPermission")
    private fun mark(type: String) {
        val inspectorId = loggedInspectorId ?: return
        if (!hasLocationPermission()) {
            statusText.text = "Permiso de ubicacion requerido"
            requestLocationPermission()
            return
        }

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
                    if (ok) {
                        if (type == "entrada") {
                            startTrackingService(inspectorId)
                            statusText.text = "Turno abierto. Rastreo activo"
                        } else {
                            stopTrackingService()
                            statusText.text = "Turno cerrado. Rastreo detenido"
                        }
                    } else {
                        statusText.text = "Error enviando marca"
                    }
                }
            }
        }.addOnFailureListener {
            statusText.text = "No se pudo obtener ubicacion GPS"
        }
    }

    private fun requestLocationPermission() {
        val fine = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
        if (fine != PackageManager.PERMISSION_GRANTED) {
            val permissions = mutableListOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            )
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                permissions.add(Manifest.permission.POST_NOTIFICATIONS)
            }
            ActivityCompat.requestPermissions(
                this,
                permissions.toTypedArray(),
                locationPermissionCode
            )
        }
    }

    private fun startTrackingService(inspectorId: String) {
        val intent = Intent(this, TrackingService::class.java).apply {
            putExtra(TrackingService.EXTRA_INSPECTOR_ID, inspectorId)
        }
        try {
            ContextCompat.startForegroundService(this, intent)
        } catch (_: RuntimeException) {
            statusText.text = "No se pudo iniciar el rastreo"
            Toast.makeText(this, "Revise permisos de ubicacion", Toast.LENGTH_LONG).show()
        }
    }

    private fun stopTrackingService() {
        stopService(Intent(this, TrackingService::class.java))
    }

    private fun closeApp() {
        finishAndRemoveTask()
    }

    private fun baseLayout(): LinearLayout {
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(36, 36, 36, 36)
        }
    }

    private fun hasLocationPermission(): Boolean {
        val fine = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
        val coarse = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION)
        return fine == PackageManager.PERMISSION_GRANTED || coarse == PackageManager.PERMISSION_GRANTED
    }
}
