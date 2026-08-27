# Santa-Ana-Inspector

Sistema para control de inspectores de Santa Ana.

## Partes del proyecto

- `web/`: monitor web hecho con Next.js. Incluye API para inspectores, marcas horarias y consulta/proxy de colectivos.
- `android/`: APK de usuario en Kotlin para login del inspector y marcacion de entrada/salida desde el celular personal.
- `docs/MEMORIA_PERSISTENTE.md`: registro persistente de decisiones, endpoints y cambios.

## Ejecutar monitor web

```powershell
npm install
npm run dev
```

Abrir `http://localhost:3000`.

## API local

- `GET /api/checkins`: lista marcas de entrada/salida.
- `POST /api/checkins`: crea una marca con ubicacion.
- `GET /api/inspectors`: lista inspectores.
- `GET /api/colectivos`: consulta placeholder/proxy para conectar con la API de colectivos existente.

## Android

El proyecto Android esta en `android/`. Requiere Android Studio, JDK y Android SDK para compilar la APK.

Configurar la URL del monitor/API en `android/app/src/main/java/com/santaana/inspector/ApiClient.kt`.

Para telefono fisico conectado a la misma red que esta PC, la APK debug actual apunta a:

```text
http://192.168.88.175:3000
```
