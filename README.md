# 🎵 Blind Test - Application de Quiz Musical

Ce projet est une application [Next.js](https://nextjs.org) pour créer et jouer à des blind tests musicaux.

## 🚀 Démarrage rapide

### Prérequis

- **Node.js** version 18 ou supérieure
- **npm**, **yarn**, **pnpm** ou **bun** (gestionnaire de paquets)
- Un projet **Firebase** configuré
- Une **clé API YouTube** (Google Cloud Console)

### Installation

1. **Cloner le projet** (si ce n'est pas déjà fait)

2. **Installer les dépendances**

```bash
cd blind-test
npm install
# ou
yarn install
# ou
pnpm install
# ou
bun install
```

3. **Configurer les variables d'environnement**

Créez un fichier `.env.local` à la racine du dossier `blind-test` avec les variables suivantes :

```env
# Configuration Firebase (obligatoire)
NEXT_PUBLIC_FIREBASE_API_KEY=votre_clé_api_firebase
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=votre_projet.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=votre_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=votre_projet.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=votre_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=votre_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=votre_measurement_id

# Clé API YouTube (obligatoire pour les routes API)
YOUTUBE_API_KEY=votre_clé_api_youtube

# Configuration Admin (optionnel)
NEXT_PUBLIC_ADMIN_EMAIL=yfouzi.dev@gmail.com
ADMIN_EMAIL=yfouzi.dev@gmail.com
```

> **Note** : Les variables `NEXT_PUBLIC_*` sont accessibles côté client, tandis que `YOUTUBE_API_KEY` est uniquement côté serveur.

4. **Lancer le serveur de développement**

```bash
npm run dev
# ou
yarn dev
# ou
pnpm dev
# ou
bun dev
```

5. **Ouvrir l'application**

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

### Scripts disponibles

- `npm run dev` - Lance le serveur de développement
- `npm run build` - Compile l'application pour la production
- `npm run start` - Lance le serveur de production (après `build`)
- `npm run lint` - Vérifie le code avec ESLint

### Où obtenir les clés API ?

#### Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Créez ou sélectionnez un projet
3. Allez dans **Paramètres du projet** > **Vos applications**
4. Créez une application web et copiez la configuration

#### YouTube API

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez ou sélectionnez un projet
3. Activez l'**API YouTube Data API v3**
4. Créez des identifiants (clé API)
5. Copiez la clé API dans votre `.env.local`

### Structure du projet

```
blind-test/
├── src/
│   ├── app/              # Pages et routes Next.js
│   ├── components/       # Composants React
│   ├── hooks/           # Hooks personnalisés
│   ├── services/        # Services (Firebase, YouTube)
│   └── utils/           # Utilitaires
├── lib/                 # Configuration (Firebase, YouTube)
├── public/              # Fichiers statiques
└── types/               # Types TypeScript
```

### Dépannage

**Erreur "Configuration Firebase manquante"**
- Vérifiez que toutes les variables `NEXT_PUBLIC_FIREBASE_*` sont définies dans `.env.local`
- Redémarrez le serveur de développement après avoir modifié `.env.local`

**Erreur "Clé API YouTube manquante"**
- Vérifiez que `YOUTUBE_API_KEY` est définie dans `.env.local`
- Assurez-vous que l'API YouTube Data API v3 est activée dans Google Cloud Console

**Le serveur ne démarre pas**
- Vérifiez que Node.js est installé : `node --version`
- Supprimez `node_modules` et `package-lock.json`, puis réinstallez : `npm install`

## Notes de déploiement ingestion-service

- Le service d'ingestion télécharge `yt-dlp` via le script `scripts/install-yt-dlp.sh`. Lors d'un déploiement Linux (Railway), ce script est exécuté au moment du `npm install`.
- Si tu déploies via Railway, assure-toi que le fichier `/ingestion-service/.railway/railpack-plan.json` est bien pris en compte afin d'exécuter `npm ci`, `npm run build` et `npm run start` depuis le dossier `ingestion-service`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
