# 🎵 Blind Test - Application de Quiz Musical

Application web complete pour creer et jouer a des blind tests musicaux avec import automatique depuis YouTube et mode multijoueur en temps reel.

## 📋 Table des matieres

- [Vue d'ensemble](#-vue-densemble)
- [Stack technique](#-stack-technique)
- [Architecture](#-architecture)
- [Fonctionnalites](#-fonctionnalites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Deploiement](#-deploiement)
- [Utilisation](#-utilisation)
- [Maintenance](#-maintenance)
- [Depannage](#-depannage)
- [Couts estimes](#-couts-estimes-production)
- [Contribution](#-contribution)
- [Licence](#-licence)
- [Remerciements](#-remerciements)
- [Contact](#-contact)

---

## 🎯 Vue d'ensemble

Cette application permet de :
- ✅ Creer des univers et oeuvres thematiques (Harry Potter, Star Wars, etc.)
- ✅ Importer automatiquement des playlists YouTube completes
- ✅ Telecharger et convertir les audios en MP3 (128kbps)
- ✅ Jouer a des blind tests solo ou multijoueur en temps reel
- ✅ Gerer un dashboard administrateur complet
- ✅ Authentification utilisateur avec Firebase (Google Sign-In)

**Architecture microservices :**
- **Frontend** : Next.js 15 heberge sur Vercel
- **Backend Ingestion** : Service Express.js sur TrueNAS (NAS perso) via Cloudflare Tunnel
- **Multiplayer** : PartyKit Cloud (WebSocket temps reel)
- **Base de donnees** : Firestore (NoSQL temps reel)
- **Stockage audio** : Cloudflare R2 (S3-compatible)
- **Monitoring** : UptimeRobot
- **Packages partages** : shared-types + shared-utils (web / party / ingestion)

---

## 🛠 Stack technique

### Frontend (Vercel)

| Technologie | Version | Usage |
|-------------|---------|-------|
| **Next.js** | 15.x | Framework React (App Router) |
| **React** | 19.x | Bibliotheque UI |
| **TypeScript** | 5.x | Typage statique |
| **Tailwind CSS** | 4.x | Styling |
| **Radix UI** | - | Composants UI (Dialog, etc.) |
| **Firebase SDK** | 11.x | Authentication + Firestore |
| **TanStack Query** | 5.x | Cache et requetes |
| **Framer Motion** | 12.x | Animations |
| **Zod** | 4.x | Validation de schemas |
| **React Hook Form** | 7.x | Gestion de formulaires |
| **PartySocket** | 1.x | Client WebSocket PartyKit |
| **Zustand** | 5.x | State management |

### Backend Ingestion (TrueNAS + Docker)

| Technologie | Version | Usage |
|-------------|---------|-------|
| **Node.js** | 20.x | Runtime JavaScript |
| **Express.js** | 4.x | Serveur HTTP |
| **TypeScript** | 5.x | Typage statique |
| **BullMQ** | 5.x | Queue d'import |
| **Redis** | - | Backend de queue |
| **yt-dlp** | Latest | Telechargement YouTube |
| **FFmpeg** | Latest | Conversion audio |
| **@aws-sdk/client-s3** | 3.x | Upload Cloudflare R2 |
| **Firebase Admin** | 13.x | Ecriture Firestore |

### Multiplayer (PartyKit Cloud)

| Technologie | Version | Usage |
|-------------|---------|-------|
| **PartyKit** | 0.0.115 | Serveur WebSocket |
| **XState** | 5.x | State machine (game logic) |
| **Zod** | 4.x | Validation |

### Services Cloud

| Service | Usage | Plan |
|---------|-------|------|
| **Vercel** | Hebergement frontend | Hobby (gratuit) |
| **PartyKit Cloud** | WebSocket multiplayer | Gratuit |
| **TrueNAS** | Service d'ingestion (Docker) | Self-hosted |
| **Cloudflare Tunnel** | Exposition securisee du NAS | Gratuit |
| **Firebase/Firestore** | Base de donnees + Auth | Spark (gratuit) |
| **Cloudflare R2** | Stockage MP3 | Pay-as-you-go |
| **YouTube Data API v3** | Metadonnees playlists | Gratuit (quota) |
| **UptimeRobot** | Monitoring uptime | Gratuit |

---

## 🏗 Architecture

```
+---------------------------+           +-----------------------------------+
|        UTILISATEUR        |           |   PARTYKIT CLOUD (Multiplayer)    |
|       (Navigateur)        |           |   WebSocket rooms + lobby         |
+-------------+-------------+           +-----------------------------------+
              | HTTP/WS
              v
+---------------------------+
|        VERCEL (Web)       |
|  Next.js App + API routes |
+-------------+-------------+
              |
              | Proxy API
              v
+---------------------------+
|  CLOUDFLARE TUNNEL         |
|  ingestion.votre-domaine  |
+-------------+-------------+
              |
              v
+---------------------------+
|     TRUENAS (Self-hosted) |
|  Express + BullMQ worker  |
|  yt-dlp -> ffmpeg -> R2   |
+-------------+-------------+
      |            |
      v            v
+-----------+  +------------------+
| YouTube   |  | Cloudflare R2     |
| API       |  | Audio storage     |
+-----------+  +------------------+
      |
      v
+---------------------------+
| Firebase (Auth + Firestore)|
+---------------------------+
```

### Structure du repo
```
blind-test/
  src/                         # Next.js app (App Router)
  party/                       # PartyKit server
  ingestion-service/           # Express ingestion service
  packages/
    shared-types/              # Zod schemas + TS types
    shared-utils/              # Shared helpers (game rounds, etc.)
```

### Architecture front (feature-first)
```
src/features/
  admin/
  audio-player/
  game-ui/
  home/
  multiplayer-game/
  scores/
  solo-game/
src/components/ui/             # UI generiques re-utilisables
```

### Flux d'import de playlist

```
1. Admin colle URL YouTube playlist
   -> frontend valide via YouTube API
2. Frontend appelle /api/audio/import-playlist
   -> ingestion ajoute un job (BullMQ) et retourne jobId
3. Frontend poll /api/audio/import-playlist/status
   -> ingestion telecharge + convertit (yt-dlp + ffmpeg)
   -> upload vers Cloudflare R2
4. Frontend enregistre les songs dans Firestore
5. UI affiche les chansons et l'import est pret
```

### Flux multijoueur

```
1. Host cree une room via PartyKit
2. Joueurs rejoignent avec code room
3. Etat synchronise en temps reel (players, scores, song, state)
```

---

## ✨ Fonctionnalites

### 🎮 Mode Jeu Solo
- Lecture aleatoire des chansons d'une oeuvre
- Systeme de points (rapide = plus de points)
- Timer par chanson
- Revelation progressive des reponses
- Score final

### 👥 Mode Multijoueur
- Creation de rooms avec code unique
- Synchronisation temps reel (WebSocket)
- Lobby avec liste des joueurs
- Scores en direct
- Host controls (start, skip, etc.)

### 👨‍💼 Dashboard Admin
- Gestion des univers (creer, modifier, supprimer)
- Gestion des oeuvres par univers
- Import automatique de playlists YouTube
- Gestion des chansons (edition, suppression)
- Previsualisation audio avant suppression
- Drag & drop pour reordonner

### 🔐 Authentification
- Google Sign-In (Firebase Auth)
- Protection des routes admin
- Acces admin filtre via NEXT_PUBLIC_ADMIN_EMAIL

### 🎵 Import YouTube
- Support des playlists publiques YouTube
- Validation automatique de la playlist
- Telechargement parallele (configurable)
- Conversion MP3 de qualite (128kbps)
- Stockage cloud avec CDN
- Rate limiting integre (evite les blocages)
- Support cookies YouTube (backup anti-bot)

---

## 🚀 Installation

### Prerequis

- **Node.js** >= 20.x
- **npm** ou **pnpm**
- **Git** pour cloner le projet
- **Compte Firebase** (console.firebase.google.com)
- **Compte Cloudflare** (dash.cloudflare.com)
- **Compte PartyKit** (partykit.io)
- **Cle YouTube API** (console.cloud.google.com)
- **TrueNAS ou serveur Docker** (pour l'ingestion)
- **Redis** (queue ingestion)

### 1. Clone du projet

```bash
git clone https://github.com/YannisFouzi/blind-test.git
cd blind-test
```

### 2. Installation Frontend

```bash
# Installer les dependances
npm install
# ou
pnpm install
```

### 3. Installation Backend Ingestion

```bash
cd ingestion-service
npm install
# ou
pnpm install
```

---

## ⚙️ Configuration

### Variables d'environnement Frontend (Vercel)

Creez `.env.local` a la racine ou configurez dans Vercel Dashboard :

```env
# Firebase (obligatoire)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...

# Admin (allowlist email)
NEXT_PUBLIC_ADMIN_EMAIL=votre-email@example.com

# YouTube API (utilise cote serveur via routes Next)
YOUTUBE_API_KEY=...

# Ingestion (self-hosted)
INGESTION_SERVICE_URL=https://ingestion.votre-domaine.fr
INGESTION_SERVICE_TOKEN=token-optionnel
NEXT_PUBLIC_INGESTION_TIMEOUT_MINUTES=5

# PartyKit (multiplayer)
NEXT_PUBLIC_PARTYKIT_HOST=blind-test-party.votre-user.partykit.dev
PARTYKIT_LOBBY_TOKEN=token-interne-fort
PARTYKIT_ALLOWED_ORIGINS=https://votre-domaine.fr,https://www.votre-domaine.fr
PARTYKIT_LOBBY_REQUIRE_AUTH=true
# Laisser a false sauf operation interne exceptionnelle
PARTYKIT_LOBBY_ENABLE_DELETE=false
```

### Variables d'environnement Backend Ingestion (TrueNAS)

Creez `.env.production` dans le dossier `ingestion-service/` sur le NAS :

```env
# Server
NODE_ENV=production
PORT=4000

# YouTube API
YOUTUBE_API_KEY=...

# Cloudflare R2 (obligatoire)
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=blind-test-audio
R2_PUBLIC_BASE_URL=https://pub-xxxxx.r2.dev

# Firebase Admin (ecriture Firestore)
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...

# Redis (queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Performance
INGESTION_CONCURRENCY=2  # Recommande: 1-2 pour eviter rate limiting

# yt-dlp (optionnel)
YT_DLP_PATH=
YT_DLP_PLAYER_CLIENTS=
YT_DLP_PO_TOKEN=
```

Notes:
- `INGESTION_SERVICE_TOKEN` est transmis par le web et verifie par l'ingestion-service.
- `INGESTION_REQUIRE_AUTH=false` peut desactiver l'auth en local uniquement (dev).
- `NEXT_PUBLIC_PARTYKIT_HOST` est optionnel en local (par defaut 127.0.0.1:1999).
- `PARTYKIT_LOBBY_TOKEN` protege les ecritures lobby (POST/DELETE).
- `PARTYKIT_ALLOWED_ORIGINS` restreint CORS pour le lobby.

### Configuration Cloudflare R2

1. **Creer un bucket R2**
   - Dashboard -> R2 -> Create bucket
   - Nom: blind-test-audio

2. **Generer les cles API**
   - R2 -> Manage R2 API Tokens -> Create API Token
   - Permissions: Object Read & Write
   - Copiez: Access Key ID + Secret Access Key

3. **Configurer CORS**
   ```json
   [
     {
       "AllowedOrigins": ["*"],
       "AllowedMethods": ["GET", "HEAD"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

4. **Activer l'acces public**
   - Bucket Settings -> Public Access -> Allow
   - Copiez l'URL publique: https://pub-xxxxx.r2.dev

### Configuration Firebase

1. **Creer un projet Firebase**
   - Firebase Console -> Ajouter un projet

2. **Activer Firestore**
   - Build -> Firestore Database -> Create database
   - Mode: Production

3. **Regles Firestore (exemple simple)**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```

4. **Activer Authentication**
   - Build -> Authentication -> Get started
   - Activez **Google** (provider)

### Configuration YouTube API

1. **Creer un projet Google Cloud**
   - console.cloud.google.com -> Nouveau projet

2. **Activer YouTube Data API v3**
   - APIs & Services -> Enable APIs and Services

3. **Creer une cle API**
   - Credentials -> Create Credentials -> API Key

4. **Limites de quota**
   - Quota gratuit: 10,000 unites/jour
   - Import playlist (20 videos) ≈ 51 unites

### Configuration PartyKit

1. **Creer un compte PartyKit**
   - partykit.io

2. **Deployer**
   ```bash
   npx partykit deploy
   ```

3. **Recuperer l'URL**
   ```bash
   npx partykit list
   ```

---

## 🚀 Deploiement

### Frontend sur Vercel

1. Push sur GitHub
2. Deploy sur Vercel (import du repo)
3. Configurer les env vars frontend

### PartyKit sur PartyKit Cloud

```bash
npm run deploy:partykit
```

### Backend Ingestion sur TrueNAS

1. **Preparer le NAS**
   ```bash
   ssh root@votre-truenas-ip
   mkdir -p /mnt/votre-pool/appdata/blind-test-ingestion
   cd /mnt/votre-pool/appdata/blind-test-ingestion
   ```

2. **Copier les fichiers**
   ```bash
   scp -r ingestion-service/* root@truenas-ip:/mnt/votre-pool/appdata/blind-test-ingestion/
   scp ingestion-service/.env.production root@truenas-ip:/mnt/votre-pool/appdata/blind-test-ingestion/
   ```

3. **Creer docker-compose.yml**
   ```yaml
   version: '3.8'
   services:
     ingestion:
       build: .
       container_name: blind-test-ingestion
       restart: unless-stopped
       ports:
         - "4000:4000"
       env_file:
         - .env.production
       volumes:
         - ./temp:/app/temp
         - ./cookies:/app/cookies
   ```

4. **Build et lancer**
   ```bash
   docker-compose up -d --build
   ```

5. **Verifier**
   ```bash
   curl http://localhost:4000/health
   # -> {"status":"ok"}
   ```

### Cloudflare Tunnel

1. **Installer cloudflared**
   ```bash
   wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
   chmod +x cloudflared-linux-amd64
   mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
   ```

2. **Authentifier et creer le tunnel**
   ```bash
   cloudflared tunnel login
   cloudflared tunnel create blind-test-ingestion
   ```

3. **Configurer**
   ```bash
   nano ~/.cloudflared/config.yml
   ```

   ```yaml
   tunnel: VOTRE_TUNNEL_ID
   credentials-file: /root/.cloudflared/VOTRE_TUNNEL_ID.json

   ingress:
     - hostname: ingestion.votre-domaine.fr
       service: http://localhost:4000
     - service: http_status:404
   ```

4. **Creer l'enregistrement DNS et lancer**
   ```bash
   cloudflared tunnel route dns blind-test-ingestion ingestion.votre-domaine.fr
   cloudflared service install
   cloudflared service start
   ```

### Monitoring (UptimeRobot)

1. Creer un compte sur uptimerobot.com
2. Add New Monitor:
   - Type: HTTP(s)
   - URL: https://ingestion.votre-domaine.fr/health
   - Interval: 5 minutes

---

## 💻 Utilisation

### Developpement local

#### Frontend
```bash
npm run dev
# -> http://localhost:3000
```

#### PartyKit (en parallele)
```bash
npm run dev:partykit
# -> http://localhost:1999
```

#### Backend Ingestion (optionnel)
```bash
cd ingestion-service
npm run dev
# -> http://localhost:4000
```

### Commandes utiles

```bash
# Linter
npm run lint

# Build de production
npm run build
npm run start

# Deployer PartyKit
npm run deploy:partykit

# Tests
npm run test
npm run test:watch
npm run test:coverage
npm run test:e2e
npm run test:e2e:ui
```

### Workflow admin

1. **Creer un univers**
2. **Creer une oeuvre avec import playlist**
3. **Lancer un jeu** (solo ou multi)

---

## 🔧 Maintenance

### Mise a jour du service d'ingestion

```bash
ssh root@truenas-ip
cd /mnt/votre-pool/appdata/blind-test-ingestion
# Si vous utilisez git
# git pull
# Puis
docker-compose up -d --build
```

### Mise a jour des cookies YouTube (si blocage)

1. Exporter cookies.txt depuis le navigateur
2. Upload via API:
   - POST /api/admin/upload-cookies
   - form-data: field `cookies`

Alternative: copier manuellement sur le NAS:
```bash
scp cookies.txt root@truenas-ip:/mnt/votre-pool/appdata/blind-test-ingestion/cookies/
```

### Logs et debugging

```bash
# Logs du container
docker logs -f blind-test-ingestion

# Status du tunnel Cloudflare
systemctl status cloudflared

# Health check
curl https://ingestion.votre-domaine.fr/health
```

---

## 🐛 Depannage

### Erreurs courantes

#### ❌ "Configuration Firebase manquante"
**Solution :** verifier les variables NEXT_PUBLIC_FIREBASE_* dans Vercel

#### ❌ Import YouTube echoue
**Causes possibles :**
- Quota YouTube API depasse -> attendre 24h
- YouTube bloque yt-dlp -> mettre a jour les cookies
- Service ingestion down -> verifier UptimeRobot / logs

**Debug :**
```bash
curl https://ingestion.votre-domaine.fr/health
```

#### ❌ "Sign in to confirm you're not a bot"
**Cause :** YouTube detecte un bot
**Solution :** mettre a jour les cookies (voir Maintenance)

#### ❌ PartyKit ne se connecte pas
**Verifiez :**
1. NEXT_PUBLIC_PARTYKIT_HOST
2. partykit deploy

### Performance

#### Optimiser la vitesse d'import

```env
# Dans .env.production sur TrueNAS
INGESTION_CONCURRENCY=2
```

Trade-offs:
- Plus eleve = plus rapide
- Mais risque accru de rate limiting YouTube
- Recommandation: 1-2 pour stabilite

---

## 📊 Couts estimes (production)

| Service | Plan | Cout estime/mois |
|---------|------|------------------|
| Vercel | Hobby | Gratuit |
| PartyKit | Free | Gratuit |
| TrueNAS | Self-hosted | 0€ (electricite) |
| Cloudflare Tunnel | Free | Gratuit |
| Cloudflare R2 | Pay-as-you-go | ~$0.15 pour 10GB |
| Firebase | Spark | Gratuit |
| YouTube API | Gratuit | Gratuit |
| UptimeRobot | Free | Gratuit |

**Total estime : ~$0-1/mois** (principalement stockage R2)

---

## 🤝 Contribution

Les contributions sont les bienvenues !

1. Fork le projet
2. Creer une branche (git checkout -b feature/amazing-feature)
3. Commit (git commit -m "Add amazing feature")
4. Push (git push origin feature/amazing-feature)
5. Ouvrir une Pull Request

---

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier LICENSE pour plus de details.

---

## 🙏 Remerciements

- Next.js - Framework React
- PartyKit - WebSocket infrastructure
- Firebase - Backend as a Service
- Cloudflare R2 - Stockage objet
- Cloudflare Tunnel - Secure tunneling
- yt-dlp - Telechargement YouTube

---

## 📧 Contact

**Yannis Fouzi** - yfouzi.dev@gmail.com

**Repository** : https://github.com/YannisFouzi/blind-test

**App** : https://blind-test-brown.vercel.app

---

**Made with ❤️ by Yannis Fouzi**
