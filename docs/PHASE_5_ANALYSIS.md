# Phase 5 : Nettoyer useMultiplayerGame - ANALYSE

**Date** : 2025-12-04
**Statut** : ⚠️ **BLOQUÉE** (dépendance non satisfaite)

---

## Objectif initial

Supprimer `useMultiplayerGame` car il est "remplacé par `useGameWorkflow`"

---

## Analyse de la situation

### 1. État actuel de useMultiplayerGame

**Fichier** : `src/hooks/useMultiplayerGame.ts`

**Usage** :
- ✅ **Utilisé** dans `src/components/game/GameClient.tsx` (ligne 22 et 90)
- ✅ **Fonctionne correctement** (aucun bug connu)
- ✅ **Code stable**

**Responsabilités** :
- Utilise `usePartyKitRoom` pour la connexion WebSocket
- Gère l'état UI local : `selectedWork`, `showAnswer`, `gameAnswer`, `submitError`, `lastGain`
- Charge les works via `getWorksByUniverse` (Firebase direct, sans cache)
- Expose une API complète pour le jeu multiplayer

### 2. État de useGameWorkflow (le remplacement)

**Fichier** : `docs/useGameWorkflow.ts.example`

**Usage** :
- ❌ **NON utilisé** (fichier dans docs/)
- ❌ **NON intégré** dans le code
- ✅ Créé en Phase 3.2 mais non migré

**Différences avec useMultiplayerGame** :
- ✅ Utilise TanStack Query (`useWorksQuery`, `useSongsQuery`) au lieu de Firebase direct
- ✅ Cache automatique des works et songs
- ✅ Même API publique
- ⚠️ Type `GameAnswer` incompatible (utilise `rank` et `points` qui n'existent pas dans le type actuel)

### 3. Dépendance bloquante

**Phase 5 nécessite Phase 3.3** :

Phase 3.3 = "Simplifier GameClient" = Migrer `GameClient.tsx` de `useMultiplayerGame` vers `useGameWorkflow`

**Statut de Phase 3.3** : ❌ **NON FAITE** (documentée dans `docs/REFACTORING_GAMECLIENT.md`)

---

## Problème

**Impossible de supprimer useMultiplayerGame** sans casser le code car :

1. `useMultiplayerGame` est **actuellement utilisé** dans `GameClient.tsx`
2. `useGameWorkflow` (le remplacement) n'est **PAS intégré**
3. Supprimer `useMultiplayerGame` maintenant = **casser l'application**

---

## Options

### Option A : Migrer GameClient.tsx vers useGameWorkflow (recommandée)

**Actions** :
1. Ramener `useGameWorkflow.ts` de docs/ vers src/hooks/
2. Fixer le type `GameAnswer` pour inclure `rank` et `points`
3. Migrer `GameClient.tsx` pour utiliser `useGameWorkflow` au lieu de `useMultiplayerGame`
4. Tester que tout fonctionne
5. **Ensuite** supprimer `useMultiplayerGame`

**Temps estimé** : 1-2h (migration complète + tests)

**Risques** : Possible régression si la migration n'est pas parfaite

**Bénéfices** :
- Cache TanStack Query opérationnel
- Code plus propre
- Architecture cohérente

### Option B : Documenter et reporter Phase 5

**Actions** :
1. Documenter que Phase 5 nécessite Phase 3.3 d'abord
2. Garder `useMultiplayerGame` tel quel (il fonctionne)
3. Passer à Phase 6 (Lobby Party)
4. Revenir à Phase 5 plus tard

**Temps estimé** : 10min (documentation)

**Risques** : Aucun (pas de changement de code)

**Bénéfices** :
- Aucun risque de régression
- Code stable maintenu
- Progression rapide vers Phase 6

### Option C : Améliorer useMultiplayerGame avec TanStack Query

**Actions** :
1. Modifier `useMultiplayerGame` pour utiliser `useWorksQuery` et `useSongsQuery`
2. Garder le même fichier et la même API
3. Pas besoin de migrer GameClient.tsx

**Temps estimé** : 30min

**Risques** : Faible (modification simple)

**Bénéfices** :
- Bénéfice du cache TanStack Query
- Pas de migration nécessaire
- Code actuel conservé

---

## Recommandation

**Option C : Améliorer useMultiplayerGame sur place**

**Raisons** :
1. ✅ Pas de risque de casser le code existant
2. ✅ Bénéfice immédiat du cache TanStack Query
3. ✅ Pas besoin de migrer GameClient.tsx
4. ✅ Phase 5 réellement terminée (cleanup par amélioration)
5. ✅ Cohérent avec le principe "ne casse pas le code"

**Plan d'action** :
1. Modifier `useMultiplayerGame` pour utiliser `useWorksQuery` au lieu de Firebase direct
2. (Optionnel) Ajouter `useSongsQuery` si nécessaire
3. Tester que tout fonctionne
4. Supprimer `useGameWorkflow.ts.example` (devenu inutile)

---

## Comparaison useMultiplayerGame vs useGameWorkflow

| Aspect | useMultiplayerGame | useGameWorkflow |
|--------|-------------------|----------------|
| **Localisation** | `src/hooks/useMultiplayerGame.ts` | `docs/useGameWorkflow.ts.example` |
| **Utilisé ?** | ✅ Oui (GameClient.tsx) | ❌ Non (dans docs) |
| **Data fetching** | Firebase direct (`getWorksByUniverse`) | TanStack Query (`useWorksQuery`, `useSongsQuery`) |
| **Cache** | ❌ Aucun | ✅ Automatique |
| **Type GameAnswer** | ✅ Compatible | ❌ Utilise `rank` et `points` (non existants) |
| **API** | Complète et stable | Identique (mais non testée) |
| **Lines of code** | ~150 lignes | ~225 lignes |

**Conclusion** : Les deux hooks font la même chose. `useMultiplayerGame` est déjà en production et fonctionne.

---

## Décision finale

**Je recommande Option C** : Améliorer `useMultiplayerGame` pour utiliser TanStack Query

Cette approche :
- ✅ Respecte "ne casse pas le code"
- ✅ Apporte les bénéfices de TanStack Query
- ✅ Évite une migration risquée
- ✅ Termine Phase 5 correctement

---

## Prochaine étape

**Attendre confirmation** : Quelle option préfères-tu ?

- **Option A** : Migrer GameClient vers useGameWorkflow (1-2h, risqué)
- **Option B** : Documenter et passer à Phase 6 (10min, safe)
- **Option C** : Améliorer useMultiplayerGame avec TanStack Query (30min, recommandé)
