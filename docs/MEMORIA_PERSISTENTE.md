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
- La APK debug compila con AndroidX habilitado y Java/Kotlin JVM target `17`.
- La APK debug fue instalada por ADB en el dispositivo `M185ES003073C3100159`.
- La APK para telefono fisico apunta al monitor web real en `http://192.168.88.175:3000`.
- La APK inicia un servicio de rastreo en segundo plano al marcar Entrada y lo detiene al marcar Salida.
- La API del monitor se implementa con rutas de Next.js bajo `web/app/api/`.
- La API tiene endpoint `/api/tracking` para guardar puntos GPS periodicos del turno activo.
- Los datos demo/persistidos se guardan en JSON bajo `web/data/`.
- Se quito la tarjeta visual de la APK del monitor web.
- El monitor web muestra un unico mapa general de San Salvador de Jujuy.
- Se agregaron registros de marcas con filtros por inspector, dia y mes.
- El mapa unico del monitor ahora se centra en la ultima ubicacion real recibida por `/api/tracking`; si no hay rastreo, usa la ultima marca.

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

- Para compilar en esta PC se uso Java en `E:\1\jbr` y SDK en `E:\Android\Sdk`.
- Conectar el endpoint `/api/colectivos` a la API real existente.
