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

## Base de datos Postgres

La web usa Postgres cuando existe la variable `DATABASE_URL`. Si no esta configurada, usa los JSON de `web/data/` como respaldo local.

Para produccion en Vercel, crear una base Postgres free desde Vercel Marketplace, por ejemplo Prisma Postgres o Neon, y agregar la variable:

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

Para migrar los datos actuales de `web/data/*.json` a Postgres:

```powershell
cd web
$env:DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
npm run db:migrate-json
```

## API local

- `GET /api/checkins`: lista marcas de entrada/salida.
- `POST /api/checkins`: crea una marca con ubicacion.
- `GET /api/inspectors`: lista inspectores.
- `POST /api/inspectors`: crea inspector.
- `PUT /api/inspectors`: actualiza inspector.
- `DELETE /api/inspectors?id=...`: elimina inspector.
- `POST /api/inspectors/login`: valida legajo y clave de la APK.
- `GET /api/colectivos`: consulta placeholder/proxy para conectar con la API de colectivos existente.

## Android

El proyecto Android esta en `android/`. Requiere Android Studio, JDK y Android SDK para compilar la APK.

Configurar la URL del monitor/API en `android/gradle.properties`:

```text
API_BASE_URL=https://santa-ana-inspector-web.vercel.app
```

Tambien se puede sobrescribir al compilar con una propiedad Gradle o variable de entorno llamada `API_BASE_URL`.
