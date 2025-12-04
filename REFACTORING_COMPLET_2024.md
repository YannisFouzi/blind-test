# 🚀 Plan de Refactoring Complet - Blind Test Multiplayer

**Date** : 2024-12-03
**Objectif** : Transformer le projet en architecture professionnelle sans tout casser
**Statut** : Planification
**Durée estimée** : 3-4 jours de travail focalisé

---

## 📋 Table des matières

1. [Diagnostic : Pourquoi refactorer ?](#diagnostic)
2. [Ce qui fonctionne (à garder)](#ce-qui-fonctionne)
3. [Problèmes critiques](#problèmes-critiques)
4. [Architecture cible](#architecture-cible)
5. [Plan d'implémentation (11 phases)](#plan-dimplémentation)
6. [Stack technique finale](#stack-technique-finale)
7. [Ordre d'exécution](#ordre-dexécution)

---

## 🔍 Diagnostic : Pourquoi refactorer ?

### ❌ Bugs actuels bloquants

1. **Game workflow cassé** : Les joueurs peuvent répondre sans que le jeu soit démarré (`state = "idle"`)
2. **Bouton "Next" ne marche pas** : Serveur rejette car `state !== "playing"`
3. **Rooms zombies** : Firestore + PartyKit désynchronisés, rooms persistent indéfiniment
4. **Pas de cleanup** : Service Railway externe qui ne marche pas bien

### 🏗️ Problèmes architecturaux

#### **Serveur (PartyKit)**
- ❌ Pas de state machine : transitions non validées
- ❌ Incohérence : `handleAnswer` accepte réponses en `"idle"`, mais `handleNext` refuse
- ❌ Pas de persistance : `room.storage` non utilisé
- ❌ Pas de cleanup automatique : Alarms non implémentés
- ❌ État `"configured"` manquant entre `"idle"` et `"playing"`

#### **Client (React)**
- ❌ `useEffect` géant de 91 lignes dans `GameClient.tsx`
- ❌ Logique métier mélangée avec UI
- ❌ TanStack Query installé mais pas utilisé (fetch manuel dans useEffect)
- ❌ État local chaotique (`hasConfiguredRoom`, `showAnswer`, `selectedWork`, etc.)
- ❌ Race conditions possibles entre effets

#### **Lobby & Rooms**
- ❌ Architecture hybride : Firestore pour liste rooms + PartyKit pour jeu
- ❌ Aucune sync entre les deux systèmes
- ❌ Rooms apparaissent dans la liste même quand le jeu a commencé
- ❌ Service externe Railway pour cleanup (complexité inutile)

---

## ✅ Ce qui fonctionne (à garder)

### **Excellent**
- ✅ Firebase Auth (bien configuré)
- ✅ Firebase Database (universes, works, songs)
- ✅ Zod pour validation
- ✅ React Hook Form pour formulaires
- ✅ Framer Motion pour animations
- ✅ TailwindCSS + Radix UI (bonne base UI)
- ✅ Next.js 15 + React 19 (stack moderne)

### **Bon mais à améliorer**
- 🟡 PartyKit serveur : fonctionne mais manque state machine
- 🟡 `usePartyKitRoom` : API correcte mais logique mélangée
- 🟡 `useMultiplayerGame` : bon concept mais mal structuré
- 🟡 `useAudioPlayer` : fonctionne bien (à garder tel quel)

### **À refaire**
- 🔴 Gestion des rooms (lobby)
- 🔴 Workflow de jeu (idle → configured → playing → results)
- 🔴 Chargement de données (useEffect → TanStack Query)

---

## 🚨 Problèmes critiques (à fixer en priorité)

### Priorité 1 : Workflow de jeu cassé

**Problème** : Les joueurs peuvent jouer sans que le jeu soit démarré.

**Cause** :
```typescript
// party/index.ts ligne 406
handleAnswer(msg) {
  // ❌ Pas de vérification si state === "playing"
  // Accepte les réponses en mode "idle"
}

// party/index.ts ligne 545
handleNext(msg) {
  if (this.state.state !== "playing") {
    // ✅ Rejette si pas en mode "playing"
    return error("Game is not playing");
  }
}
```

**Conséquence** : Incohérence totale → joueurs répondent → erreur au "Next".

**Solution** :
1. Ajouter état `"configured"` entre `"idle"` et `"playing"`
2. Valider `state === "playing"` dans `handleAnswer`
3. Auto-start après configuration OU bouton "Démarrer" explicite

---

### Priorité 2 : Rooms zombies

**Problème** : 9 rooms persistent dans la liste après déconnexion.

**Cause** :
```
Firestore: createRoom({ state: "idle" })
  ↓
PartyKit: handleStart() → state = "playing"
  ↓
❌ Firestore ne sait pas que la room est "playing"
❌ Room reste visible dans la liste
```

**Solution** : Architecture Multi-Party PartyKit (voir Phase 6-8).

---

## 🎯 Architecture cible

### **Serveur : Game State Machine**

```
┌─────────────────────────────────────────────────────┐
│                 Game Party (XState)                  │
├─────────────────────────────────────────────────────┤
│                                                       │
│  idle                                                 │
│    ↓ CONFIGURE                                        │
│  configured (songs loaded, ready)                     │
│    ↓ START                                            │
│  playing (accept ANSWER, NEXT)                        │
│    ↓ NEXT (if last song)                              │
│  results (game over)                                  │
│                                                       │
│  Transitions validées automatiquement par XState     │
│  Actions invalides = rejetées avant traitement       │
└─────────────────────────────────────────────────────┘
```

**Fichiers** :
- `party/gameMachine.ts` : State machine XState
- `party/game.ts` : Game Party avec XState intégré
- `party/lobby.ts` : Lobby Party (liste rooms)

---

### **Client : Clean Architecture**

```
┌──────────────────────────────────────────────────────┐
│              GameClient.tsx (UI only)                 │
│  - Affichage pur                                      │
│  - Pas de logique métier                              │
│  - Délègue tout aux hooks                             │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│          useGameWorkflow.ts (orchestration)           │
│  - Gère le workflow : configure → start → play        │
│  - État UI local (selectedWork, showAnswer)           │
│  - Délègue data à TanStack Query                      │
└──────────────────────────────────────────────────────┘
          ↓                              ↓
┌──────────────────────┐    ┌───────────────────────────┐
│  usePartyKitRoom.ts   │    │  TanStack Query hooks     │
│  (WebSocket client)   │    │  - useWorks()             │
│  - Connexion          │    │  - useSongs()             │
│  - Messages           │    │  - Cache auto             │
│  - État serveur       │    │  - Refetch auto           │
└──────────────────────┘    └───────────────────────────┘
```

**Séparation claire** :
- **UI** : `GameClient.tsx`, `WorkSelector.tsx`, etc.
- **Logique** : `useGameWorkflow.ts`
- **Data** : TanStack Query hooks
- **WebSocket** : `usePartyKitRoom.ts`

---

### **Lobby : Multi-Party Architecture**

```
┌─────────────────────────────────────────────────────┐
│           Lobby Party (/parties/lobby/main)          │
│  - 1 seule instance (singleton)                       │
│  - Track toutes les rooms actives                     │
│  - Broadcast liste via WebSocket                      │
│  - Storage persistant                                 │
└─────────────────────────────────────────────────────┘
                    ↑ HTTP POST notifications
┌─────────────────────────────────────────────────────┐
│        Game Parties (/parties/game/{roomId})         │
│  - N instances (1 par room)                           │
│  - État de jeu temps réel                             │
│  - Notifie Lobby des changements                      │
│  - Auto-cleanup via Alarms (2min inactivité)          │
└─────────────────────────────────────────────────────┘
```

**Flow** :
1. Host crée room → Game Party notifie Lobby (`room_created`)
2. Lobby broadcast la nouvelle room → Clients la voient
3. Host démarre jeu → Game Party notifie Lobby (`state: "playing"`)
4. Lobby retire la room de la liste → Clients ne la voient plus
5. Tous quittent → Alarm 2min → Game Party notifie Lobby (`room_deleted`)

---

## 📝 Plan d'implémentation

### Phase 0 : Préparation (30min)

**Objectif** : Installer dépendances et configurer

**Actions** :
```bash
# 1. Installer XState v5
npm install xstate@latest

# 2. Vérifier que TanStack Query est bien installé
npm list @tanstack/react-query

# 3. Créer les dossiers
mkdir -p party/machines
mkdir -p src/hooks/queries
mkdir -p src/lib/game
```

**Fichiers à créer** :
- `party/machines/` : State machines
- `src/hooks/queries/` : TanStack Query hooks
- `src/lib/game/` : Types et utilitaires game

---

### Phase 1 : Fix immédiat du workflow (2h)

**Objectif** : Débloquer le jeu pour qu'il fonctionne sans erreur

#### Étape 1.1 : Ajouter état "configured" au serveur

**Fichier** : `party/index.ts`

**Modifications** :
```typescript
// Ligne 101 : Ajouter état "configured"
interface GameState {
  // ...
  state: "idle" | "configured" | "playing" | "results"; // ✅ Ajouter "configured"
}

// Ligne 330 : handleConfigure
handleConfigure(msg, sender) {
  // ... code existant ...

  this.state.state = "configured"; // ✅ Au lieu de rester "idle"

  this.broadcast({
    type: "room_configured",
    // ...
  });
}

// Ligne 406 : handleAnswer - Ajouter validation
handleAnswer(msg, sender) {
  // ✅ AJOUTER CETTE VÉRIFICATION
  if (this.state.state !== "playing") {
    sender.send(JSON.stringify({
      type: "error",
      message: "Game is not started yet"
    }));
    return;
  }

  // ... code existant ...
}
```

**Test** : Lancer le jeu → Essayer de répondre avant start → Doit rejeter.

---

#### Étape 1.2 : Auto-start après configuration

**Fichier** : `src/components/game/GameClient.tsx`

**Modifications** :
```typescript
// Ligne 202 : useEffect configure
useEffect(() => {
  // ... code existant pour configurer ...

  const configureRoomWithSongs = async () => {
    // ... code existant ...

    const result = await multiplayerGame.configureRoom(...);

    if (result.success) {
      console.log("[GameClient] Room configured successfully");
      setHasConfiguredRoom(true);

      // ✅ AJOUTER : Auto-start le jeu après configuration
      if (multiplayerGame.startGame) {
        await multiplayerGame.startGame();
        console.log("[GameClient] Game auto-started");
      }
    }
  };

  // ...
}, [...]);
```

**Test** :
1. Créer room multi
2. Attendre configuration
3. Interface de jeu s'affiche
4. Répondre → ✅ Doit marcher
5. Cliquer "Next" → ✅ Doit marcher

---

### Phase 2 : State Machine côté serveur (4h)

**Objectif** : Remplacer logique manuelle par XState

#### Étape 2.1 : Créer la state machine

**Fichier** : `party/machines/gameMachine.ts`

```typescript
import { setup, assign } from 'xstate';

/**
 * Types pour le contexte de la state machine
 */
interface GameContext {
  roomId: string;
  hostId: string;
  universeId?: string;
  songs: Song[];
  currentSongIndex: number;
  players: Map<string, Player>;
  responses: Map<string, Response>;
  allowedWorks?: string[];
  options: { noSeek: boolean };
}

/**
 * Events que la machine peut recevoir
 */
type GameEvent =
  | { type: 'CONFIGURE'; universeId: string; songs: Song[]; allowedWorks?: string[]; options?: { noSeek: boolean } }
  | { type: 'START'; hostId: string }
  | { type: 'ANSWER'; playerId: string; songId: string; workId: string | null }
  | { type: 'NEXT'; hostId: string }
  | { type: 'PLAYER_JOIN'; playerId: string; displayName: string }
  | { type: 'PLAYER_LEAVE'; playerId: string };

/**
 * State Machine pour le jeu Blind Test
 */
export const gameStateMachine = setup({
  types: {
    context: {} as GameContext,
    events: {} as GameEvent,
  },
  guards: {
    isHost: ({ context, event }) => {
      if (event.type === 'START' || event.type === 'NEXT') {
        return event.hostId === context.hostId;
      }
      return false;
    },
    hasMoreSongs: ({ context }) => {
      return context.currentSongIndex < context.songs.length - 1;
    },
    isLastSong: ({ context }) => {
      return context.currentSongIndex >= context.songs.length - 1;
    },
    isPlaying: ({ context }) => {
      return context.songs.length > 0;
    },
  },
  actions: {
    configureSongs: assign({
      universeId: ({ event }) => event.type === 'CONFIGURE' ? event.universeId : undefined,
      songs: ({ event }) => event.type === 'CONFIGURE' ? event.songs : [],
      allowedWorks: ({ event }) => event.type === 'CONFIGURE' ? event.allowedWorks : undefined,
      options: ({ event }) => event.type === 'CONFIGURE' ? (event.options || { noSeek: false }) : { noSeek: false },
    }),
    incrementSong: assign({
      currentSongIndex: ({ context }) => context.currentSongIndex + 1,
    }),
    resetSong: assign({
      currentSongIndex: 0,
    }),
  },
}).createMachine({
  id: 'blindTestGame',
  initial: 'idle',
  context: ({ input }: { input: { roomId: string; hostId: string } }) => ({
    roomId: input.roomId,
    hostId: input.hostId,
    songs: [],
    currentSongIndex: 0,
    players: new Map(),
    responses: new Map(),
    options: { noSeek: false },
  }),
  states: {
    idle: {
      on: {
        CONFIGURE: {
          target: 'configured',
          actions: 'configureSongs',
        },
        PLAYER_JOIN: {
          actions: 'addPlayer',
        },
      },
    },
    configured: {
      on: {
        START: {
          target: 'playing',
          guard: 'isHost',
          actions: 'resetSong',
        },
        CONFIGURE: {
          target: 'configured',
          actions: 'configureSongs',
        },
        PLAYER_JOIN: {
          actions: 'addPlayer',
        },
      },
    },
    playing: {
      on: {
        ANSWER: {
          actions: 'recordAnswer',
        },
        NEXT: [
          {
            target: 'playing',
            guard: ['isHost', 'hasMoreSongs'],
            actions: 'incrementSong',
          },
          {
            target: 'results',
            guard: ['isHost', 'isLastSong'],
          },
        ],
        PLAYER_LEAVE: {
          actions: 'removePlayer',
        },
      },
    },
    results: {
      type: 'final',
    },
  },
});
```

---

#### Étape 2.2 : Intégrer XState dans Game Party

**Fichier** : `party/game.ts` (nouveau fichier, remplace `party/index.ts`)

```typescript
import type * as Party from "partykit/server";
import { createActor } from 'xstate';
import { gameStateMachine } from './machines/gameMachine';
import { z } from 'zod';

/**
 * Game Party avec State Machine
 */
export default class BlindTestGameParty implements Party.Server {
  actor: ReturnType<typeof createActor>;

  // Map pour retrouver les joueurs par connectionId
  connectionToPlayer: Map<string, string> = new Map();

  constructor(public room: Party.Room) {
    // Initialiser la state machine
    this.actor = createActor(gameStateMachine, {
      input: {
        roomId: room.id,
        hostId: '', // Sera défini au premier join
      },
    });

    // Subscribe aux changements d'état
    this.actor.subscribe((state) => {
      console.log(`[${this.room.id}] State:`, state.value);

      // Broadcaster l'état aux clients
      this.broadcastState();
    });

    this.actor.start();
  }

  async onConnect(conn: Party.Connection) {
    console.log(`[${this.room.id}] Connection:`, conn.id);
  }

  async onMessage(message: string, sender: Party.Connection) {
    try {
      const msg = JSON.parse(message);
      console.log(`[${this.room.id}] Message from ${sender.id}:`, msg.type);

      // Router les messages vers la state machine
      switch (msg.type) {
        case 'join':
          this.handleJoin(msg, sender);
          break;
        case 'configure':
          this.actor.send({ type: 'CONFIGURE', ...msg });
          break;
        case 'start':
          this.actor.send({ type: 'START', hostId: msg.hostId });
          break;
        case 'answer':
          this.actor.send({ type: 'ANSWER', ...msg });
          break;
        case 'next':
          this.actor.send({ type: 'NEXT', hostId: msg.hostId });
          break;
        default:
          sender.send(JSON.stringify({
            type: 'error',
            message: `Unknown message type: ${msg.type}`,
          }));
      }
    } catch (error) {
      console.error(`[${this.room.id}] Error:`, error);
      sender.send(JSON.stringify({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }

  async onClose(conn: Party.Connection) {
    const playerId = this.connectionToPlayer.get(conn.id);
    if (playerId) {
      this.actor.send({ type: 'PLAYER_LEAVE', playerId });
      this.connectionToPlayer.delete(conn.id);
    }
  }

  private handleJoin(msg: any, sender: Party.Connection) {
    // Logic pour ajouter un joueur
    this.connectionToPlayer.set(sender.id, msg.playerId);
    this.actor.send({ type: 'PLAYER_JOIN', ...msg });
  }

  private broadcastState() {
    const state = this.actor.getSnapshot();

    this.room.broadcast(JSON.stringify({
      type: 'state_sync',
      state: {
        roomId: state.context.roomId,
        state: state.value,
        hostId: state.context.hostId,
        currentSongIndex: state.context.currentSongIndex,
        songs: state.context.songs,
        // ...
      },
    }));
  }
}

BlindTestGameParty satisfies Party.Worker;
```

**Note** : Ce code est une ébauche. L'implémentation complète nécessite de migrer toute la logique métier (players, responses, points) vers les actions de la state machine.

---

### Phase 3 : Refactoring client - TanStack Query (3h)

**Objectif** : Supprimer les `useEffect` géants, utiliser TanStack Query

#### Étape 3.1 : Créer les Query hooks

**Fichier** : `src/hooks/queries/useWorksQuery.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { getWorksByUniverse } from '@/services/firebase';

export const useWorksQuery = (universeId: string) => {
  return useQuery({
    queryKey: ['works', universeId],
    queryFn: async () => {
      const result = await getWorksByUniverse(universeId);
      if (!result.success || !result.data) {
        throw new Error('Failed to load works');
      }
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!universeId,
  });
};
```

**Fichier** : `src/hooks/queries/useSongsQuery.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { getSongsByWork } from '@/services/firebase';

export const useSongsQuery = (workIds: string[]) => {
  return useQuery({
    queryKey: ['songs', ...workIds],
    queryFn: async () => {
      const promises = workIds.map(id => getSongsByWork(id));
      const results = await Promise.all(promises);

      const allSongs = results.flatMap(r =>
        r.success && r.data ? r.data : []
      );

      return allSongs;
    },
    staleTime: 5 * 60 * 1000,
    enabled: workIds.length > 0,
  });
};
```

---

#### Étape 3.2 : Créer hook d'orchestration

**Fichier** : `src/hooks/useGameWorkflow.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { usePartyKitRoom } from './usePartyKitRoom';
import { useWorksQuery } from './queries/useWorksQuery';
import { useSongsQuery } from './queries/useSongsQuery';
import { shuffleArray } from '@/lib/utils';

type UseGameWorkflowOptions = {
  universeId: string;
  roomId?: string;
  playerId?: string;
  displayName?: string;
  allowedWorks?: string[];
  noSeek?: boolean;
};

/**
 * Hook qui orchestre le workflow du jeu multi
 *
 * Responsabilités :
 * - Charger works et songs via TanStack Query
 * - Configurer la room PartyKit
 * - Auto-start le jeu après configuration
 * - Gérer l'état UI local (selectedWork, showAnswer)
 */
export const useGameWorkflow = ({
  universeId,
  roomId,
  playerId,
  displayName,
  allowedWorks = [],
  noSeek = false,
}: UseGameWorkflowOptions) => {
  // État UI local
  const [selectedWork, setSelectedWork] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  // PartyKit connection
  const partyKit = usePartyKitRoom({ roomId, playerId, displayName });

  // TanStack Query : charger works
  const { data: works = [], isLoading: isLoadingWorks } = useWorksQuery(universeId);

  // Filtrer works
  const worksToUse = allowedWorks.length > 0
    ? works.filter(w => allowedWorks.includes(w.id))
    : works;

  const workIds = worksToUse.map(w => w.id);

  // TanStack Query : charger songs
  const { data: songs = [], isLoading: isLoadingSongs } = useSongsQuery(workIds);

  const isLoading = isLoadingWorks || isLoadingSongs;

  // Auto-configuration : quand HOST est connecté et songs chargés
  useEffect(() => {
    if (!partyKit.isHost || !partyKit.isConnected || isLoading) return;
    if (partyKit.room?.songs && partyKit.room.songs.length > 0) return; // Déjà configuré
    if (songs.length === 0) return;

    const configure = async () => {
      const shuffled = shuffleArray([...songs]);
      const selected = shuffled.slice(0, 10);

      await partyKit.configureRoom(universeId, selected, allowedWorks, { noSeek });

      // Auto-start après configuration
      await partyKit.startGame();
    };

    void configure();
  }, [
    partyKit.isHost,
    partyKit.isConnected,
    isLoading,
    songs,
    partyKit.room?.songs,
    partyKit.configureRoom,
    partyKit.startGame,
    universeId,
    allowedWorks,
    noSeek,
  ]);

  // Reset selection quand on change de morceau
  useEffect(() => {
    setSelectedWork(null);
    setShowAnswer(false);
  }, [partyKit.currentSong?.id]);

  const handleSelectWork = useCallback((workId: string) => {
    if (showAnswer || partyKit.state !== 'playing') return;
    setSelectedWork(workId);
  }, [showAnswer, partyKit.state]);

  const handleValidate = useCallback(async () => {
    if (!partyKit.currentSong || !selectedWork) return;

    const isCorrect = selectedWork === partyKit.currentSong.workId;
    await partyKit.submitAnswer(selectedWork, isCorrect);
    setShowAnswer(true);
  }, [partyKit, selectedWork]);

  return {
    // PartyKit state
    ...partyKit,

    // Works
    works: worksToUse,
    isLoadingWorks,

    // UI state
    selectedWork,
    showAnswer,
    isLoading,

    // Actions
    handleSelectWork,
    handleValidate,
  };
};
```

---

#### Étape 3.3 : Simplifier GameClient

**Fichier** : `src/components/game/GameClient.tsx`

**Avant** : 500+ lignes avec logique métier
**Après** : ~200 lignes, uniquement UI

```typescript
'use client';

import { useGameWorkflow } from '@/hooks/useGameWorkflow';
import { WorkSelector } from './WorkSelector';
import { AudioPlayer } from './AudioPlayer';
// ... imports

export const GameClient = ({
  universeId,
  mode,
  roomId,
  playerId,
  displayName,
  allowedWorks,
  noSeek,
}: GameClientProps) => {
  const audioPlayer = useAudioPlayer();

  // 🎯 Toute la logique est déléguée au hook
  const game = useGameWorkflow({
    universeId,
    roomId: mode === 'multi' ? roomId : undefined,
    playerId: mode === 'multi' ? playerId : undefined,
    displayName: mode === 'multi' ? displayName : undefined,
    allowedWorks,
    noSeek,
  });

  // Loading state
  if (game.isLoading) {
    return <LoadingSpinner />;
  }

  // Game UI
  return (
    <div className="game-container">
      <AudioPlayer
        url={game.currentSong?.audioUrl}
        isPlaying={audioPlayer.isPlaying}
        onToggle={audioPlayer.toggle}
      />

      <WorkSelector
        works={game.works}
        selectedWork={game.selectedWork}
        correctWork={game.showAnswer ? game.currentSong?.workId : null}
        onSelect={game.handleSelectWork}
        disabled={game.showAnswer || game.state !== 'playing'}
      />

      {game.selectedWork && !game.showAnswer && (
        <Button onClick={game.handleValidate}>
          Valider
        </Button>
      )}

      {game.isHost && game.canGoNext && (
        <Button onClick={game.goNextSong}>
          Morceau suivant
        </Button>
      )}
    </div>
  );
};
```

**Résultat** :
- ✅ Component 100% UI, 0% logique métier
- ✅ Testable facilement (mock le hook)
- ✅ Lisible, maintenable

---

### Phase 4 : Configurer TanStack Query Provider (30min)

**Fichier** : `src/app/layout.tsx`

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 1,
    },
  },
});

export default function RootLayout({ children }: { children: React.Node }) {
  return (
    <html>
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

---

### Phase 5 : Nettoyer useMultiplayerGame (30min)

**Objectif** : Supprimer ce hook, remplacé par `useGameWorkflow`

**Actions** :
1. Vérifier que tous les usages de `useMultiplayerGame` ont été migrés vers `useGameWorkflow`
2. Supprimer le fichier `src/hooks/useMultiplayerGame.ts`
3. Mettre à jour les imports

---

### Phase 6 : Créer Lobby Party (3h)

**Objectif** : Implémenter le pattern Multi-Party

**Fichier** : `party/lobby.ts`

```typescript
import type * as Party from "partykit/server";

interface RoomMetadata {
  id: string;
  hostName: string;
  state: "idle" | "configured" | "playing" | "results";
  playersCount: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Lobby Party - Track toutes les rooms actives
 *
 * Singleton : 1 seule instance pour toute l'app
 * URL : /parties/lobby/main
 */
export default class LobbyParty implements Party.Server {
  constructor(public room: Party.Room) {}

  async onStart() {
    console.log('[Lobby] Started');
  }

  /**
   * Nouveau client se connecte pour voir la liste des rooms
   */
  async onConnect(conn: Party.Connection) {
    console.log('[Lobby] Client connected:', conn.id);

    // Envoyer la liste actuelle
    await this.sendRoomsList(conn);
  }

  /**
   * Messages HTTP des Game Parties
   */
  async onRequest(req: Party.Request) {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const body = await req.json();
      const { type, roomId, ...data } = body;

      console.log(`[Lobby] Event from game ${roomId}:`, type);

      switch (type) {
        case 'room_created':
          await this.handleRoomCreated(roomId, data);
          break;
        case 'room_state_changed':
          await this.handleRoomStateChanged(roomId, data);
          break;
        case 'room_deleted':
          await this.handleRoomDeleted(roomId);
          break;
        default:
          return new Response('Unknown event type', { status: 400 });
      }

      return new Response('OK', { status: 200 });
    } catch (error) {
      console.error('[Lobby] Error:', error);
      return new Response('Internal error', { status: 500 });
    }
  }

  /**
   * Game Party notifie : nouvelle room créée
   */
  private async handleRoomCreated(roomId: string, data: any) {
    const metadata: RoomMetadata = {
      id: roomId,
      hostName: data.hostName,
      state: 'idle',
      playersCount: data.playersCount || 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.room.storage.put(`room:${roomId}`, metadata);

    // Broadcaster la nouvelle liste
    await this.broadcastRoomsList();
  }

  /**
   * Game Party notifie : état de la room changé
   */
  private async handleRoomStateChanged(roomId: string, data: any) {
    const key = `room:${roomId}`;
    const metadata = await this.room.storage.get<RoomMetadata>(key);

    if (!metadata) return;

    metadata.state = data.state;
    metadata.playersCount = data.playersCount || metadata.playersCount;
    metadata.updatedAt = Date.now();

    await this.room.storage.put(key, metadata);

    // Broadcaster la liste mise à jour
    await this.broadcastRoomsList();
  }

  /**
   * Game Party notifie : room supprimée
   */
  private async handleRoomDeleted(roomId: string) {
    await this.room.storage.delete(`room:${roomId}`);

    // Broadcaster la liste mise à jour
    await this.broadcastRoomsList();
  }

  /**
   * Récupérer toutes les rooms depuis storage
   */
  private async getRooms(): Promise<RoomMetadata[]> {
    const rooms: RoomMetadata[] = [];
    const map = await this.room.storage.list<RoomMetadata>();

    for (const [key, value] of map.entries()) {
      if (key.startsWith('room:')) {
        rooms.push(value);
      }
    }

    // Filtrer uniquement les rooms "idle" ou "configured" (joinables)
    return rooms.filter(r => r.state === 'idle' || r.state === 'configured');
  }

  /**
   * Broadcaster la liste des rooms à tous les clients connectés
   */
  private async broadcastRoomsList() {
    const rooms = await this.getRooms();

    this.room.broadcast(JSON.stringify({
      type: 'rooms_list',
      rooms,
    }));
  }

  /**
   * Envoyer la liste à un client spécifique
   */
  private async sendRoomsList(conn: Party.Connection) {
    const rooms = await this.getRooms();

    conn.send(JSON.stringify({
      type: 'rooms_list',
      rooms,
    }));
  }
}

LobbyParty satisfies Party.Worker;
```

---

### Phase 7 : Intégrer Lobby dans Game Party (2h)

**Objectif** : Game Party notifie Lobby des événements

**Fichier** : `party/game.ts`

**Ajouter** :

```typescript
export default class BlindTestGameParty implements Party.Server {
  // ... code existant ...

  /**
   * Notifier le Lobby Party d'un événement
   */
  private async notifyLobby(type: string, data: any = {}) {
    try {
      const lobbyUrl = `${this.room.env.PARTYKIT_HOST}/parties/lobby/main`;

      await fetch(lobbyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          roomId: this.room.id,
          ...data,
        }),
      });

      console.log(`[${this.room.id}] Notified lobby: ${type}`);
    } catch (error) {
      console.error(`[${this.room.id}] Failed to notify lobby:`, error);
    }
  }

  /**
   * Premier joueur rejoint → Créer la room dans le lobby
   */
  private async handleJoin(msg: any, sender: Party.Connection) {
    const isFirstPlayer = this.actor.getSnapshot().context.players.size === 0;

    // ... code existant ...

    if (isFirstPlayer) {
      await this.notifyLobby('room_created', {
        hostName: msg.displayName,
        playersCount: 1,
      });
    }
  }

  /**
   * Subscribe aux transitions de la state machine
   */
  constructor(public room: Party.Room) {
    // ... code existant ...

    this.actor.subscribe((state) => {
      console.log(`[${this.room.id}] State:`, state.value);

      // Notifier le lobby des changements d'état
      if (state.value === 'playing') {
        void this.notifyLobby('room_state_changed', {
          state: 'playing',
          playersCount: state.context.players.size,
        });
      } else if (state.value === 'results') {
        void this.notifyLobby('room_state_changed', {
          state: 'results',
          playersCount: state.context.players.size,
        });
      }

      this.broadcastState();
    });

    this.actor.start();
  }

  /**
   * Dernier joueur quitte → Planifier suppression
   */
  async onClose(conn: Party.Connection) {
    // ... code existant ...

    const hasPlayers = this.actor.getSnapshot().context.players.size > 0;

    if (!hasPlayers) {
      // Planifier suppression dans 2 minutes
      await this.room.storage.setAlarm(Date.now() + 2 * 60 * 1000);
      console.log(`[${this.room.id}] Alarm set for cleanup in 2min`);
    }
  }

  /**
   * Alarm déclenché → Supprimer la room si toujours vide
   */
  async onAlarm() {
    const hasPlayers = this.actor.getSnapshot().context.players.size > 0;

    if (!hasPlayers) {
      console.log(`[${this.room.id}] Auto-deleting empty room`);

      await this.notifyLobby('room_deleted');
      await this.room.storage.deleteAll();
    }
  }
}
```

---

### Phase 8 : Hook client useLobby (1h)

**Fichier** : `src/hooks/useLobby.ts`

```typescript
import { useState, useEffect } from 'react';
import PartySocket from 'partysocket';

interface RoomMetadata {
  id: string;
  hostName: string;
  state: 'idle' | 'configured' | 'playing' | 'results';
  playersCount: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Hook pour se connecter au Lobby Party et recevoir la liste des rooms
 */
export const useLobby = () => {
  const [rooms, setRooms] = useState<RoomMetadata[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const partyHost = process.env.NEXT_PUBLIC_PARTYKIT_HOST || '127.0.0.1:1999';

    const socket = new PartySocket({
      host: partyHost,
      party: 'lobby',
      room: 'main',
    });

    socket.addEventListener('open', () => {
      console.log('[useLobby] Connected to lobby');
      setIsConnected(true);
    });

    socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'rooms_list') {
          setRooms(message.rooms);
          console.log(`[useLobby] Received ${message.rooms.length} rooms`);
        }
      } catch (error) {
        console.error('[useLobby] Parse error:', error);
      }
    });

    socket.addEventListener('close', () => {
      console.log('[useLobby] Disconnected from lobby');
      setIsConnected(false);
    });

    socket.addEventListener('error', (error) => {
      console.error('[useLobby] Error:', error);
      setIsConnected(false);
    });

    return () => {
      socket.close();
    };
  }, []);

  return {
    rooms,
    isConnected,
  };
};
```

---

### Phase 9 : Adapter HomeContent (1h)

**Fichier** : `src/components/home/HomeContent.tsx`

**Remplacer** :

```typescript
// ❌ AVANT
import { subscribeIdleRooms, createRoom } from '@/services/firebase/rooms';

const [roomsList, setRoomsList] = useState([]);

useEffect(() => {
  const unsubscribe = subscribeIdleRooms(setRoomsList);
  return unsubscribe;
}, []);

const handleCreateRoom = async () => {
  const result = await createRoom({ hostId, hostDisplayName });
  // ...
};
```

```typescript
// ✅ APRÈS
import { useLobby } from '@/hooks/useLobby';
import { nanoid } from 'nanoid';

const { rooms, isConnected } = useLobby();

const handleCreateRoom = () => {
  const roomId = nanoid();

  // Rediriger vers la room
  // PartyKit créera automatiquement la room au premier connect
  router.push(`/game/${universeId}?mode=multi&room=${roomId}&name=${displayName}&host=1`);
};
```

---

### Phase 10 : Configurer partykit.json (5min)

**Fichier** : `partykit.json`

```json
{
  "name": "blind-test-party",
  "compatibilityDate": "2024-11-01",
  "parties": {
    "game": "party/game.ts",
    "lobby": "party/lobby.ts"
  }
}
```

**Note** : Si `party/game.ts` n'existe pas encore (Phase 2 non faite), garder `"game": "party/index.ts"` temporairement.

---

### Phase 11 : Cleanup final (1h)

**Objectif** : Supprimer le code obsolète

#### Fichiers à supprimer :

```
src/hooks/useMultiplayerGame.ts  (remplacé par useGameWorkflow)
src/hooks/useRoom.ts  (ancien système Firestore)
src/services/firebase/rooms.ts  (createRoom, subscribeIdleRooms, etc.)
src/app/api/cleanup-room/route.ts  (plus besoin, PartyKit Alarms)
cleanup-service/  (service Railway externe)
```

#### Fichiers à modifier :

**`src/services/firebase/index.ts`** :
- Supprimer exports liés aux rooms
- Garder uniquement : auth, universes, works, songs

**`src/types/index.ts`** :
- Nettoyer types liés à l'ancien système Firestore rooms

---

## 🎯 Stack technique finale

### **Serveur**

| Technologie | Usage |
|-------------|-------|
| **PartyKit** | Plateforme multiplayer temps réel |
| **XState v5** | State machine pour game logic |
| **Zod** | Validation messages |
| **PartyKit Storage** | Persistance données (lobby, game state) |
| **PartyKit Alarms** | Auto-cleanup rooms inactives |

### **Client**

| Technologie | Usage |
|-------------|-------|
| **React 19** | UI framework |
| **Next.js 15** | Framework React SSR/App Router |
| **TanStack Query** | Data fetching, cache, sync |
| **PartySocket** | Client WebSocket PartyKit |
| **Framer Motion** | Animations |
| **TailwindCSS** | Styling |
| **Radix UI** | Components accessibles |
| **React Hook Form + Zod** | Formulaires |
| **Zustand** *(optionnel)* | État global UI (si besoin) |

### **Database**

| Technologie | Usage |
|-------------|-------|
| **Firebase Auth** | Authentification users |
| **Firestore** | Données statiques : universes, works, songs |
| **R2 Cloudflare** | Stockage audio files |

---

## 📅 Ordre d'exécution recommandé

### **Semaine 1 : Fixes critiques**

**Jour 1 (2h)** : Phase 1 - Fix workflow immédiat
- ✅ Permet de débloquer le jeu
- ✅ Tests avec 2 joueurs
- ✅ Validation : bouton "Next" marche

**Jour 2 (3h)** : Phase 3 - TanStack Query hooks
- ✅ Créer `useWorksQuery`, `useSongsQuery`
- ✅ Tests en isolation
- ✅ Validation : données chargées correctement

**Jour 3 (3h)** : Phase 3 suite - useGameWorkflow
- ✅ Créer le hook d'orchestration
- ✅ Simplifier GameClient
- ✅ Validation : jeu fonctionne comme avant mais code propre

**Jour 4 (1h)** : Phase 4 - Provider TanStack Query
- ✅ Configurer layout.tsx
- ✅ Activer DevTools
- ✅ Validation : cache fonctionne

---

### **Semaine 2 : Architecture pro**

**Jour 5 (4h)** : Phase 2 - State Machine serveur
- ⚠️ Gros refactoring
- Créer `gameMachine.ts`
- Migrer `party/index.ts` → `party/game.ts`
- Tests unitaires de la machine

**Jour 6 (3h)** : Phase 6 - Lobby Party
- Créer `party/lobby.ts`
- Implémenter storage + API HTTP
- Tests en isolation

**Jour 7 (2h)** : Phase 7 - Intégration Game → Lobby
- Ajouter notifications dans Game Party
- Tester avec logs

**Jour 8 (2h)** : Phase 8-9 - Client lobby
- Créer `useLobby`
- Adapter `HomeContent`
- Tests end-to-end

**Jour 9 (1h)** : Phase 10-11 - Cleanup
- Configurer multi-party
- Supprimer code obsolète
- Documentation

---

## 📊 Métriques de succès

### **Avant refactoring**

- ❌ Bouton "Next" ne marche pas
- ❌ Rooms zombies (9 rooms persistent)
- ❌ Service externe Railway
- ❌ Code spaghetti (useEffect 91 lignes)
- ❌ Pas de tests possibles
- 🟡 Latence liste rooms : ~500ms (Firestore)

### **Après refactoring**

- ✅ Workflow validé par state machine (bugs impossibles)
- ✅ Rooms auto-cleanup après 2min
- ✅ 100% PartyKit (pas de service externe)
- ✅ Code modulaire et testable
- ✅ Tests unitaires possibles (mock hooks)
- ✅ Latence liste rooms : <100ms (WebSocket)
- ✅ Cache TanStack Query (perf++)

---

## 🔄 Plan de rollback

Si un problème survient, chaque phase est réversible :

### **Phase 1** (workflow fix)
- Rollback : `git revert` du commit
- Impact : Retour à l'erreur "Game is not playing"

### **Phase 2** (state machine)
- Rollback : Renommer `party/game.ts` → `party/game-xstate.ts`
- Restaurer `party/index.ts` depuis Git
- Modifier `partykit.json` : `"game": "party/index.ts"`

### **Phase 3-4** (TanStack Query)
- Rollback : Les anciens hooks coexistent, restaurer imports dans `GameClient.tsx`

### **Phase 6-9** (Lobby)
- Rollback : Supprimer `party/lobby.ts`, restaurer `subscribeIdleRooms` Firestore

---

## ⚠️ Notes importantes

### **Priorités**

1. **Phase 1** : CRITIQUE - débloquer le jeu
2. **Phase 3-4** : HAUTE - améliorer DX et perfs
3. **Phase 2** : MOYENNE - architecture pro (peut attendre)
4. **Phase 6-9** : BASSE - lobby pro (optionnel si Firestore marche)

### **Tests**

À chaque phase, tester ces scénarios :

1. **Solo** : Créer partie solo, jouer 3 morceaux
2. **Multi 1 joueur** : Créer room, jouer seul
3. **Multi 2 joueurs** : 2 devices, jouer ensemble
4. **Reconnexion** : Fermer tab, réouvrir, vérifier état préservé
5. **Cleanup** : Tous quittent, attendre 2min, vérifier room disparue

### **Performance**

Métriques à surveiller :

- Temps de chargement initial : <2s
- Latence WebSocket : <50ms
- Taille bundle JS : <500KB (gzip)
- Cache hit ratio (TanStack Query) : >80%

---

## 📚 Ressources

### **Documentation**

- [XState v5 Docs](https://stately.ai/docs/xstate)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [PartyKit Multi-Party](https://docs.partykit.io/guides/using-multiple-parties-per-project/)
- [PartyKit Alarms](https://docs.partykit.io/guides/scheduling-tasks-with-alarms/)
- [React Patterns 2024](https://kentcdodds.com/blog/application-state-management-with-react)

### **Exemples**

- [XState Game Example](https://stately.ai/docs/examples)
- [PartyKit Multiplayer Games](https://docs.partykit.io/examples/)
- [TanStack Query with Next.js](https://tanstack.com/query/latest/docs/framework/react/guides/ssr)

---

## ✅ Checklist finale

Avant de considérer le refactoring terminé :

**Fonctionnalités** :
- [ ] Jeu solo fonctionne
- [ ] Jeu multi 1 joueur fonctionne
- [ ] Jeu multi 2+ joueurs fonctionne
- [ ] Bouton "Next" apparaît et marche
- [ ] Points calculés correctement
- [ ] Reconnexion préserve l'état
- [ ] Rooms auto-cleanup après 2min

**Code** :
- [ ] Aucun `useEffect` géant (>30 lignes)
- [ ] Logique métier séparée de l'UI
- [ ] TanStack Query utilisé pour fetch
- [ ] State machine côté serveur (si Phase 2 faite)
- [ ] Tests unitaires écrits (au moins pour hooks)

**Architecture** :
- [ ] Multi-party PartyKit configuré
- [ ] Lobby Party fonctionnel
- [ ] Game Party notifie Lobby
- [ ] Alarms implémentés
- [ ] Code Firestore rooms supprimé
- [ ] Service Railway supprimé

**Documentation** :
- [ ] README mis à jour
- [ ] Diagrammes d'architecture à jour
- [ ] Variables d'environnement documentées

---

## 🚀 Commencer maintenant

Pour démarrer le refactoring :

```bash
# 1. Créer une branche
git checkout -b refactoring-pro

# 2. Installer XState
npm install xstate@latest

# 3. Vérifier TanStack Query
npm list @tanstack/react-query

# 4. Créer les dossiers
mkdir -p party/machines src/hooks/queries src/lib/game

# 5. Commencer par Phase 1 (fix immédiat)
# Éditer party/index.ts et GameClient.tsx
```

**Bon courage ! 💪 Tu vas transformer ce projet en architecture de pro.**
