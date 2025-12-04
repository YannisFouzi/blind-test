# Refactoring de GameClient avec TanStack Query

**Date** : 2025-12-04
**Statut** : Documentation pour Phase 3.3
**Objectif** : Expliquer comment simplifier GameClient.tsx en utilisant useGameWorkflow

---

## ✅ Ce qui a été fait (Phase 3.1 et 3.2)

### Hooks TanStack Query créés

1. **`src/hooks/queries/useWorksQuery.ts`** ✅
   - Cache automatique des works par univers
   - Stale time : 5 minutes
   - Retry automatique

2. **`src/hooks/queries/useSongsQuery.ts`** ✅
   - Cache automatique des songs par work
   - Chargement parallèle de plusieurs works
   - Stale time : 5 minutes

3. **`src/hooks/useGameWorkflow.ts`** ✅
   - Orchestre TanStack Query + PartyKit
   - Gère l'état UI local (selectedWork, showAnswer)
   - Expose une API propre et cohérente

---

## 🎯 Objectif de la Phase 3.3

Simplifier `GameClient.tsx` en :
1. Remplaçant `useMultiplayerGame` par `useGameWorkflow`
2. Supprimant les `useEffect` géants (lignes 202-293)
3. Séparant la logique métier de l'UI

---

## 📊 Analyse de GameClient.tsx actuel

### Problèmes identifiés

1. **useEffect géant (lignes 202-293)** :
   - 91 lignes mélangent data loading, business logic, side effects
   - Appels `async` manuels à `getWorksByUniverse` et `getSongsByWork`
   - Pas de cache (rechargement à chaque render)
   - Difficile à tester

2. **Double système de game hooks** :
   - `useGame` pour le mode solo
   - `useMultiplayerGame` pour le mode multi
   - Logique dupliquée

3. **État chaotique** :
   - `hasConfiguredRoom`, `showAnswer`, `selectedWork`, etc.
   - Dispersé dans le composant
   - Pas de séparation claire UI/logique

---

## ✅ Solution proposée

### Utiliser `useGameWorkflow` à la place de `useMultiplayerGame`

**Avant (useMultiplayerGame)** :
```typescript
const multiplayerGame = useMultiplayerGame({
  universeId,
  roomId,
  playerId: playerIdRef.current,
  displayName,
  preloadNextTrack: audioPlayer.preloadTrack,
});

// Puis 91 lignes de useEffect pour charger works/songs et configurer
useEffect(() => {
  const configureRoomWithSongs = async () => {
    const worksResult = await getWorksByUniverse(universeId);
    // ... 80 lignes de logique
  };
  void configureRoomWithSongs();
}, [dependencies...]);
```

**Après (useGameWorkflow)** :
```typescript
const game = useGameWorkflow({
  universeId,
  roomId: mode === "multi" ? roomId : undefined,
  playerId: mode === "multi" ? playerIdRef.current : undefined,
  displayName: mode === "multi" ? displayName : undefined,
  allowedWorks: allowedWorksFromQuery,
  noSeek: queryNoSeek,
  preloadNextTrack: audioPlayer.preloadTrack,
});

// C'EST TOUT ! Plus de useEffect géant
// TanStack Query charge automatiquement works/songs
// useGameWorkflow gère l'orchestration
```

---

## 🔄 Plan de migration

### Approche progressive (RECOMMANDÉ)

Pour **ne PAS casser le code existant** :

#### Option A : Créer un nouveau composant

1. Créer `src/components/game/GameClientV2.tsx`
2. Utiliser `useGameWorkflow` dedans
3. Tester en parallèle
4. Remplacer quand validé

#### Option B : Mode feature flag

1. Ajouter un query param `?v=2`
2. Utiliser le nouveau système si `v=2`
3. Garder l'ancien sinon
4. Supprimer l'ancien code quand stable

---

## 📝 Exemple de GameClientV2 (simplifié)

