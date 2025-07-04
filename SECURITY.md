# 🔒 SÉCURITÉ - BLIND TEST PROJECT

## ✅ MESURES DE SÉCURITÉ IMPLÉMENTÉES

### 1. **Variables d'environnement sécurisées**

- **Fichier** : `.env.local`
- **Protection** : Clés API et secrets déplacés hors du code source
- **Firebase** : Configuration via `NEXT_PUBLIC_*` pour le client
- **YouTube** : Clé API côté serveur uniquement (`YOUTUBE_API_KEY`)
- **Admin** : Email administrateur configuré (`ADMIN_EMAIL`, `NEXT_PUBLIC_ADMIN_EMAIL`)

### 2. **API Routes sécurisées**

- **Localisation** : `/src/app/api/youtube/`
- **Validation** : Paramètres d'entrée systématiquement validés
- **Rate limiting** : Headers de limitation inclus
- **Erreurs** : Messages d'erreur sécurisés sans exposition d'informations sensibles

### 3. **Authentification admin unifiée**

- **Méthode** : Email hardcodé uniquement (`yfouzi.dev@gmail.com`)
- **Suppression** : Ancien système `isAdmin` en base de données
- **Validation** : Vérification côté client et serveur

### 4. **Règles Firestore strictes**

- **Validation** : Champs obligatoires et types de données
- **Contraintes** : Taille des strings, format des IDs YouTube
- **Permissions** : Accès admin uniquement pour l'écriture
- **Sécurité** : Blocage par défaut des collections non définies

### 5. **Headers de sécurité Next.js**

- **CSP** : Content Security Policy restrictive
- **HSTS** : HTTP Strict Transport Security activé
- **XSS** : Protection contre les attaques XSS
- **Clickjacking** : Protection via X-Frame-Options
- **CORS** : Configuration spécifique pour les API

## 🔧 CONFIGURATION DÉTAILLÉE

### Variables d'environnement

```env
# Firebase (publiques)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...

# YouTube (privée)
YOUTUBE_API_KEY=...

# Admin (publique/privée)
ADMIN_EMAIL=...
NEXT_PUBLIC_ADMIN_EMAIL=...
```

### Règles Firestore

```javascript
// Validation des univers
allow create: if isAdmin()
  && hasValidData()
  && request.resource.data.keys().hasAll(['name', 'description', 'color', 'icon', 'active'])
  && isValidString(request.resource.data.name)
  && request.resource.data.active is bool
  && request.resource.data.createdAt == request.time;
```

### Headers de sécurité

```javascript
// CSP restrictive
"default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.youtube.com",
  "connect-src 'self' https://firestore.googleapis.com",
  "frame-src 'self' https://www.youtube.com https://accounts.google.com";
```

## 📊 NIVEAUX DE SÉCURITÉ

### 🟢 **Sécurisé**

- ✅ Authentification admin unifiée
- ✅ API routes côté serveur
- ✅ Headers de sécurité complets
- ✅ Variables d'environnement protégées
- ✅ Validation Firestore stricte

### 🟡 **À surveiller**

- ⚠️ Quota API YouTube (10k/jour)
- ⚠️ Logs d'erreur (informations potentiellement sensibles)
- ⚠️ Cache des données côté client

### 🔴 **Points d'attention**

- 🚨 Déploiement des règles Firestore (manuel)
- 🚨 Rotation des clés API (annuelle)
- 🚨 Monitoring des accès admin

## 🚀 PROCÉDURES DE MAINTENANCE

### Déploiement des règles Firestore

```bash
# Via Firebase CLI
firebase deploy --only firestore:rules

# Via console Firebase
# 1. Aller dans Firestore Database
# 2. Onglet "Règles"
# 3. Copier le contenu de firestore.rules
# 4. Cliquer "Publier"
```

### Rotation des clés API

```bash
# 1. Générer nouvelle clé YouTube dans Google Cloud Console
# 2. Mettre à jour .env.local
# 3. Redéployer l'application
# 4. Supprimer l'ancienne clé
```

### Vérification de sécurité

```bash
# Test des headers
curl -I https://votre-domaine.com

# Test des API routes
curl -X GET https://votre-domaine.com/api/youtube/playlist?playlistId=invalid

# Test des permissions Firestore
# Tester en navigation privée
```

## 🔍 SURVEILLANCE ET MONITORING

### Logs à surveiller

- Erreurs d'authentification Firebase
- Appels API YouTube échoués
- Tentatives d'accès admin non autorisées
- Violations des règles Firestore

### Métriques importantes

- Nombre d'appels API YouTube/jour
- Tentatives de connexion admin
- Erreurs de validation Firestore
- Temps de réponse des API routes

### Alertes recommandées

- Quota API YouTube > 80%
- Erreurs 500 > 5/heure
- Tentatives d'accès admin multiples
- Violations CSP

## 📋 CHECKLIST DE SÉCURITÉ

### Avant déploiement

- [ ] Variables d'environnement définies
- [ ] Règles Firestore déployées
- [ ] Headers de sécurité testés
- [ ] API routes fonctionnelles
- [ ] Authentification admin testée

### Maintenance mensuelle

- [ ] Vérification des logs d'erreur
- [ ] Contrôle du quota API YouTube
- [ ] Test des accès admin
- [ ] Vérification des headers de sécurité
- [ ] Audit des règles Firestore

### Maintenance annuelle

- [ ] Rotation des clés API
- [ ] Revue des règles Firestore
- [ ] Mise à jour des dépendances
- [ ] Test de pénétration
- [ ] Revue des permissions

## 🆘 PROCÉDURES D'URGENCE

### Compromission suspected

1. **Révoquer immédiatement** les clés API
2. **Changer l'email admin** dans les variables d'environnement
3. **Déployer règles Firestore** bloquantes temporaires
4. **Analyser les logs** Firebase et Vercel
5. **Notifier les utilisateurs** si nécessaire

### Quota API dépassé

1. **Activer le cache** côté client
2. **Limiter les appels** aux playlists
3. **Demander augmentation** du quota Google
4. **Implémenter fallback** avec données statiques

### Règles Firestore bloquantes

1. **Vérifier la syntaxe** des règles
2. **Tester avec Firebase Emulator**
3. **Déployer règles correctives**
4. **Rollback** si nécessaire

## 📞 CONTACTS

- **Administrateur** : yfouzi.dev@gmail.com
- **Support Firebase** : Console Firebase
- **Support YouTube API** : Google Cloud Console
- **Support Vercel** : Dashboard Vercel

---

**Dernière mise à jour** : 2024-01-20
**Version sécurité** : 1.0
**Niveau de sécurité** : ÉLEVÉ ✅
