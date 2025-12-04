# Phase 11 : Cleanup final - ANALYSE

**Date** : 2025-12-04
**Statut** : ⚠️ **ANALYSÉE** (Cleanup partiel)

---

## Objectif initial

Supprimer le code obsolète selon le plan :
- `src/hooks/useMultiplayerGame.ts`
- `src/hooks/useRoom.ts`
- `src/services/firebase/rooms.ts`
- `src/app/api/cleanup-room/route.ts`
- `cleanup-service/`

---

## Analyse de l'utilisation actuelle

### Fichiers existants

✅ Tous les fichiers listés existent

### Analyse de dépendance

#### 1. `src/hooks/useMultiplayerGame.ts` 🟢 **UTILISÉ**

```bash
grep -r "from.*useMultiplayerGame" src/
```

**Résultat** :
- `src/components/game/GameClient.tsx` ← **UTILISÉ ACTIVEMENT**

**Raison** :
- Phase 5 : Modifié pour utiliser TanStack Query (`useWorksQuery`)
- Toujours le hook principal pour la logique multiplayer
- GameClient.tsx dépend de ce hook

**Action** : ❌ **NE PAS SUPPRIMER**

---

#### 2. `src/hooks/useRoom.ts` 🔴 **PEU UTILISÉ**

```bash
grep -r "from.*useRoom" src/
```

**Résultat** :
- Aucun import dans le code source
- Seulement référencé dans REFACTORING_ROADMAP.md (documentation)

**Raison** :
- Ancien hook Firestore pour gérer les rooms
- Remplacé par `usePartyKitRoom` (Phase 1)
- Mais encore présent dans le codebase

**Action** : ⚠️ **PEUT ÊTRE ARCHIVÉ** (déplacer vers `docs/archive/`)

---

#### 3. `src/services/firebase/rooms.ts` 🟠 **UTILISÉ PAR HOMECONTENT**

```bash
grep -r "createRoom|subscribeIdleRooms" src/
```

**Résultat** :
- `src/components/home/HomeContent.tsx` ← **UTILISÉ ACTIVEMENT**

**Raison** :
- Phase 9 : Migration de HomeContent.tsx reportée (trop complexe)
- HomeContent utilise encore Firebase pour :
  - `createRoom()` - Créer une nouvelle room
  - `subscribeIdleRooms()` - Lister les rooms disponibles
  - `subscribeRoom()` - S'abonner à l'état d'une room
  - `subscribePlayers()` - S'abonner aux joueurs d'une room
  - `joinRoom()` - Rejoindre une room
  - `configureRoomPlaylist()` - Configurer la playlist

**Action** : ❌ **NE PAS SUPPRIMER** (code critique encore utilisé)

---

#### 4. `src/app/api/cleanup-room/route.ts` 🔴 **OBSOLÈTE**

```bash
grep -r "cleanup-room" src/
```

**Résultat** :
- Aucun import, aucune référence

**Raison** :
- Route API pour nettoyer les rooms inactives
- Remplacée par PartyKit Alarms (automatique côté serveur)
- Plus utilisée depuis l'adoption de PartyKit

**Action** : ✅ **PEUT ÊTRE SUPPRIMÉ**

---

#### 5. `cleanup-service/` 🔴 **OBSOLÈTE**

**Contenu** :
```
cleanup-service/
  ├── src/index.ts
  ├── package.json
  ├── package-lock.json
  └── tsconfig.json
```

**Raison** :
- Service externe Railway pour nettoyer les rooms Firebase
- Plus nécessaire avec PartyKit (gestion automatique)
- Aucun lien avec le code actuel

**Action** : ✅ **PEUT ÊTRE SUPPRIMÉ**

---

## Décision Phase 11

### ❌ Fichiers à NE PAS SUPPRIMER

**Raison** : Principe "ne casse pas le code"

1. **`src/hooks/useMultiplayerGame.ts`**
   - Utilisé par GameClient.tsx
   - Modifié en Phase 5 avec TanStack Query
   - Fonctionne correctement

2. **`src/services/firebase/rooms.ts`**
   - Utilisé par HomeContent.tsx
   - Système Firebase encore actif pour créer/rejoindre des parties
   - Migration reportée (Phase 9)

---

### ✅ Fichiers sûrs à supprimer

**Raison** : Plus utilisés, remplacés par PartyKit

1. **`src/app/api/cleanup-room/route.ts`** (route API obsolète)
2. **`cleanup-service/`** (service externe obsolète)

---

### ⚠️ Fichier à archiver

**Raison** : Plus utilisé mais potentiellement utile comme référence

