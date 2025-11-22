# 🎵 Blind Test - Application de Quiz Musical

Application web complète pour créer et jouer à des blind tests musicaux avec import automatique depuis YouTube.

## 📋 Table des matières

- [Vue d'ensemble](#-vue-densemble)
- [Stack technique](#-stack-technique)
- [Architecture](#-architecture)
- [Fonctionnalités](#-fonctionnalités)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Déploiement](#-déploiement)
- [Utilisation](#-utilisation)
- [Dépannage](#-dépannage)

---

## 🎯 Vue d'ensemble

Cette application permet de :
- ✅ Créer des univers et œuvres thématiques (Harry Potter, Star Wars, etc.)
- ✅ Importer automatiquement des playlists YouTube complètes
- ✅ Télécharger et convertir les audios en MP3 (128kbps)
- ✅ Jouer à des blind tests avec système de points
- ✅ Gérer un dashboard administrateur complet
- ✅ Authentification utilisateur avec Firebase

**Architecture microservices :**
- **Frontend** : Next.js 14 hébergé sur Vercel
- **Backend Ingestion** : Service Express.js sur Railway (téléchargement YouTube)
- **Base de données** : Firestore (NoSQL temps réel)
- **Stockage audio** : Cloudflare R2 (S3-compatible)

---

## 🛠 Stack technique

### Frontend (Vercel)

| Technologie | Version | Usage |
|-------------|---------|-------|
| **Next.js** | 14.x | Framework React (App Router) |
| **React** | 18.x | Bibliothèque UI |
| **TypeScript** | 5.x | Typage statique |
| **Tailwind CSS** | 3.x | Styling |
| **shadcn/ui** | - | Composants UI (Radix UI) |
| **Firebase SDK** | 10.x | Authentication + Firestore |
| **Zod** | 3.x | Validation de schémas |
| **React Hook Form** | 7.x | Gestion de formulaires |

### Backend Ingestion (Railway)

| Technologie | Version | Usage |
|-------------|---------|-------|
| **Node.js** | 22.x | Runtime JavaScript |
| **Express.js** | 4.x | Serveur HTTP |
| **TypeScript** | 5.x | Typage statique |
| **yt-dlp** | Latest | Téléchargement YouTube (binaire standalone) |
| **FFmpeg** | Latest | Conversion audio (via @ffmpeg-installer) |
| **@aws-sdk/client-s3** | 3.x | Upload Cloudflare R2 |
| **youtube-dl-exec** | 3.x | Wrapper Node.js pour yt-dlp |
| **fluent-ffmpeg** | 2.x | API FFmpeg |
| **p-limit** | 5.x | Concurrency control |

### Services Cloud

| Service | Usage | Plan |
|---------|-------|------|
| **Vercel** | Hébergement frontend + Edge Functions | Hobby (gratuit) |
| **Railway** | Service d'ingestion (europe-west4) | Pay-as-you-go (~$5-10/mois) |
| **Firebase/Firestore** | Base de données NoSQL + Auth | Spark (gratuit) ou Blaze |
| **Cloudflare R2** | Stockage MP3 (S3-compatible) | Pay-as-you-go (~$0.015/GB) |
| **YouTube Data API v3** | Métadonnées playlists | Gratuit (10,000 unités/jour) |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         UTILISATEUR                             │
│                    (Navigateur Web)                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    VERCEL (Frontend)                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Next.js 14 App                                           │  │
│  │ - Pages (/, /admin/dashboard, /game/:id)                 │  │
│  │ - API Routes (/api/youtube/*, /api/audio/*)              │  │
│  │ - Components (React + shadcn/ui)                         │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────┬──────────────────────┬──────────────────┬─────────────┘
         │                      │                  │
         │ Proxy                │ Auth             │ Query
         ↓                      ↓                  ↓
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ RAILWAY          │  │ FIREBASE         │  │ CLOUDFLARE R2    │
│ (Ingestion)      │  │ (Auth+Firestore) │  │ (Audio Storage)  │
├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│ Express.js       │  │ Authentication   │  │ MP3 Files        │
│                  │  │                  │  │ Public URLs      │
│ yt-dlp_linux ────┼──┼─→ YouTube API    │  │ CORS Enabled     │
│ (Download)       │  │   (Metadata)     │  │                  │
│      ↓           │  │                  │  │                  │
│ fluent-ffmpeg    │  │ Firestore DB:    │  │ Organized by:    │
│ (Convert MP3)    │  │ - universes      │  │ /workId/         │
│      ↓           │  │ - works          │  │  videoId.mp3     │
│ R2 SDK ──────────┼──┼──────────────────┼─→│                  │
│ (Upload)         │  │ - songs          │  │                  │
└──────────────────┘  │ - users          │  └──────────────────┘
                      └──────────────────┘
```

### Flux d'import de playlist

```
1. User colle URL YouTube playlist
   ↓
2. Frontend valide via YouTube API (métadonnées)
   ↓
3. User clique "Créer et importer"
   ↓
4. Frontend crée Work dans Firestore
   ↓
5. Frontend appelle Railway via /api/audio/import-playlist
   ↓
6. Railway récupère liste vidéos (YouTube API)
   ↓
7. Pour chaque vidéo (concurrency: 2-6):
   - yt-dlp télécharge audio (WebM/M4A)
   - FFmpeg convertit → MP3 128kbps
   - Upload vers Cloudflare R2
   ↓
8. Railway retourne songs[] avec audioUrl
   ↓
9. Frontend sauvegarde songs dans Firestore
   ↓
10. UI affiche les chansons + Ready to play!
```

---

## ✨ Fonctionnalités

### 🎮 Mode Jeu
- Lecture aléatoire des chansons d'une œuvre
- Système de points (rapide = plus de points)
- Timer par chanson
- Révélation progressive des réponses
- Score final et classement

### 👨‍💼 Dashboard Admin
- Gestion des univers (créer, modifier, supprimer)
- Gestion des œuvres par univers
- Import automatique de playlists YouTube
- Gestion des chansons (édition, suppression)
- Prévisualisation audio avant suppression

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

---

## 🚀 Installation

### Prérequis

- **Node.js** ≥ 18.x ([Télécharger](https://nodejs.org/))
- **npm** ou **pnpm** (gestionnaire de paquets)
- **Git** pour cloner le projet
- **Compte Firebase** ([Créer](https://console.firebase.google.com/))
- **Compte Cloudflare** ([Créer](https://dash.cloudflare.com/))
- **Compte Railway** ([Créer](https://railway.app/))
- **Clé YouTube API** ([Obtenir](https://console.cloud.google.com/))

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

### Variables d'environnement Frontend

Créez `.env.local` à la racine :

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

# Admin Configuration (optionnel)
NEXT_PUBLIC_ADMIN_EMAIL=votre-email@example.com
ADMIN_EMAIL=votre-email@example.com

# Security (optionnel)
API_SECRET_KEY=votre-secret-key-securise

# Ingestion Service (production)
INGESTION_SERVICE_URL=https://blind-test-production.up.railway.app
# INGESTION_SERVICE_TOKEN=optional-bearer-token
```

### Variables d'environnement Backend (Railway)

Configurez dans **Railway Dashboard** → Service → **Variables** :

```env
# Server
PORT=8080

# YouTube API
YOUTUBE_API_KEY=AIzaSyBDLfbqqp8iQNw4...

# Cloudflare R2 (obligatoire)
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=blind-test-audio
R2_PUBLIC_BASE_URL=https://pub-xxxxx.r2.dev

# Performance (optionnel)
INGESTION_CONCURRENCY=4
# Valeurs recommandées : 2-6 (défaut: 2)
# Plus élevé = plus rapide mais plus de CPU/RAM
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
   - Suivez les étapes de création

2. **Activer Firestore**
   ```
   Console Firebase → Build → Firestore Database → Create database
   Mode: Production (ou Test pour dev)
   Region: europe-west (ou proche de vous)
   ```

3. **Règles de sécurité Firestore**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Lecture publique, écriture authentifiée
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

5. **Récupérer les clés**
   ```
   Paramètres du projet → Général → Vos applications
   → Ajouter une application Web
   Copiez la configuration dans .env.local
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
   Copiez la clé → Ajoutez dans .env.local
   ```

4. **Limites de quota**
   - Quota gratuit : **10,000 unités/jour**
   - Import playlist (20 vidéos) ≈ **51 unités**
   - Capacité : ~**200 imports/jour** gratuits

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
   - Root Directory : `./` (racine)
   - Framework Preset : Next.js
   - Build Command : `npm run build`
   - Output Directory : `.next`

3. **Configurer les variables d'environnement**
   ```
   Settings → Environment Variables
   Ajoutez TOUTES les variables de .env.local
   ```

4. **Déployer**
   ```
   Deploy → Attendre le build (~2-3 min)
   ```

### Backend sur Railway

1. **Créer un nouveau projet Railway**
   - [Railway Dashboard](https://railway.app/)
   - New Project → Deploy from GitHub repo
   - Sélectionnez le repo `blind-test`

2. **Configurer le service**
   ```
   Settings → Root Directory: /ingestion-service
   Settings → Config as Code: /.railway/railpack-plan.json
   Settings → Region: europe-west4
   ```

3. **Ajouter les variables d'environnement**
   ```
   Variables → New Variable
   Ajoutez toutes les variables (voir section Configuration)
   ```

4. **Build automatique**
   ```
   Railway détecte railpack-plan.json et exécute :
   1. npm ci && node scripts/install-yt-dlp.js
   2. npm run build
   3. npm run start
   ```

5. **Récupérer l'URL de déploiement**
   ```
   Settings → Generate Domain
   Exemple: blind-test-production.up.railway.app

   Ajoutez dans Vercel:
   INGESTION_SERVICE_URL=https://blind-test-production.up.railway.app
   ```

### Vérification post-déploiement

#### ✅ Frontend (Vercel)
```bash
curl https://votre-app.vercel.app/
# Devrait retourner la page d'accueil
```

#### ✅ Backend (Railway)
```bash
# Health check (si implémenté)
curl https://blind-test-production.up.railway.app/health

# Vérifier les logs Railway
Railway Dashboard → Deployments → View Logs
Cherchez: "Ingestion service ready on http://localhost:8080"
```

#### ✅ Import test
1. Allez sur votre app Vercel
2. Login admin
3. Créez un univers
4. Créez une œuvre avec une playlist YouTube
5. Vérifiez les logs Railway en temps réel
6. Vérifiez Firestore (collection `songs`)
7. Vérifiez R2 (fichiers MP3)

---

## 💻 Utilisation

### Développement local

#### Frontend
```bash
npm run dev
# → http://localhost:3000
```

#### Backend Ingestion (optionnel en local)
```bash
cd ingestion-service
npm run dev
# → http://localhost:4000

# Note: yt-dlp ne s'installe que sur Linux
# Sur Windows/Mac, utilisez le service Railway en prod
```

### Commandes utiles

```bash
# Linter
npm run lint

# Build de production (test local)
npm run build
npm run start

# TypeScript check
npx tsc --noEmit

# Nettoyage complet
rm -rf node_modules .next
npm install
```

### Workflow admin

1. **Créer un univers**
   ```
   Dashboard → Créer un univers
   Nom: "Harry Potter"
   Description: "Musiques des films Harry Potter"
   ```

2. **Créer une œuvre**
   ```
   Dashboard → Univers "Harry Potter" → Créer une œuvre
   Titre: "Harry Potter à l'école des sorciers"
   URL playlist: https://www.youtube.com/playlist?list=PL...
   ```

3. **Importer automatiquement**
   ```
   Cliquez "Créer et importer"
   → Validation YouTube
   → Téléchargement audio (Railway)
   → Conversion MP3
   → Upload R2
   → Sauvegarde Firestore
   ```

4. **Gérer les chansons**
   ```
   Dashboard → Gérer les chansons
   → Modifier / Supprimer
   → Prévisualiser audio
   ```

5. **Jouer**
   ```
   Page d'accueil → Sélectionner univers
   → Sélectionner œuvre
   → Play!
   ```

---

## 🐛 Dépannage

### Erreurs courantes

#### ❌ "Configuration Firebase manquante"
**Cause :** Variables `NEXT_PUBLIC_FIREBASE_*` absentes

**Solution :**
```bash
# Vérifiez .env.local
cat .env.local | grep FIREBASE

# Redémarrez le serveur
npm run dev
```

#### ❌ "Clé API YouTube manquante"
**Cause :** Variable `YOUTUBE_API_KEY` absente

**Solution :**
```bash
# Ajoutez dans .env.local
echo "YOUTUBE_API_KEY=AIzaSy..." >> .env.local

# Redémarrez
npm run dev
```

#### ❌ "ENOENT: spawn yt-dlp" (Railway)
**Cause :** yt-dlp non installé ou mauvais chemin

**Solution :**
```bash
# Vérifiez les logs Railway build
# Cherchez: "yt-dlp installed at /app/bin/yt-dlp"

# Si absent, vérifiez railpack-plan.json
cat ingestion-service/.railway/railpack-plan.json

# Force rebuild
git commit --allow-empty -m "Force Railway rebuild"
git push
```

#### ❌ "YouTube API quota exceeded"
**Cause :** Plus de 10,000 unités/jour consommées

**Solution :**
```bash
# Vérifiez votre quota
Google Cloud Console → APIs → YouTube Data API v3 → Quotas

# Attendez 24h ou demandez une augmentation
```

#### ❌ Import lent (>5 min pour 20 pistes)
**Cause :** Concurrency trop faible

**Solution :**
```bash
# Augmentez dans Railway variables
INGESTION_CONCURRENCY=4  # ou 6

# Redéployez
```

#### ❌ "Access Denied" R2
**Cause :** Clés R2 invalides ou CORS mal configuré

**Solution :**
```bash
# Vérifiez les credentials Railway
echo $R2_ACCESS_KEY_ID
echo $R2_SECRET_ACCESS_KEY

# Vérifiez CORS dans Cloudflare Dashboard
R2 → blind-test-audio → Settings → CORS
```

#### ❌ Chansons non visibles après import
**Cause :** Erreur sauvegarde Firestore ou règles trop strictes

**Solution :**
```bash
# Vérifiez console navigateur (F12)
# Cherchez erreurs Firestore

# Vérifiez règles Firestore
Firebase Console → Firestore → Rules
# Assurez-vous que allow read: if true;

# Vérifiez que les songs existent
Firebase Console → Firestore → songs collection
```

### Logs et debugging

#### Frontend (Vercel)
```bash
# Logs en temps réel
vercel logs --follow

# Logs d'une fonction spécifique
vercel logs --since 1h /api/audio/import-playlist
```

#### Backend (Railway)
```bash
# Via Dashboard
Railway → Deployments → View Logs

# Filtrer par niveau
# Cherchez: [yt-dlp], [ffmpeg], [R2], etc.
```

#### Firestore
```javascript
// Dans la console navigateur
// Activez le debug Firestore
firebase.firestore.setLogLevel('debug');
```

### Performance

#### Optimiser la vitesse d'import

**Current :** 234s pour 20 pistes (concurrency: 2)

**Optimisé :**
```env
# Railway variables
INGESTION_CONCURRENCY=4
# → ~120s pour 20 pistes

INGESTION_CONCURRENCY=6
# → ~80s pour 20 pistes
```

**Trade-offs :**
- Plus élevé = plus rapide
- Mais plus de CPU/RAM Railway
- Risque de rate limiting YouTube

**Recommandation : 4-6**

---

## 📊 Métriques et monitoring

### Coûts estimés (production)

| Service | Plan | Coût estimé/mois |
|---------|------|------------------|
| Vercel | Hobby | Gratuit (→ $20 si dépassement) |
| Railway | Pay-as-you-go | $5-15 selon usage |
| Cloudflare R2 | Pay-as-you-go | ~$0.15 pour 10GB stockés |
| Firebase | Spark/Blaze | Gratuit (→ $25 si dépassement) |
| YouTube API | Gratuit | Gratuit (10k unités/jour) |

**Total estimé : ~$5/mois** selon trafic

### Limites connues

| Limite | Valeur | Impact |
|--------|--------|--------|
| YouTube API quota | 10,000 unités/jour | ~200 imports/jour max |
| Vercel Hobby timeout | 10s | OK (API = proxy seulement) |
| Railway timeout | Aucune | OK pour jobs longs |
| R2 egress | Gratuit | Aucun coût bande passante |
| Firestore reads | 50k/jour (gratuit) | OK pour petites apps |

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
- [Firebase](https://firebase.google.com/) - Backend as a Service
- [Cloudflare R2](https://www.cloudflare.com/products/r2/) - Stockage objet
- [Railway](https://railway.app/) - Hébergement backend
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - Téléchargement YouTube
- [shadcn/ui](https://ui.shadcn.com/) - Composants UI

---

## 📧 Contact

**Yannis Fouzi** - yfouzi.dev@gmail.com

**Repository** : [https://github.com/YannisFouzi/blind-test](https://github.com/YannisFouzi/blind-test)

---

**Made with ❤️ by Yannis Fouzi**
