# Transfiere

Mi propio WeTransfer: subir un par de archivos pesados y mandar un link. Vive en
**https://transfiere.moibe.me** (droplet propio: pm2 detrás de nginx).

## Cómo funciona

- **`/`** — con la clave (`UPLOAD_PASSWORD`) eliges archivos, un mensajito y la caducidad del
  link. Se suben por **chunks de 16 MB** con progreso real (velocidad, tiempo restante) y
  reintentos automáticos; al terminar te da el link para copiar o mandar por WhatsApp.
- **`/t/<id>`** — la página pública del link: lista los archivos, botón por archivo y
  "Descargar todo (.zip)". **Nunca pide clave.** Si se abre mientras todavía se está subiendo,
  se actualiza sola.
- **`/transferencias`** — lo que has mandado, descargas por archivo y borrar (con confirmación).
- Las transferencias **se borran solas al expirar** (limpieza al arrancar y cada hora).
- Las descargas soportan `Range` (pausar/reanudar) y se streamean directo del disco.

## Stack

SvelteKit 2 (Svelte 5 + TypeScript) · Tailwind v4 + shadcn-svelte inicializado · Drizzle ORM +
better-sqlite3 (metadata) · archiver (zip en modo *store*, sin comprimir) · adapter-node + pm2 +
nginx (repo `nx-routes`).

## Dev

```bash
npm install
npm run db:migrate   # crea local.db con las migraciones de ./drizzle
npm run dev          # http://localhost:4500 (mismo puerto que en el droplet)
```

La clave de dev es la `UPLOAD_PASSWORD` del `.env` local. Si cambias el schema
(`src/lib/server/db/schema.ts`): `npm run db:generate` y commitea `./drizzle`.

## Deploy

Push a `main` → la GitHub Action (`.github/workflows/deploy.yml`) entra por SSH al droplet y
hace: pull → `npm ci` → `npm run db:migrate` → `npm run build` → `pm2 start build/index.js`.
Las variables del servidor están documentadas en `.env.example` (`.env` se arma a mano en
`~/code/transfiere/`). El bloque nginx es el archivo `transfiere.moibe.me` del repo `nx-routes`.

## Dónde viven los datos

- `local.db` — metadata de transferencias y archivos (SQLite).
- `data/<transferId>/<fileId>` — los bytes de cada archivo.

Los dos están gitignoreados; en el droplet persisten entre deploys porque el repo se reusa.
