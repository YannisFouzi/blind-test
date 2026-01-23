# 🎵 Blind Test - Application de Quiz Musical

Application web complète pour créer et jouer à des blind tests musicaux avec import automatique depuis YouTube et mode multijoueur en temps réel.

## 📋 Table des matières

- [Vue d'ensemble](#-vue-densemble)
- [Stack technique](#-stack-technique)
- [Architecture](#-architecture)
- [Fonctionnalités](#-fonctionnalités)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Déploiement](#-déploiement)
- [Utilisation](#-utilisation)
- [Maintenance](#-maintenance)
- [Dépannage](#-dépannage)

---

## 🎯 Vue d'ensemble

Cette application permet de :
- ✅ Créer des univers et œuvres thématiques (Harry Potter, Star Wars, etc.)
- ✅ Importer automatiquement des playlists YouTube complètes
- ✅ Télécharger et convertir les audios en MP3 (128kbps)
- ✅ Jouer à des blind tests solo ou **multijoueur en temps réel**
- ✅ Gérer un dashboard administrateur complet
- ✅ Authentification utilisateur avec Firebase

**Architecture microservices :**
- **Frontend** : Next.js 15 hébergé sur Vercel
- **Backend Ingestion** : Service Express.js sur TrueNAS (IP résidentielle) via Cloudflare Tunnel
- **Multiplayer** : PartyKit Cloud (WebSocket temps réel)
- **Base de données** : Firestore (NoSQL temps réel)
- **Stockage audio** : Cloudflare R2 (S3-compatible)
- **Monitoring** : UptimeRobot

---

## 🛠 Stack technique

### Frontend (Vercel)

| Technologie | Version | Usage |
|-------------|---------|-------|
| **Next.js** | 15.x | Framework React (App Router) |
| **React** | 19.x | Bibliothèque UI |
| **TypeScript** | 5.x | Typage statique |
| **Tailwind CSS** | 4.x | Styling |
| **shadcn/ui** | - | Composants UI (Radix UI) |
| **Firebase SDK** | 11.x | Authentication + Firestore |
| **TanStack Query** | 5.x | Gestion du cache et requêtes |
| **Framer Motion** | 12.x | Animations |
| **Zod** | 4.x | Validation de schémas |
| **React Hook Form** | 7.x | Gestion de formulaires |
| **PartySocket** | 1.x | Client WebSocket PartyKit |

### Backend Ingestion (TrueNAS + Docker)

| Technologie | Version | Usage |
|-------------|---------|-------|
| **Node.js** | 20.x | Runtime JavaScript |
| **Express.js** | 4.x | Serveur HTTP |
| **TypeScript** | 5.x | Typage statique |
| **yt-dlp** | Latest | Téléchargement YouTube |
| **FFmpeg** | Latest | Conversion audio |
| **@aws-sdk/client-s3** | 3.x | Upload Cloudflare R2 |
| **Docker** | Latest | Conteneurisation |

### Multiplayer (PartyKit Cloud)

| Technologie | Version | Usage |
|-------------|---------|-------|
| **PartyKit** | 0.0.115 | Serveur WebSocket |
| **XState** | 5.x | State machine (game logic) |

### Services Cloud

| Service | Usage | Plan |
|---------|-------|------|
| **Vercel** | Hébergement frontend | Hobby (gratuit) |
| **PartyKit Cloud** | WebSocket multiplayer | Gratuit |
| **TrueNAS** | Service d'ingestion (Docker) | Self-hosted (0€) |
| **Cloudflare Tunnel** | Exposition sécurisée du NAS | Gratuit |
| **Firebase/Firestore** | Base de données NoSQL + Auth | Spark (gratuit) |
| **Cloudflare R2** | Stockage MP3 | Pay-as-you-go (~$0.015/GB) |
| **YouTube Data API v3** | Métadonnées playlists | Gratuit (10,000 unités/jour) |
| **UptimeRobot** | Monitoring uptime | Gratuit |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         UTILISATEUR                             │
│                    (Navigateur Web)                             │
└──────────┬─────────────────────┬────────────────────────────────┘
           │                     │
           │ HTTP/WS             │ WebSocket
           ↓                     ↓
┌─────────────────────┐  ┌─────────────────────────────────────────┐
│   VERCEL (Frontend) │  │        PARTYKIT CLOUD (Multiplayer)     │
│  blind-test-brown   │  │  blind-test-party.yannisfouzi.partykit  │
│    .vercel.app      │  │                .dev                     │
├─────────────────────┤  ├─────────────────────────────────────────┤
│ Next.js 15 App      │  │ WebSocket Server                        │
│ - Pages             │  │ - Game rooms (real-time sync)           │
│ - API Routes        │  │ - Lobby management                      │
│ - React Components  │  │ - Player state                          │
└────────┬────────────┘  └─────────────────────────────────────────┘
         │
         │ Proxy API
         ↓
┌─────────────────────────────────────────────────────────────────┐
│              CLOUDFLARE TUNNEL (ingestion.fouzi-dev.fr)         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    TRUENAS (Self-hosted)                        │
│                    IP Résidentielle                             │
├─────────────────────────────────────────────────────────────────┤
│  Docker: blind-test-ingestion                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Express.js API (:4000)                                   │   │
│  │                                                          │   │
│  │ yt-dlp ──→ FFmpeg ──→ R2 SDK                            │   │
│  │ (Download)  (Convert)  (Upload)                          │   │
│  │                                                          │   │
│  │ /app/cookies/cookies.txt (YouTube auth backup)           │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
         │                      │                  │
         │                      │ Auth             │ Storage
         ↓                      ↓                  ↓
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ YOUTUBE API      │  │ FIREBASE         │  │ CLOUDFLARE R2    │
│ (Metadata)       │  │ (Auth+Firestore) │  │ (Audio Storage)  │
├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│ Playlist info    │  │ Authentication   │  │ MP3 Files        │
│ Video metadata   │  │ Firestore DB:    │  │ Public URLs      │
│                  │  │ - universes      │  │ CORS Enabled     │
│                  │  │ - works          │  │                  │
│                  │  │ - songs          │  │ Organized by:    │
│                  │  │ - users          │  │ /workId/videoId  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

### Flux d'import de playlist

```
1. Admin colle URL YouTube playlist
   ↓
2. Frontend valide via YouTube API (métadonnées)
   ↓
3. Admin clique "Créer et importer"
   ↓
4. Frontend crée Work dans Firestore
   ↓
5. Frontend appelle TrueNAS via Cloudflare Tunnel
   (/api/audio/import-playlist → ingestion.fouzi-dev.fr)
   ↓
6. TrueNAS récupère liste vidéos (YouTube API)
   ↓
7. Pour chaque vidéo (concurrency configurable):
   - yt-dlp télécharge audio (WebM/M4A)
   - FFmpeg convertit → MP3 128kbps
   - Upload vers Cloudflare R2
   ↓
8. TrueNAS retourne songs[] avec audioUrl
   ↓
9. Frontend sauvegarde songs dans Firestore
   ↓
10. UI affiche les chansons + Ready to play!
```

### Flux multijoueur

```
1. Host crée une room via PartyKit
   ↓
2. Joueurs rejoignent avec code room
   ↓
3. PartyKit synchronise l'état en temps réel:
   - Liste des joueurs
   - État du jeu (waiting, playing, finished)
   - Scores
   - Chanson actuelle
   ↓
4. Tous les clients reçoivent les updates instantanément
```

---

## ✨ Fonctionnalités

### 🎮 Mode Jeu Solo
- Lecture aléatoire des chansons d'une œuvre
- Système de points (rapide = plus de points)
- Timer par chanson
- Révélation progressive des réponses
- Score final

### 👥 Mode Multijoueur
- Création de rooms avec code unique
- Synchronisation temps réel (WebSocket)
- Lobby avec liste des joueurs
- Scores en direct
- Host controls (start, skip, etc.)

### 👨‍💼 Dashboard Admin
- Gestion des univers (créer, modifier, supprimer)
- Gestion des œuvres par univers
- Import automatique de playlists YouTube
- Gestion des chansons (édition, suppression)
- Prévisualisation audio avant suppression
- Drag & drop pour réordonner

### 🔐 Authentification
- Login/Register avec Firebase Auth
- Protection des routes admin
- Gestion des sessions utilisateur

### 🎵 Import YouTube
- Support des playlists publiques YouTube
- Validation automatique de la playlist
- Téléchargement parallèle (configurable)
- Conversion MP3 de qualité (128kbps)
- Stockage cloud avec CDN
- Rate limiting intégré (évite les blocages)
- Support cookies YouTube (backup anti-bot)

---

## 🚀 Installation

### Prérequis

- **Node.js** ≥ 20.x ([Télécharger](https://nodejs.org/))
- **npm** ou **pnpm** (gestionnaire de paquets)
- **Git** pour cloner le projet
- **Compte Firebase** ([Créer](https://console.firebase.google.com/))
- **Compte Cloudflare** ([Créer](https://dash.cloudflare.com/))
- **Compte PartyKit** ([Créer](https://partykit.io/))
- **Clé YouTube API** ([Obtenir](https://console.cloud.google.com/))
- **TrueNAS ou serveur Docker** (pour l'ingestion)

### 1. Clone du projet

```bash
git clone https://github.com/YannisFouzi/blind-test.git
cd blind-test
```

### 2. Installation Frontend

```bash
# Installer les dépendances
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

Créez `.env.local` à la racine ou configurez dans Vercel Dashboard :

```env
# Firebase Configuration (obligatoire)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=blindtest-xxxxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=blindtest-xxxxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=blindtest-xxxxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:xxxxx
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# YouTube API (obligatoire - côté serveur uniquement)
YOUTUBE_API_KEY=AIzaSyBDLfbqqp8iQNw4...

# Admin Configuration
ADMIN_EMAIL=votre-email@example.com
NEXT_PUBLIC_ADMIN_EMAIL=votre-email@example.com

# Ingestion Service (TrueNAS via Cloudflare Tunnel)
INGESTION_SERVICE_URL=https://ingestion.fouzi-dev.fr
COOKIE_UPLOAD_TOKEN=votre-token-securise  # Optionnel, pour upload cookies

# PartyKit (Multiplayer)
NEXT_PUBLIC_PARTYKIT_HOST=blind-test-party.yannisfouzi.partykit.dev

# App URL
APP_BASE_URL=https://blind-test-brown.vercel.app
```

### Variables d'environnement Backend Ingestion (TrueNAS)

Créez `.env.production` dans le dossier `ingestion-service/` sur le NAS :

```env
# Server
NODE_ENV=production
PORT=4000

# YouTube API
YOUTUBE_API_KEY=AIzaSyBDLfbqqp8iQNw4...

# Cloudflare R2 (obligatoire)
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=blind-test-audio
R2_PUBLIC_BASE_URL=https://pub-xxxxx.r2.dev

# Performance
INGESTION_CONCURRENCY=1  # Recommandé: 1-2 pour éviter rate limiting

# Security (optionnel)
COOKIE_UPLOAD_TOKEN=votre-token-securise
```

### Configuration Cloudflare R2

1. **Créer un bucket R2**
   ```
   Dashboard → R2 → Create bucket
   Nom: blind-test-audio
   ```

2. **Générer les clés API**
   ```
   R2 → Manage R2 API Tokens → Create API Token
   Permissions: Object Read & Write
   Copiez: Access Key ID + Secret Access Key
   ```

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

4. **Activer l'accès public**
   ```
   Bucket Settings → Public Access → Allow
   Copiez l'URL publique: https://pub-xxxxx.r2.dev
   ```

### Configuration Firebase

1. **Créer un projet Firebase**
   - Allez sur [Firebase Console](https://console.firebase.google.com/)
   - Cliquez sur "Ajouter un projet"

2. **Activer Firestore**
   ```
   Console Firebase → Build → Firestore Database → Create database
   Mode: Production
   Region: europe-west
   ```

3. **Règles de sécurité Firestore**
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
   ```
   Console Firebase → Build → Authentication → Get started
   Activez: Email/Password
   ```

### Configuration YouTube API

1. **Créer un projet Google Cloud**
   - [Google Cloud Console](https://console.cloud.google.com/)
   - Nouveau projet → "Blind Test App"

2. **Activer YouTube Data API v3**
   ```
   APIs & Services → Enable APIs and Services
   Recherchez "YouTube Data API v3" → Enable
   ```

3. **Créer une clé API**
   ```
   APIs & Services → Credentials → Create Credentials → API Key
   ```

4. **Limites de quota**
   - Quota gratuit : **10,000 unités/jour**
   - Import playlist (20 vidéos) ≈ **51 unités**
   - Capacité : ~**200 imports/jour** gratuits

### Configuration PartyKit

1. **Créer un compte PartyKit**
   - Allez sur [partykit.io](https://partykit.io/)
   - Connectez-vous avec GitHub

2. **Déployer**
   ```bash
   npx partykit deploy
   ```

3. **Récupérer l'URL**
   ```bash
   npx partykit list
   # → https://blind-test-party.votre-user.partykit.dev
   ```

---

## 🚀 Déploiement

### Frontend sur Vercel

1. **Push sur GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Déployer sur Vercel**
   - Allez sur [Vercel](https://vercel.com/)
   - New Project → Import from GitHub
   - Sélectionnez le repo `blind-test`

3. **Configurer les variables d'environnement**
   ```
   Settings → Environment Variables
   Ajoutez TOUTES les variables listées ci-dessus
   ```

### PartyKit sur PartyKit Cloud

```bash
# Déploiement automatique
npx partykit deploy

# Le déploiement se fait aussi automatiquement avec Vercel si configuré
```

### Backend Ingestion sur TrueNAS

#### 1. Préparer le NAS

```bash
ssh root@votre-truenas-ip

# Créer le dossier
mkdir -p /mnt/votre-pool/appdata/blind-test-ingestion
cd /mnt/votre-pool/appdata/blind-test-ingestion
```

#### 2. Copier les fichiers

```bash
# Depuis votre machine locale
scp -r ingestion-service/* root@truenas-ip:/mnt/votre-pool/appdata/blind-test-ingestion/
scp ingestion-service/.env.production root@truenas-ip:/mnt/votre-pool/appdata/blind-test-ingestion/
```

#### 3. Créer docker-compose.yml

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

#### 4. Build et lancer

```bash
docker-compose up -d --build
```

#### 5. Vérifier

```bash
docker ps | grep blind-test
curl http://localhost:4000/health
# → {"status":"ok"}
```

### Cloudflare Tunnel

#### 1. Installer cloudflared

```bash
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
```

#### 2. Authentifier et créer le tunnel

```bash
cloudflared tunnel login
cloudflared tunnel create blind-test-ingestion
```

#### 3. Configurer

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

#### 4. Créer l'enregistrement DNS et lancer

```bash
cloudflared tunnel route dns blind-test-ingestion ingestion.votre-domaine.fr
cloudflared service install
cloudflared service start
```

### Monitoring (UptimeRobot)

1. Créez un compte sur [uptimerobot.com](https://uptimerobot.com/)
2. Add New Monitor :
   - Type: HTTP(s)
   - URL: `https://ingestion.votre-domaine.fr/health`
   - Interval: 5 minutes
3. Configurez les alertes email

---

## 💻 Utilisation

### Développement local

#### Frontend
```bash
npm run dev
# → http://localhost:3000
```

#### PartyKit (en parallèle)
```bash
npm run dev:partykit
# → http://localhost:1999
```

#### Backend Ingestion (optionnel)
```bash
cd ingestion-service
npm run dev
# → http://localhost:4000
```

### Commandes utiles

```bash
# Linter
npm run lint

# Build de production
npm run build
npm run start

# Déployer PartyKit
npm run deploy:partykit

# TypeScript check
npx tsc --noEmit
```

### Workflow admin

1. **Créer un univers**
   ```
   Dashboard → Créer un univers
   Nom: "Harry Potter"
   Description: "Musiques des films Harry Potter"
   ```

2. **Créer une œuvre avec import**
   ```
   Dashboard → Univers → Créer une œuvre
   Titre: "Harry Potter à l'école des sorciers"
   URL playlist: https://www.youtube.com/playlist?list=PL...
   Cliquez "Créer et importer"
   ```

3. **Jouer**
   ```
   Page d'accueil → Sélectionner univers → Sélectionner œuvre → Play!
   ```

4. **Mode multijoueur**
   ```
   Créer une room → Partager le code → Attendre les joueurs → Start!
   ```

---

## 🔧 Maintenance

### Mise à jour du service d'ingestion

```bash
ssh root@truenas-ip
cd /mnt/votre-pool/appdata/blind-test-ingestion
git pull  # Si vous utilisez git
docker-compose up -d --build
```

### Mise à jour des cookies YouTube (si blocage)

Si YouTube bloque les téléchargements (rare avec IP résidentielle) :

1. **Exporter les cookies** depuis votre navigateur :
   - Installez l'extension "Get cookies.txt LOCALLY" (Chrome/Edge)
   - Connectez-vous à YouTube
   - Exportez cookies.txt

2. **Copier vers le NAS** :
   ```bash
   scp cookies.txt root@truenas-ip:/mnt/votre-pool/appdata/blind-test-ingestion/cookies/
   ```

3. **Pas besoin de redémarrer** - yt-dlp relit le fichier à chaque téléchargement

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

## 🐛 Dépannage

### Erreurs courantes

#### ❌ "Configuration Firebase manquante"
**Solution :** Vérifiez les variables `NEXT_PUBLIC_FIREBASE_*` dans Vercel

#### ❌ Import YouTube échoue
**Causes possibles :**
- Quota YouTube API dépassé → Attendez 24h
- YouTube bloque yt-dlp → Mettez à jour les cookies
- Service d'ingestion down → Vérifiez UptimeRobot/logs

**Debug :**
```bash
# Vérifier le service
curl https://ingestion.votre-domaine.fr/health

# Voir les logs
docker logs --tail 100 blind-test-ingestion
```

#### ❌ "Sign in to confirm you're not a bot"
**Cause :** YouTube détecte un bot
**Solution :** Mettez à jour les cookies (voir section Maintenance)

#### ❌ PartyKit ne se connecte pas
**Vérifiez :**
1. `NEXT_PUBLIC_PARTYKIT_HOST` est correctement configuré
2. PartyKit est déployé : `npx partykit list`

#### ❌ Tunnel Cloudflare down
```bash
# Vérifier le status
systemctl status cloudflared

# Redémarrer
systemctl restart cloudflared

# Voir les logs
journalctl -u cloudflared -f
```

### Performance

#### Optimiser la vitesse d'import

```env
# Dans .env.production sur TrueNAS
INGESTION_CONCURRENCY=2  # Augmenter si stable (max 4-6)
```

**Trade-offs :**
- Plus élevé = plus rapide
- Mais risque accru de rate limiting YouTube
- Recommandation : **1-2** pour stabilité

---

## 📊 Coûts estimés (production)

| Service | Plan | Coût estimé/mois |
|---------|------|------------------|
| Vercel | Hobby | Gratuit |
| PartyKit | Free | Gratuit |
| TrueNAS | Self-hosted | 0€ (électricité uniquement) |
| Cloudflare Tunnel | Free | Gratuit |
| Cloudflare R2 | Pay-as-you-go | ~$0.15 pour 10GB |
| Firebase | Spark | Gratuit |
| YouTube API | Gratuit | Gratuit |
| UptimeRobot | Free | Gratuit |

**Total estimé : ~$0-1/mois** (principalement stockage R2)

---

## 🤝 Contribution

Les contributions sont les bienvenues !

1. Fork le projet
2. Créez une branche (`git checkout -b feature/amazing-feature`)
3. Commit (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Ouvrez une Pull Request

---

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

---

## 🙏 Remerciements

- [Next.js](https://nextjs.org/) - Framework React
- [PartyKit](https://partykit.io/) - WebSocket infrastructure
- [Firebase](https://firebase.google.com/) - Backend as a Service
- [Cloudflare R2](https://www.cloudflare.com/products/r2/) - Stockage objet
- [Cloudflare Tunnel](https://www.cloudflare.com/products/tunnel/) - Secure tunneling
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - Téléchargement YouTube
- [shadcn/ui](https://ui.shadcn.com/) - Composants UI

---

## 📧 Contact

**Yannis Fouzi** - yfouzi.dev@gmail.com

**Repository** : [https://github.com/YannisFouzi/blind-test](https://github.com/YannisFouzi/blind-test)

**App** : [https://blind-test-brown.vercel.app](https://blind-test-brown.vercel.app)

---

**Made with ❤️ by Yannis Fouzi**