1. **`src/hooks/useRoom.ts`**
   - Déplacer vers `docs/archive/useRoom.ts.example`
   - Garder pour référence historique

---

## Actions Phase 11 (version conservative)

### 1. Supprimer les fichiers obsolètes ✅

```bash
# API route obsolète
rm src/app/api/cleanup-room/route.ts
rmdir src/app/api/cleanup-room

# Service externe obsolète
rm -rf cleanup-service/
```

### 2. Archiver useRoom.ts ✅

```bash
# Créer dossier archive
mkdir -p docs/archive

# Déplacer useRoom.ts
move src/hooks/useRoom.ts docs/archive/useRoom.ts.example
```

### 3. Documenter l'état actuel ✅

Créer `docs/ARCHITECTURE_FINALE.md` avec :
- État des hooks (lesquels utiliser)
- Coexistence Firebase + PartyKit
- Guide de migration future

---

## Coexistence Firebase + PartyKit

### Système actuel (post-refactoring)

**Firebase** (encore utilisé) :
- `HomeContent.tsx` : Création/Liste/Rejoindre rooms
- `src/services/firebase/rooms.ts` : Services Firebase rooms
- Base de données : Firestore (rooms, players)

**PartyKit** (nouveau système) :
- `GameClient.tsx` : Gameplay temps réel
- `usePartyKitRoom` : Hook WebSocket pour jouer
- `party/index.ts` : Game Party (gestion partie)
- `party/lobby.ts` : Lobby Party (liste rooms)
- `useLobby` : Hook pour recevoir liste rooms

**Alternative PartyKit** (créée en Phase 9) :
- `RoomsBrowser.tsx` : Composant simple utilisant `useLobby`
- Peut remplacer progressivement HomeContent

---

## Migration future (optionnelle)

### Étape 1 : Migrer HomeContent.tsx

**Option A** : Utiliser RoomsBrowser.tsx
- Remplacer HomeContent par RoomsBrowser
- Temps : 30min
- Risque : Faible

**Option B** : Créer HomeContentV2.tsx
- Réécrire HomeContent avec useLobby + usePartyKitRoom
- Temps : 2-3h
- Risque : Moyen

### Étape 2 : Supprimer Firebase rooms

Une fois HomeContent migré :
1. Supprimer `src/services/firebase/rooms.ts`
2. Supprimer `src/hooks/useMultiplayerGame.ts` (si plus utilisé)
3. Nettoyer `src/types/index.ts` (types Room, RoomPlayer, etc.)

**Bénéfices** :
- ✅ Un seul système (PartyKit)
- ✅ Code plus simple
- ✅ Moins de dette technique

**Coût estimé** : 3-4h + tests

---

## Conclusion Phase 11

### Actions effectuées

✅ **Analyse complète** des dépendances
✅ **Identification** des fichiers obsolètes
✅ **Décision conservatrice** : ne casser aucun code

### Fichiers supprimés

- ✅ `src/app/api/cleanup-room/route.ts` (route API obsolète)
- ✅ `cleanup-service/` (service externe obsolète)

### Fichiers archivés

- ✅ `src/hooks/useRoom.ts` → `docs/archive/useRoom.ts.example`

### Fichiers conservés (encore utilisés)

- ✅ `src/hooks/useMultiplayerGame.ts` (utilisé par GameClient)
- ✅ `src/services/firebase/rooms.ts` (utilisé par HomeContent)

---

## Phase 11 : Statut final

**Phase 11 : COMPLÉTÉE avec approche conservative** ✅

**Raison** :
- Suppression des fichiers vraiment obsolètes
- Conservation du code fonctionnel
- Documentation de la coexistence Firebase + PartyKit
- Principe "ne casse pas le code" respecté

---

## Prochaines étapes (optionnelles)

**Future refactoring** :
1. Migrer HomeContent.tsx vers RoomsBrowser ou usePartyKitRoom
2. Supprimer Firebase rooms complètement
3. Unifier le système sur PartyKit uniquement

**Temps estimé** : 3-4h + tests

**Priorité** : Basse (système actuel fonctionne)

---

## Références

**Fichiers de la Phase 11** :
- `docs/PHASE_11_ANALYSIS.md` - Cette analyse
- `docs/PHASE_11_COMPLETE.md` - Documentation finale (à créer)

**Phases liées** :
- Phase 1 : Création de usePartyKitRoom (remplacement de useRoom)
- Phase 5 : Amélioration de useMultiplayerGame avec TanStack Query
- Phase 9 : Analyse de HomeContent + création de RoomsBrowser
