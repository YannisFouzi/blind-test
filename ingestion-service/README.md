## Ingestion Service (Cloudflare + YouTube)

Petit serveur Express prêt à déployer sur Railway (ou autre) qui :

1. Reçoit un `playlistId` YouTube et un `workId`.
2. Récupère les métadonnées de la playlist via l’API YouTube.
3. Télécharge chaque piste (`ytdl-core`) puis la convertit en MP3 128 kbps (`fluent-ffmpeg`).
4. Envoie les MP3 dans Cloudflare R2 (S3 compatible) et renvoie les URLs publiques.

### Configuration

Créer un fichier `.env` (voir `.env.example`) avec :

```
PORT=4000
YOUTUBE_API_KEY=...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
R2_PUBLIC_BASE_URL=https://<bucket>.<account>.r2.cloudflarestorage.com
INGESTION_CONCURRENCY=2
```

Déployer sur Railway :

```
cd ingestion-service
npm install
npm run build
npm start
```

Le Next app appelle ensuite ce service via `/api/audio/import-playlist` (proxy côté serveur avec `INGESTION_SERVICE_URL` et `INGESTION_SERVICE_TOKEN`).***
