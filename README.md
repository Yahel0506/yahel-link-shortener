# link.yahel.dev

Acortador de enlaces construido con React, Vite, Vercel Functions y Neon Postgres, siguiendo el sistema de marca de yahel.dev.

Los enlaces viven en la tabla `short_links`. El navegador conserva únicamente el token de administración de cada enlace creado desde ese dispositivo; Neon guarda su hash SHA-256. Eso permite eliminar enlaces propios sin publicar una contraseña de base de datos ni dejar abierto un endpoint de borrado global.

## Desarrollo local

```bash
npm install
npm run dev
```

`npm run dev` levanta solo el frontend. Para probar también las funciones serverless, configura las variables de `.env.example` y ejecuta:

```bash
npm run dev:vercel
```

## Base de datos Neon

Usa una conexión directa para migraciones y una conexión pooled para la aplicación:

```bash
cp .env.example .env.local
# Completa DATABASE_URL y DATABASE_URL_UNPOOLED con las conexiones de yaheldevdb.
npm run db:migrate
```

La migración versionada está en `drizzle/0000_create_short_links.sql`. El borrado es reversible: marca `deleted_at` y las redirecciones dejan de funcionar, sin destruir inmediatamente la fila.

## Verificación

```bash
npm run lint
npm run build
```

## Deploy en Vercel

1. Importa este repositorio en Vercel.
2. Vercel detectará Vite y usará `npm run build` con `dist` como directorio de salida.
3. En **Project settings → Domains**, agrega `link.yahel.dev`.
4. En **Settings → Environment Variables**, agrega `DATABASE_URL` con la conexión pooled de `yaheldevdb`.
5. Crea el registro DNS que Vercel indique en el proveedor de `yahel.dev`.

`vercel.json` envía las rutas cortas de 6–12 caracteres a la función de redirección y mantiene la app React disponible en el resto de rutas.
