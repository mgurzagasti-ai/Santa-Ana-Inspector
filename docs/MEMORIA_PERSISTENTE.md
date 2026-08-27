# Memoria persistente - Santa-Ana-Inspector

Fecha inicial: 2026-08-27

## Objetivo

Construir una aplicacion Santa-Ana-Inspector con:

- Monitor web en Next.js para rastrear inspectores.
- Control de horario de entrada y salida desde celular personal.
- Registro de ubicacion real del sitio donde se marca entrada y salida.
- APK de usuario en Kotlin con login de inspector.
- API para consultar marcas y conectar con la API existente de colectivos.
- Logo de Santa Ana visible en pantalla de inicio.

## Estado actual

- Se creo estructura monorepo en `E:\Santa-Ana-inspector`.
- El monitor web vive en `web/`.
- El monitor web fue actualizado a Next.js `16.3.3` luego de auditoria npm.
- La APK Kotlin vive en `android/`.
- La API del monitor se implementa con rutas de Next.js bajo `web/app/api/`.
- Los datos demo/persistidos se guardan en JSON bajo `web/data/`.

## Logo

El logo real fue recibido desde `c:\Users\almedina\Desktop\LogoB.png` y copiado a:

- `web/public/LogoB.png`

El monitor web ya usa ese PNG como logo principal. El archivo `web/public/logo-santa-ana.svg` queda como respaldo temporal.

## API de colectivos

Existe un endpoint placeholder:

- `GET /api/colectivos`

Para conectarlo con la API ya existente de colectivos, configurar:

- `COLECTIVOS_API_URL`
- `COLECTIVOS_API_TOKEN` si la API requiere bearer token

## Pendientes tecnicos

- Instalar JDK y Android Studio/SDK para compilar la APK.
- Conectar el endpoint `/api/colectivos` a la API real existente.
- Reemplazar el logo SVG por `LogoB.png` si se obtiene acceso al archivo original.