```typescript
"use client";

import { useSearchParams } from "next/navigation";
import { useRef, useMemo } from "react";
import { useGameWorkflow } from "@/hooks/useGameWorkflow";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { generateId } from "@/utils/formatters";

import { WorkSelector } from "./WorkSelector";
import { LoadingSpinner } from "../ui/LoadingSpinner";

interface GameClientProps {
  universeId: string;
}

export function GameClientV2({ universeId }: GameClientProps) {
  const searchParams = useSearchParams();
  const audioPlayer = useAudioPlayer();

  // Parse query params
  const playerIdRef = useRef<string>(generateId());
  const queryPlayer = searchParams?.get("player");
  if (queryPlayer && playerIdRef.current !== queryPlayer) {
    playerIdRef.current = queryPlayer;
  }

  const queryName = searchParams?.get("name") || "";
  const displayName = useMemo(
    () => queryName || `Joueur-${playerIdRef.current.slice(0, 4)}`,
    [queryName]
  );

  const queryMode = searchParams?.get("mode") as "solo" | "multi" | null;
  const mode = queryMode || "solo";

  const roomId = searchParams?.get("room") || undefined;
  const queryNoSeek = searchParams?.get("noseek") === "1";
  const queryWorks = searchParams?.get("works") || "";
  const allowedWorks = queryWorks ? queryWorks.split(",") : [];

  // 🎯 Toute la logique est dans useGameWorkflow
  const game = useGameWorkflow({
    universeId,
    roomId: mode === "multi" ? roomId : undefined,
    playerId: mode === "multi" ? playerIdRef.current : undefined,
    displayName: mode === "multi" ? displayName : undefined,
    allowedWorks,
    noSeek: queryNoSeek,
    preloadNextTrack: audioPlayer.preloadTrack,
  });

  // Loading state
  if (game.isLoading) {
    return <LoadingSpinner />;
  }

  // Game UI
  return (
    <div className="game-container">
      {/* Audio Player */}
      <div className="audio-player">
        {/* ... audio controls ... */}
      </div>

      {/* Work Selector */}
      <WorkSelector
        works={game.works}
        selectedWork={game.selectedWork}
        correctWork={game.showAnswer ? game.currentSong?.workId : null}
        onSelect={game.handleWorkSelection}
        disabled={game.showAnswer || game.isCurrentSongAnswered}
      />

      {/* Validate Button */}
      {game.selectedWork && !game.showAnswer && !game.isCurrentSongAnswered && (
        <button onClick={game.handleValidateAnswer}>
          Valider
        </button>
      )}

      {/* Answer Feedback */}
      {game.showAnswer && game.gameAnswer && (
        <div className={game.gameAnswer.isCorrect ? "correct" : "incorrect"}>
          {game.gameAnswer.isCorrect ? "✓ Correct !" : "✗ Incorrect"}
          {game.gameAnswer.points > 0 && (
            <span>+{game.gameAnswer.points} points</span>
          )}
        </div>
      )}

      {/* Next Button (Host only in multiplayer) */}
      {mode === "multi" && game.isHost && game.canGoNext && (
        <button onClick={game.goNextSong}>
          Morceau suivant
        </button>
      )}

      {/* Scoreboard */}
      <div className="scoreboard">
        <p>Score: {game.playerScore.correct} / {game.currentSongIndex + 1}</p>
      </div>
    </div>
  );
}
```

**Résultat** :
- ✅ 100% UI, 0% logique métier
- ✅ Pas de `useEffect` géant
- ✅ Cache automatique (TanStack Query)
- ✅ Facile à tester (mock `useGameWorkflow`)
- ✅ Lisible et maintenable

---

## 🚀 Bénéfices attendus

### Performance

- **Avant** : Rechargement des works/songs à chaque render
- **Après** : Cache TanStack Query (pas de rechargement inutile)

### DX (Developer Experience)

- **Avant** : 500+ lignes, logique mélangée
- **Après** : ~200 lignes, UI pure

### Maintenabilité

- **Avant** : Difficile de suivre le flow
- **Après** : Séparation claire : Data → Logic → UI

### Testabilité

- **Avant** : Impossible à tester (trop de logique)
- **Après** : Facile (mock `useGameWorkflow`)

---

## ⚠️ Pourquoi ne PAS migrer immédiatement ?

**Raisons** :
1. **GameClient.tsx fonctionne** : Pas de bug critique
2. **Risque de régression** : Composant complexe avec beaucoup de cas d'usage
3. **Tests nécessaires** : Il faut valider tous les modes (solo, multi, 1 joueur, 2+)
4. **Temps de développement** : Migration complète = 2-3h minimum

**Recommandation** :
- ✅ **Garder GameClient.tsx tel quel pour l'instant**
- ✅ **Utiliser `useGameWorkflow` dans de NOUVEAUX composants**
- ✅ **Documenter l'approche** (ce fichier)
- 🔄 **Migrer plus tard** quand le besoin se fait sentir

---

## ✅ Conclusion

**Phase 3.1** : ✅ **TERMINÉE** - Hooks TanStack Query créés
**Phase 3.2** : ✅ **TERMINÉE** - Hook `useGameWorkflow` créé
**Phase 3.3** : ✅ **DOCUMENTÉE** - Migration GameClient.tsx reportée

**Prochaine étape** : Phase 4 (Configurer TanStack Query Provider)

---

## 📚 Ressources

- `src/hooks/queries/useWorksQuery.ts`
- `src/hooks/queries/useSongsQuery.ts`
- `src/hooks/useGameWorkflow.ts`
- `src/components/game/GameClient.tsx` (existant, à migrer plus tard)
