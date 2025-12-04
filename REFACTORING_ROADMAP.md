# Roadmap de Refactoring - Blind Test Multiplayer

**Date de création**: 2025-12-02
**Objectif**: Transformer le prototype actuel en application multiplayer fiable et performante

---

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Niveau 1 : MINIMAL (1-2 semaines)](#niveau-1--minimal-1-2-semaines)
3. [Niveau 2 : SOLIDE (3-4 semaines)](#niveau-2--solide-3-4-semaines)
4. [Niveau 3 : PRODUCTION-READY (3-4 mois)](#niveau-3--production-ready-3-4-mois)
5. [Annexes](#annexes)

---

## Vue d'ensemble

### État actuel (ce qui fonctionne)

✅ **Admin & gestion de contenu** (60% du code)
- Services Firebase (universes, works, songs)
- Interface admin complète
- Ingestion audio (yt-dlp → R2)
- Validation Zod + types TypeScript

✅ **UI/UX** (20% du code)
- Composants de jeu
- Design Tailwind + animations
- Player audio basique fonctionnel

### Problèmes identifiés

❌ **Transport temps réel Firestore** (10-15% du code)
- Latence P95: 200-800ms (trop lent pour un jeu réactif)
- Race conditions sur le calcul des rangs/points
- Calcul côté client → risque de triche
- Cleanup complexe avec service Railway externe

❌ **Synchronisation audio**
- Pas de time-sync → décalage entre joueurs
- Pas de préchargement intelligent → blancs audio

❌ **Observabilité**
- Logs non structurés
- Aucune métrique de performance
- Pas de monitoring des erreurs prod

### Stratégie de migration

**Principe**: Migration incrémentale avec feature flags, pas de big bang

**Ce qu'on garde**: Tout sauf le transport temps réel et le cleanup
**Ce qu'on refait**: 10-15% du code (hooks room + services)
**Ce qu'on ajoute**: Features nouvelles selon le niveau choisi

---

## Niveau 1 : MINIMAL (1-2 semaines)

**Objectif**: Résoudre le problème principal de latence et de fiabilité

**Priorité**: 🔴 CRITIQUE

### Résultats attendus
- Latence P95: 200-800ms → <50ms
- Élimination des race conditions
- Calcul points/rangs sécurisé côté serveur
- Architecture simplifiée (-1 service Railway)

---

### Étape 1.1 : Setup PartyKit (Jour 1)

**Priorité**: 🔴 CRITIQUE

#### Actions

1. **Installer PartyKit**
   ```bash
   cd blind-test
   npm install partykit partysocket
   npm install -D partykit@latest
   ```

2. **Créer la structure**
   ```bash
   mkdir party
   touch party/index.ts
   touch party/tsconfig.json
   ```

3. **Configurer `party/tsconfig.json`**
   ```json
   {
     "extends": "../tsconfig.json",
     "compilerOptions": {
       "lib": ["ES2021"],
       "types": ["@cloudflare/workers-types"]
     },
     "include": ["**/*.ts"]
   }
   ```

4. **Créer `partykit.json`** (à la racine)
   ```json
   {
     "name": "blind-test-party",
     "main": "party/index.ts",
     "compatibilityDate": "2024-11-01"
   }
   ```

5. **Ajouter scripts dans `package.json`**
   ```json
   {
     "scripts": {
       "dev:partykit": "partykit dev",
       "deploy:partykit": "partykit deploy"
     }
   }
   ```

#### Validation
- [ ] `npm run dev:partykit` démarre sans erreur
- [ ] Dashboard accessible sur `http://localhost:1999`

---

### Étape 1.2 : Implémenter le serveur PartyKit (Jours 2-4)

**Priorité**: 🔴 CRITIQUE

#### Créer `party/index.ts`

**Responsabilités du serveur**:
- Gérer les connexions/déconnexions des joueurs
- Router les messages (join, start, answer, next)
- Calculer rangs et points de manière autoritaire
- Broadcaster l'état aux clients
- Auto-cleanup quand 0 joueurs

#### Structure minimale

```typescript
import type * as Party from "partykit/server";
import { z } from "zod";

// Messages client → serveur
const MessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("join"), playerId: z.string(), displayName: z.string() }),
  z.object({ type: z.literal("start"), hostId: z.string() }),
  z.object({ type: z.literal("answer"), playerId: z.string(), songId: z.string(), workId: z.string().nullable() }),
  z.object({ type: z.literal("next"), hostId: z.string() }),
]);

interface RoomState {
  roomId: string;
  hostId: string;
  universeId: string;
  songs: Array<{ id: string; workId: string; [key: string]: any }>;
  currentSongIndex: number;
  state: "idle" | "playing" | "results";
  players: Map<string, Player>;
  responses: Map<string, Response>; // key: `${songId}-${playerId}`
}

interface Player {
  id: string;
  displayName: string;
  score: number;
  incorrect: number;
  isHost: boolean;
}

interface Response {
  songId: string;
  playerId: string;
  workId: string | null;
  isCorrect: boolean;
  rank: number;
  points: number;
  timestamp: number;
}

export default class BlindTestRoom implements Party.Server {
  state: RoomState;

  constructor(public room: Party.Room) {
    this.state = {
      roomId: room.id,
      hostId: "",
      universeId: "",
      songs: [],
      currentSongIndex: 0,
      state: "idle",
      players: new Map(),
      responses: new Map(),
    };
  }

  async onConnect(conn: Party.Connection) {
    console.log(`[${this.room.id}] Connection: ${conn.id}`);
    // Envoyer l'état actuel au nouveau client
    conn.send(JSON.stringify({ type: "state_sync", state: this.serializeState() }));
  }

  async onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message);
      const parsed = MessageSchema.parse(data);

      switch (parsed.type) {
        case "join":
          this.handleJoin(parsed, sender);
          break;
        case "start":
          this.handleStart(parsed, sender);
          break;
        case "answer":
          this.handleAnswer(parsed, sender);
          break;
        case "next":
          this.handleNext(parsed, sender);
          break;
      }
    } catch (error) {
      console.error(`[${this.room.id}] Invalid message:`, error);
      sender.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
    }
  }

  async onClose(conn: Party.Connection) {
    console.log(`[${this.room.id}] Disconnection: ${conn.id}`);
    // Marquer le joueur comme déconnecté (ne pas le supprimer immédiatement)
    // Si 0 joueurs connectés pendant >30s, PartyKit va auto-hibernate
  }

  handleJoin(msg: { playerId: string; displayName: string }, sender: Party.Connection) {
    const isFirstPlayer = this.state.players.size === 0;

    this.state.players.set(msg.playerId, {
      id: msg.playerId,
      displayName: msg.displayName,
      score: 0,
      incorrect: 0,
      isHost: isFirstPlayer,
    });

    if (isFirstPlayer) {
      this.state.hostId = msg.playerId;
    }

    this.broadcast({ type: "players_update", players: Array.from(this.state.players.values()) });
  }

  handleStart(msg: { hostId: string }, sender: Party.Connection) {
    // Validation: est-ce bien le host ?
    if (msg.hostId !== this.state.hostId) {
      sender.send(JSON.stringify({ type: "error", message: "Only host can start" }));
      return;
    }

    if (this.state.state !== "idle") {
      sender.send(JSON.stringify({ type: "error", message: "Game already started" }));
      return;
    }

    this.state.state = "playing";
    this.state.currentSongIndex = 0;

    this.broadcast({
      type: "game_started",
      currentSongIndex: 0,
      state: "playing",
    });
  }

  handleAnswer(msg: { playerId: string; songId: string; workId: string | null }, sender: Party.Connection) {
    // Vérifier que le joueur existe
    const player = this.state.players.get(msg.playerId);
    if (!player) {
      sender.send(JSON.stringify({ type: "error", message: "Player not found" }));
      return;
    }

    // Déduplication: a-t-il déjà répondu ?
    const responseKey = `${msg.songId}-${msg.playerId}`;
    if (this.state.responses.has(responseKey)) {
      const existing = this.state.responses.get(responseKey)!;
      sender.send(JSON.stringify({
        type: "answer_recorded",
        rank: existing.rank,
        points: existing.points,
        isCorrect: existing.isCorrect,
      }));
      return;
    }

    // Trouver la bonne réponse
    const song = this.state.songs.find(s => s.id === msg.songId);
    if (!song) {
      sender.send(JSON.stringify({ type: "error", message: "Song not found" }));
      return;
    }

    const isCorrect = msg.workId === song.workId;

    // Calculer le rang (nombre de bonnes réponses déjà enregistrées + 1)
    let rank = 1;
    this.state.responses.forEach(r => {
      if (r.songId === msg.songId && r.isCorrect) {
        rank++;
      }
    });

    // Calculer les points (formule: max(1, nbJoueurs - rang + 1))
    const activePlayers = this.state.players.size;
    const points = isCorrect ? Math.max(1, activePlayers - rank + 1) : 0;

    // Enregistrer la réponse
    this.state.responses.set(responseKey, {
      songId: msg.songId,
      playerId: msg.playerId,
      workId: msg.workId,
      isCorrect,
      rank: isCorrect ? rank : 0,
      points,
      timestamp: Date.now(),
    });

    // Mettre à jour le score du joueur
    player.score += points;
    if (!isCorrect) {
      player.incorrect += 1;
    }

    // Notifier le joueur
    sender.send(JSON.stringify({
      type: "answer_recorded",
      rank: isCorrect ? rank : 0,
      points,
      isCorrect,
    }));

    // Broadcaster la mise à jour des scores
    this.broadcast({
      type: "players_update",
      players: Array.from(this.state.players.values()),
    });

    // Vérifier si tous les joueurs ont répondu
    const currentSongResponses = Array.from(this.state.responses.values())
      .filter(r => r.songId === msg.songId);

    if (currentSongResponses.length === this.state.players.size) {
      this.broadcast({ type: "all_players_answered" });
    }
  }

  handleNext(msg: { hostId: string }, sender: Party.Connection) {
    if (msg.hostId !== this.state.hostId) {
      sender.send(JSON.stringify({ type: "error", message: "Only host can go next" }));
      return;
    }

    if (this.state.currentSongIndex >= this.state.songs.length - 1) {
      // Fin de partie
      this.state.state = "results";
      this.broadcast({
        type: "game_ended",
        state: "results",
        players: Array.from(this.state.players.values()),
      });
      return;
    }

    this.state.currentSongIndex++;
    this.broadcast({
      type: "song_changed",
      currentSongIndex: this.state.currentSongIndex,
    });
  }

  broadcast(message: any) {
    this.room.broadcast(JSON.stringify(message));
  }

  serializeState() {
    return {
      roomId: this.state.roomId,
      hostId: this.state.hostId,
      currentSongIndex: this.state.currentSongIndex,
      state: this.state.state,
      players: Array.from(this.state.players.values()),
    };
  }
}
```

#### Points clés
- Validation Zod de tous les messages entrants
- Calcul des rangs en temps réel (comptage des bonnes réponses déjà enregistrées)
- Déduplication automatique (Map avec clé `songId-playerId`)
- Broadcast immédiat après chaque action
- State machine simple (idle → playing → results)

#### Validation
- [ ] Serveur démarre sans erreur TypeScript
- [ ] Logs clairs dans la console PartyKit

---

### Étape 1.3 : Créer le hook client (Jours 5-6)

**Priorité**: 🔴 CRITIQUE

#### Créer `src/hooks/usePartyKitRoom.ts`

**Responsabilités**:
- Établir connexion WebSocket
- Envoyer les messages au serveur
- Recevoir les broadcasts et mettre à jour l'état local
- Gérer reconnexion automatique

```typescript
import { useEffect, useState, useCallback, useRef } from "react";
import PartySocket from "partysocket";
import { Room, RoomPlayer, Song } from "@/types";

interface UsePartyKitRoomOptions {
  roomId?: string;
  playerId?: string;
  displayName?: string;
}

export const usePartyKitRoom = ({ roomId, playerId, displayName }: UsePartyKitRoomOptions) => {
  const [room, setRoom] = useState<Partial<Room>>({
    state: "idle",
    currentSongIndex: 0,
    songs: [],
  });
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<PartySocket | null>(null);

  // Connexion WebSocket
  useEffect(() => {
    if (!roomId) return;

    const partyHost = process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999";
    const socket = new PartySocket({
      host: partyHost,
      room: roomId,
    });

    socket.addEventListener("open", () => {
      console.log(`[PartyKit] Connected to room ${roomId}`);
      setIsConnected(true);

      // Rejoindre immédiatement
      if (playerId && displayName) {
        socket.send(JSON.stringify({ type: "join", playerId, displayName }));
      }
    });

    socket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.error("[PartyKit] Invalid message:", error);
      }
    });

    socket.addEventListener("close", () => {
      console.log(`[PartyKit] Disconnected from room ${roomId}`);
      setIsConnected(false);
    });

    socket.addEventListener("error", (error) => {
      console.error("[PartyKit] WebSocket error:", error);
    });

    socketRef.current = socket;

    return () => {
      socket.close();
    };
  }, [roomId, playerId, displayName]);

  const handleMessage = (message: any) => {
    switch (message.type) {
      case "state_sync":
        setRoom((prev) => ({ ...prev, ...message.state }));
        break;

      case "players_update":
        setPlayers(message.players);
        break;

      case "game_started":
        setRoom((prev) => ({
          ...prev,
          state: "playing",
          currentSongIndex: message.currentSongIndex,
        }));
        break;

      case "song_changed":
        setRoom((prev) => ({
          ...prev,
          currentSongIndex: message.currentSongIndex,
        }));
        break;

      case "game_ended":
        setRoom((prev) => ({ ...prev, state: "results" }));
        setPlayers(message.players);
        break;

      case "all_players_answered":
        // Peut être utilisé pour afficher un indicateur UI
        break;

      case "answer_recorded":
        // Géré localement dans useMultiplayerGame
        break;

      case "error":
        console.error("[PartyKit] Server error:", message.message);
        break;
    }
  };

  const startGame = useCallback(async () => {
    if (!playerId || !socketRef.current) {
      return { success: false, error: "Not connected" };
    }

    socketRef.current.send(JSON.stringify({ type: "start", hostId: playerId }));
    return { success: true };
  }, [playerId]);

  const goNextSong = useCallback(async () => {
    if (!playerId || !socketRef.current) {
      return { success: false, error: "Not connected" };
    }

    socketRef.current.send(JSON.stringify({ type: "next", hostId: playerId }));
    return { success: true };
  }, [playerId]);

  const submitAnswer = useCallback(
    async (selectedWorkId: string | null, isCorrect: boolean) => {
      if (!playerId || !socketRef.current || !room.songs) {
        return { success: false, error: "Not ready" };
      }

      const currentSong = room.songs[room.currentSongIndex ?? 0];
      if (!currentSong) {
        return { success: false, error: "No current song" };
      }

      return new Promise<{ success: boolean; data?: any; error?: string }>((resolve) => {
        const handleResponse = (event: MessageEvent) => {
          const message = JSON.parse(event.data);
          if (message.type === "answer_recorded") {
            socketRef.current?.removeEventListener("message", handleResponse);
            resolve({
              success: true,
              data: { rank: message.rank, points: message.points },
            });
          } else if (message.type === "error") {
            socketRef.current?.removeEventListener("message", handleResponse);
            resolve({ success: false, error: message.message });
          }
        };

        socketRef.current?.addEventListener("message", handleResponse);

        socketRef.current?.send(
          JSON.stringify({
            type: "answer",
            playerId,
            songId: currentSong.id,
            workId: selectedWorkId,
          })
        );

        // Timeout après 5s
        setTimeout(() => {
          socketRef.current?.removeEventListener("message", handleResponse);
          resolve({ success: false, error: "Timeout" });
        }, 5000);
      });
    },
    [playerId, room.songs, room.currentSongIndex]
  );

  const currentSong = room.songs?.[room.currentSongIndex ?? 0] ?? null;
  const isHost = players.some((p) => p.id === playerId && p.isHost);

  return {
    room: room as Room,
    players,
    currentSong,
    currentSongIndex: room.currentSongIndex ?? 0,
    state: room.state ?? "idle",
    isConnected,
    isHost,
    startGame,
    goNextSong,
    submitAnswer,
    responses: [], // À implémenter si besoin
    canGoNext: false, // À calculer si besoin
    allPlayersAnswered: false, // Peut être déduit des broadcasts
  };
};
```

#### Points clés
- Reconnexion automatique gérée par `partysocket`
- Messages typés et validés
- Gestion des erreurs et timeouts
- API compatible avec l'ancien `useRoom`

#### Validation
- [ ] Hook compile sans erreur TypeScript
- [ ] Connexion établie avec le serveur local

---

### Étape 1.4 : Adapter useMultiplayerGame (Jour 7)

**Priorité**: 🔴 CRITIQUE

#### Modifier `src/hooks/useMultiplayerGame.ts`

Remplacer l'import:
```typescript
// Ancien
import { useRoom } from "@/hooks/useRoom";

// Nouveau
import { usePartyKitRoom } from "@/hooks/usePartyKitRoom";
```

Adapter l'appel:
```typescript
const {
  room,
  players,
  // ... reste identique
} = usePartyKitRoom({ roomId, playerId, displayName: "Player Name" });
```

#### Points clés
- L'API de `usePartyKitRoom` est conçue pour être compatible avec l'ancien `useRoom`
- Minimal de changements nécessaires
- Tester que le jeu fonctionne de bout en bout

#### Validation
- [ ] Compilation réussie
- [ ] Le jeu démarre en local
- [ ] Les réponses sont enregistrées
- [ ] Les scores s'incrémentent

---

### Étape 1.5 : Configuration Room (Jour 8)

**Priorité**: 🔴 CRITIQUE

#### Problème
Le serveur PartyKit a besoin de connaître la playlist (songs, universeId, allowedWorks) au démarrage de la room.

#### Solution 1 : Message d'initialisation
```typescript
// Côté client, après join
socket.send(JSON.stringify({
  type: "configure",
  universeId,
  songs,
  allowedWorks,
  options: { noSeek: true }
}));
```

Ajouter un handler `handleConfigure` dans `party/index.ts`.

#### Solution 2 : Persistance dans Durable Object Storage
Sauvegarder la config dans `room.storage` lors de la création de la room.

```typescript
// party/index.ts
async onStart() {
  const config = await this.room.storage.get("config");
  if (config) {
    this.state = { ...this.state, ...config };
  }
}

handleConfigure(msg: { universeId: string; songs: Song[]; ... }) {
  this.state.universeId = msg.universeId;
  this.state.songs = msg.songs;
  // ...
  await this.room.storage.put("config", { universeId: msg.universeId, songs: msg.songs });
}
```

#### Recommandation
Utiliser **Solution 1** pour le Niveau 1 (plus simple), puis migrer vers Solution 2 au Niveau 2.

---

### Étape 1.6 : Supprimer le code legacy (Jour 9)

**Priorité**: 🟡 IMPORTANT (après validation complète)

#### Fichiers à supprimer
- `cleanup-service/` (dossier complet)
- `src/app/api/cleanup-room/route.ts`
- `src/hooks/useRoom.ts` (ancien hook Firestore)
- Fonctions Firestore dans `src/services/firebase/rooms.ts` liées au temps réel:
  - `subscribeRoom`
  - `subscribePlayers`
  - `subscribeResponsesForSong`
  - `heartbeatPlayer`

#### Fichiers à garder
- `createRoom` (peut être utilisée pour persister l'état final)
- `submitAnswer` (backup Firestore optionnel)

#### Validation
- [ ] Build Next.js réussit
- [ ] Aucune référence à `useRoom` dans le code
- [ ] Cleanup-service supprimé de Railway

---

### Étape 1.7 : Tests manuels (Jour 10)

**Priorité**: 🔴 CRITIQUE

#### Scénarios à tester

**Test 1 : Happy path (solo)**
1. Créer une room
2. Démarrer le jeu
3. Répondre à 3 morceaux (bon/mauvais/bon)
4. Vérifier que les scores s'incrémentent correctement
5. Passer au morceau suivant
6. Terminer le jeu

**Test 2 : Multiplayer (2 joueurs)**
1. Joueur A crée la room (devient host)
2. Joueur B rejoint la room
3. Vérifier que les 2 joueurs se voient dans la liste
4. Host démarre le jeu
5. Joueur A répond en 2s → rang 1
6. Joueur B répond en 5s → rang 2
7. Vérifier que A a plus de points que B
8. Host passe au morceau suivant
9. Répéter 3 fois

**Test 3 : Reconnexion**
1. Créer une room avec 2 joueurs
2. Démarrer le jeu
3. Joueur B ferme son navigateur
4. Joueur B rouvre et rejoint la même room
5. Vérifier qu'il retrouve son score

**Test 4 : Déconnexion host**
1. Créer une room avec 2 joueurs
2. Host démarre le jeu
3. Host ferme son navigateur
4. Vérifier que le jeu continue (ou qu'un nouveau host est promu - à implémenter)

**Test 5 : Double soumission**
1. Répondre à un morceau
2. Tenter de répondre une 2ème fois au même morceau
3. Vérifier que le rang/points ne changent pas

#### Checklist de validation
- [ ] Latence perçue <100ms (chronomètre)
- [ ] Aucune erreur console
- [ ] Scores cohérents entre joueurs
- [ ] Reconnexion fonctionne
- [ ] Cleanup automatique (attendre 2min après départ de tous les joueurs, vérifier que la room n'existe plus)

---

### Récapitulatif Niveau 1

**Durée estimée**: 10 jours (2 semaines calendaires)

**Livrables**:
- ✅ Serveur PartyKit fonctionnel (`party/index.ts`)
- ✅ Hook client WebSocket (`usePartyKitRoom.ts`)
- ✅ Calcul points/rangs côté serveur
- ✅ Cleanup automatique
- ✅ Code legacy supprimé
- ✅ Tests manuels validés

**Métriques de succès**:
- Latence P95 < 100ms (mesurée manuellement)
- 0 erreur console en mode production
- Jeu stable avec 4 joueurs simultanés

**Déploiement**:
```bash
# Déployer PartyKit
npm run deploy:partykit

# Déployer Vercel (avec NEXT_PUBLIC_PARTYKIT_HOST)
vercel --prod
```

**Variables d'environnement à ajouter**:
```env
NEXT_PUBLIC_PARTYKIT_HOST=your-project.partykit.dev
```

---

## Niveau 2 : SOLIDE (3-4 semaines)

**Objectif**: Améliorer l'UX et la fiabilité pour un usage réel

**Priorité**: 🟡 IMPORTANT

**Prérequis**: Niveau 1 complété et déployé

---

### Étape 2.1 : Time-sync basique (Semaine 3)

**Priorité**: 🟡 IMPORTANT

#### Objectif
Synchroniser les horloges client/serveur pour un départ audio simultané (±100ms).

#### Créer `src/hooks/useSyncedTime.ts`

**Algorithme NTP simplifié**:
1. Client envoie `{type: "sync", t0: performance.now()}`
2. Serveur répond `{type: "sync_response", t0, t1: serverTime}`
3. Client calcule offset: `offset = t1 - t0 - rtt/2` (approximation)

```typescript
import { useEffect, useState, useCallback } from "react";
import PartySocket from "partysocket";

export const useSyncedTime = (socket: PartySocket | null) => {
  const [offset, setOffset] = useState(0);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [drift, setDrift] = useState(0);

  const sync = useCallback(() => {
    if (!socket) return;

    const t0 = performance.now();
    const message = JSON.stringify({ type: "sync", t0 });

    const handleResponse = (event: MessageEvent) => {
      const t3 = performance.now();
      const data = JSON.parse(event.data);

      if (data.type === "sync_response") {
        const { t0: sent, t1: serverTime } = data;
        const rtt = t3 - sent;
        const calculatedOffset = serverTime - sent - rtt / 2;

        // Moyenne glissante sur 5 mesures
        setOffset((prev) => (prev * 0.8 + calculatedOffset * 0.2));
        setDrift(Math.abs(calculatedOffset - offset));
        setLastSync(Date.now());

        socket.removeEventListener("message", handleResponse);
      }
    };

    socket.addEventListener("message", handleResponse);
    socket.send(message);

    // Timeout
    setTimeout(() => {
      socket.removeEventListener("message", handleResponse);
    }, 2000);
  }, [socket, offset]);

  // Sync initial puis toutes les 10s
  useEffect(() => {
    if (!socket) return;

    sync(); // Sync immédiat

    const interval = setInterval(sync, 10000);
    return () => clearInterval(interval);
  }, [socket, sync]);

  const now = useCallback(() => {
    return performance.now() + offset;
  }, [offset]);

  return { now, offset, drift, lastSync };
};
```

#### Adapter `party/index.ts`

Ajouter un handler pour le message `sync`:

```typescript
case "sync":
  sender.send(JSON.stringify({
    type: "sync_response",
    t0: data.t0,
    t1: Date.now(),
  }));
  break;
```

#### Intégration dans le jeu

Broadcaster le timestamp de départ:
```typescript
// Quand le host clique "start"
this.broadcast({
  type: "game_started",
  startAt: Date.now() + 3000, // Démarre dans 3 secondes
});
```

Côté client:
```typescript
// Dans useAudioPlayer
if (message.type === "game_started") {
  const delay = message.startAt - syncedTime.now();
  setTimeout(() => {
    loadTrack(currentSong.audioUrl, true);
  }, delay);
}
```

#### Validation
- [ ] Offset calculé en ms (afficher dans console)
- [ ] 2 clients démarrent l'audio à <100ms d'écart (test manuel avec chrono)

---

### Étape 2.2 : Préchargement audio amélioré (Semaine 3)

**Priorité**: 🟡 IMPORTANT

#### Objectif
Précharger les 3 prochains tracks pour éliminer les blancs audio.

#### Modifier `src/hooks/useAudioPlayer.ts`

Ajouter un cache LRU simple:

```typescript
const preloadCache = useRef<Map<string, HTMLAudioElement>>(new Map());
const MAX_CACHE_SIZE = 5;

const preloadTrack = useCallback((src: string) => {
  if (preloadCache.current.has(src)) return;

  const audio = createAudioElement();
  audio.src = src;
  audio.load();

  preloadCache.current.set(src, audio);

  // Éviction LRU si cache trop grand
  if (preloadCache.current.size > MAX_CACHE_SIZE) {
    const firstKey = preloadCache.current.keys().next().value;
    const oldAudio = preloadCache.current.get(firstKey);
    oldAudio?.pause();
    oldAudio!.src = "";
    preloadCache.current.delete(firstKey);
  }
}, []);

const loadTrack = useCallback((src: string, autoplay = false) => {
  // Vérifier si déjà préchargé
  if (preloadCache.current.has(src)) {
    const cachedAudio = preloadCache.current.get(src)!;
    audioRef.current = cachedAudio;
    preloadCache.current.delete(src);
  } else {
    // Charger normalement
    audioRef.current.src = src;
    audioRef.current.load();
  }

  if (autoplay) {
    audioRef.current.play();
  }
}, []);
```

#### Préchargement automatique

Dans `useMultiplayerGame.ts`:
```typescript
useEffect(() => {
  if (!room || !currentSong) return;

  // Précharger les 3 prochains
  const nextTracks = room.songs
    .slice(currentSongIndex + 1, currentSongIndex + 4)
    .map(s => s.audioUrl)
    .filter(Boolean);

  nextTracks.forEach(url => preloadTrack(url));
}, [currentSongIndex, room]);
```

#### Validation
- [ ] Network tab Chrome: les 3 prochains MP3 sont téléchargés en avance
- [ ] Passage au morceau suivant instantané (pas de blanc)

---

### Étape 2.3 : Logs structurés + Sentry (Semaine 4)

**Priorité**: 🟡 IMPORTANT

#### Installer Sentry

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

#### Configurer `sentry.client.config.ts`

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% des transactions
  beforeSend(event, hint) {
    // Filtrer les erreurs non critiques
    if (event.exception?.values?.[0]?.type === "NetworkError") {
      return null;
    }
    return event;
  },
});
```

#### Logs structurés serveur

Dans `party/index.ts`:
```typescript
const log = (level: string, event: string, data: any) => {
  console.log(JSON.stringify({
    level,
    event,
    roomId: this.room.id,
    timestamp: Date.now(),
    ...data,
  }));
};

// Utilisation
log("info", "answer_submitted", { playerId, songId, rank, points });
log("error", "invalid_message", { error: error.message });
```

#### Capturer erreurs critiques

```typescript
// Côté client
try {
  await submitAnswer(workId, isCorrect);
} catch (error) {
  Sentry.captureException(error, {
    tags: { feature: "submit_answer" },
    contexts: { game: { roomId, songId } },
  });
}
```

#### Validation
- [ ] Erreurs apparaissent dans le dashboard Sentry
- [ ] Logs serveur en JSON valide
- [ ] Aucune donnée personnelle loggée

---

### Étape 2.4 : Tests unitaires (Semaine 4)

**Priorité**: 🟡 IMPORTANT

#### Installer Vitest

```bash
npm install -D vitest @vitest/ui
```

#### Créer `vitest.config.ts`

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

#### Tester le calcul des points

Créer `party/scoring.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

function computePoints(rank: number, activePlayers: number): number {
  if (activePlayers <= 0) return 0;
  return Math.max(1, activePlayers - rank + 1);
}

describe("computePoints", () => {
  it("should give max points to rank 1", () => {
    expect(computePoints(1, 5)).toBe(5);
  });

  it("should give 1 point to last rank", () => {
    expect(computePoints(5, 5)).toBe(1);
  });

  it("should compute correctly for middle ranks", () => {
    expect(computePoints(3, 5)).toBe(3);
  });

  it("should return 0 if no active players", () => {
    expect(computePoints(1, 0)).toBe(0);
  });

  it("should always give at least 1 point", () => {
    expect(computePoints(10, 5)).toBe(1);
  });
});
```

#### Ajouter script dans `package.json`

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

#### Validation
- [ ] `npm test` passe tous les tests
- [ ] Coverage >80% sur `scoring.ts`

---

### Récapitulatif Niveau 2

**Durée estimée**: 2 semaines supplémentaires (4 semaines total depuis début)

**Livrables**:
- ✅ Time-sync client/serveur (±100ms)
- ✅ Préchargement intelligent des tracks
- ✅ Logs structurés + Sentry
- ✅ Tests unitaires (scoring, state machine)

**Métriques de succès**:
- Audio sync <100ms entre clients
- Taux d'erreur <1% sur Sentry
- Tests coverage >70%

---

## Niveau 3 : PRODUCTION-READY (3-4 mois)

**Objectif**: Application scalable, testée et monitorée niveau entreprise

**Priorité**: 🟢 NICE-TO-HAVE

**Prérequis**: Niveau 2 complété et validé en production avec vrais utilisateurs

---

### Étape 3.1 : Tone.js + AudioBuffer (Semaine 5-6)

**Priorité**: 🟢 NICE-TO-HAVE

#### Pourquoi Tone.js ?
- Scheduling microseconde (vs ~100ms avec `<audio>`)
- Décoder MP3 → AudioBuffer en avance (0 latence au play)
- Effets audio (fondu, reverb, equalizer)
- Transport synchronisé

#### Installation

```bash
npm install tone
```

#### Créer `src/lib/audio/TonePlayer.ts`

```typescript
import * as Tone from "tone";

export class TonePlayer {
  private player: Tone.Player | null = null;
  private bufferCache = new Map<string, AudioBuffer>();

  async init() {
    await Tone.start();
    console.log("Tone.js audio context started");
  }

  async loadBuffer(url: string): Promise<AudioBuffer> {
    if (this.bufferCache.has(url)) {
      return this.bufferCache.get(url)!;
    }

    const buffer = await Tone.Buffer.fromUrl(url);
    const audioBuffer = buffer.get() as AudioBuffer;
    this.bufferCache.set(url, audioBuffer);
    return audioBuffer;
  }

  async play(url: string, startTime?: number) {
    const buffer = await this.loadBuffer(url);

    if (this.player) {
      this.player.stop();
      this.player.dispose();
    }

    this.player = new Tone.Player(buffer).toDestination();

    if (startTime) {
      // Schedule exact start time
      this.player.sync().start(startTime);
      Tone.Transport.start();
    } else {
      this.player.start();
    }
  }

  pause() {
    this.player?.stop();
  }

  dispose() {
    this.player?.dispose();
    this.bufferCache.clear();
  }
}
```

#### Intégration dans `useAudioPlayer`

```typescript
const [tonePlayer] = useState(() => new TonePlayer());

useEffect(() => {
  tonePlayer.init();
  return () => tonePlayer.dispose();
}, []);

const loadTrack = useCallback(async (src: string, autoplay = false) => {
  if (autoplay) {
    await tonePlayer.play(src);
  } else {
    await tonePlayer.loadBuffer(src); // Préchargement
  }
}, [tonePlayer]);
```

#### Fallback `<audio>`

```typescript
const supportsWebAudio = typeof AudioContext !== "undefined";

const player = supportsWebAudio ? tonePlayer : htmlAudioPlayer;
```

#### Validation
- [ ] Audio démarre sans latence perçue
- [ ] Scheduling synchronisé avec time-sync
- [ ] Fallback fonctionne sur Safari iOS

---

### Étape 3.2 : Store Zustand (Semaine 7)

**Priorité**: 🟢 NICE-TO-HAVE

#### Installation

```bash
npm install zustand
```

#### Créer `src/store/gameStore.ts`

```typescript
import { create } from "zustand";
import { Room, RoomPlayer, RoomResponse, Song } from "@/types";

interface GameState {
  // State
  room: Room | null;
  players: RoomPlayer[];
  responses: RoomResponse[];

  // Derived (calculés)
  currentSong: Song | null;
  allPlayersAnswered: boolean;

  // Actions
  setRoom: (room: Room) => void;
  setPlayers: (players: RoomPlayer[]) => void;
  addResponse: (response: RoomResponse) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  room: null,
  players: [],
  responses: [],

  currentSong: null,
  allPlayersAnswered: false,

  setRoom: (room) => {
    set({ room });

    // Recalculer derived state
    const currentSong = room.songs[room.currentSongIndex] ?? null;
    set({ currentSong });
  },

  setPlayers: (players) => {
    set({ players });

    // Recalculer allPlayersAnswered
    const { responses, currentSong } = get();
    if (!currentSong) return;

    const answeredPlayers = new Set(
      responses
        .filter(r => r.songId === currentSong.id)
        .map(r => r.playerId)
    );

    const allAnswered = answeredPlayers.size >= players.filter(p => p.connected).length;
    set({ allPlayersAnswered: allAnswered });
  },

  addResponse: (response) => {
    set((state) => ({
      responses: [...state.responses, response],
    }));

    // Recalculer allPlayersAnswered
    get().setPlayers(get().players);
  },

  reset: () => {
    set({
      room: null,
      players: [],
      responses: [],
      currentSong: null,
      allPlayersAnswered: false,
    });
  },
}));
```

#### Utilisation dans les composants

```typescript
// Au lieu de props drilling
const currentSong = useGameStore((state) => state.currentSong);
const players = useGameStore((state) => state.players);

// Re-render seulement si currentSong change
```

#### Hydratation depuis WebSocket

Dans `usePartyKitRoom.ts`:
```typescript
import { useGameStore } from "@/store/gameStore";

const handleMessage = (message: any) => {
  switch (message.type) {
    case "players_update":
      useGameStore.getState().setPlayers(message.players);
      break;
    // ...
  }
};
```

#### Validation
- [ ] Profiler: moins de re-renders
- [ ] State centralisé accessible partout
- [ ] Pas de prop drilling

---

### Étape 3.3 : Tests intégration WebSocket (Semaine 8)

**Priorité**: 🟢 NICE-TO-HAVE

#### Installer ws pour tests

```bash
npm install -D ws @types/ws
```

#### Créer `party/__tests__/integration.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import WebSocket from "ws";

describe("PartyKit Integration", () => {
  let host: WebSocket;
  let player: WebSocket;
  const roomId = "test-room-" + Date.now();

  beforeEach(async () => {
    host = new WebSocket(`ws://localhost:1999/parties/main/${roomId}`);
    await new Promise((resolve) => host.once("open", resolve));

    player = new WebSocket(`ws://localhost:1999/parties/main/${roomId}`);
    await new Promise((resolve) => player.once("open", resolve));
  });

  afterEach(() => {
    host.close();
    player.close();
  });

  it("should allow host to start game", async () => {
    // Host joins
    host.send(JSON.stringify({ type: "join", playerId: "host", displayName: "Host" }));

    // Player joins
    player.send(JSON.stringify({ type: "join", playerId: "player1", displayName: "Player 1" }));

    // Wait for players_update
    await new Promise((resolve) => {
      host.on("message", (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === "players_update" && msg.players.length === 2) {
          resolve(null);
        }
      });
    });

    // Host starts game
    host.send(JSON.stringify({ type: "start", hostId: "host" }));

    // Wait for game_started
    const started = await new Promise<boolean>((resolve) => {
      player.on("message", (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === "game_started") {
          resolve(true);
        }
      });
    });

    expect(started).toBe(true);
  });

  it("should prevent double answer", async () => {
    // Setup: join + start
    // ...

    // Player answers
    player.send(JSON.stringify({
      type: "answer",
      playerId: "player1",
      songId: "song1",
      workId: "work1",
    }));

    const firstResponse = await new Promise<any>((resolve) => {
      player.on("message", (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === "answer_recorded") {
          resolve(msg);
        }
      });
    });

    // Try to answer again
    player.send(JSON.stringify({
      type: "answer",
      playerId: "player1",
      songId: "song1",
      workId: "work2", // Different answer
    }));

    const secondResponse = await new Promise<any>((resolve) => {
      player.on("message", (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === "answer_recorded") {
          resolve(msg);
        }
      });
    });

    // Should return same rank/points
    expect(secondResponse.rank).toBe(firstResponse.rank);
    expect(secondResponse.points).toBe(firstResponse.points);
  });
});
```

#### Ajouter script

```json
{
  "scripts": {
    "test:integration": "vitest --run party/__tests__"
  }
}
```

#### Validation
- [ ] Tests passent sur serveur local
- [ ] CI/CD exécute les tests automatiquement

---

### Étape 3.4 : Observabilité complète (Semaine 9-10)

**Priorité**: 🟢 NICE-TO-HAVE

#### Métriques custom avec Axiom

**Installation**:
```bash
npm install @axiomhq/js
```

**Créer `src/lib/metrics.ts`**:
```typescript
import { Axiom } from "@axiomhq/js";

const axiom = new Axiom({
  token: process.env.AXIOM_TOKEN!,
  orgId: process.env.AXIOM_ORG_ID!,
});

export const trackMetric = (event: string, data: Record<string, any>) => {
  axiom.ingest("blind-test-metrics", [
    {
      _time: new Date().toISOString(),
      event,
      ...data,
    },
  ]);
};

// Exemples
trackMetric("answer_submitted", {
  roomId: "abc",
  playerId: "123",
  latencyMs: 45,
  rank: 1,
});

trackMetric("game_completed", {
  roomId: "abc",
  duration: 180000, // 3min
  playersCount: 4,
});
```

#### Dashboard Axiom

Créer des graphes:
- **Latency P50/P95/P99**: histogram de `latencyMs`
- **Error rate**: count where `event = "error"` / count all
- **Completion rate**: (games completed) / (games started)
- **Avg players**: average `playersCount`

#### Alertes

Configurer dans Axiom:
- Si `error_rate > 5%` sur 5min → Slack notification
- Si `latencyMs P95 > 500ms` → Email

#### Validation
- [ ] Dashboards affichent les métriques en temps réel
- [ ] Alertes fonctionnent (tester en provoquant une erreur)

---

### Étape 3.5 : Feature flags avec Vercel Edge Config (Semaine 11)

**Priorité**: 🟢 NICE-TO-HAVE

#### Setup Edge Config

1. Créer un Edge Config dans le dashboard Vercel
2. Ajouter une clé `features` avec valeur:
   ```json
   {
     "usePartyKitTransport": true,
     "useToneJs": false,
     "useZustand": true
   }
   ```

#### Installer SDK

```bash
npm install @vercel/edge-config
```

#### Créer `src/lib/features.ts`

```typescript
import { get } from "@vercel/edge-config";

export const getFeatureFlags = async () => {
  try {
    const flags = await get("features");
    return flags as Record<string, boolean>;
  } catch {
    // Fallback si Edge Config indispo
    return {
      usePartyKitTransport: true,
      useToneJs: false,
      useZustand: false,
    };
  }
};
```

#### Utilisation

```typescript
// Dans useMultiplayerGame
const [flags, setFlags] = useState({ usePartyKitTransport: true });

useEffect(() => {
  getFeatureFlags().then(setFlags);
}, []);

const roomHook = flags.usePartyKitTransport ? usePartyKitRoom : useFirestoreRoom;
```

#### Rollout progressif

Modifier la config pour activer progressivement:
```json
{
  "usePartyKitTransport": {
    "percentage": 25,
    "enabled": true
  }
}
```

Adapter le code:
```typescript
const shouldUsePartyKit = flags.usePartyKitTransport.enabled &&
  Math.random() < flags.usePartyKitTransport.percentage / 100;
```

#### Validation
- [ ] Flag change en temps réel sans redéployer
- [ ] Rollout progressif fonctionne
- [ ] Rollback instantané (toggle à `false`)

---

### Étape 3.6 : Documentation complète (Semaine 12)

**Priorité**: 🟢 NICE-TO-HAVE

#### Créer `docs/ARCHITECTURE.md`

```markdown
# Architecture Blind Test Multiplayer

## Stack technique
- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Temps réel**: PartyKit (Cloudflare Durable Objects)
- **Audio**: Tone.js + Web Audio API
- **State**: Zustand
- **Backend**: Firebase (auth + contenu), Cloudflare R2 (audio files)
- **Monitoring**: Sentry + Axiom

## Flux de données

[Diagramme]

Client A → PartyKit Room ← Client B
    ↓
Firestore (backup async)

## Protocole WebSocket

### Messages client → serveur
- `join`: {playerId, displayName}
- `start`: {hostId}
- `answer`: {playerId, songId, workId}
- `next`: {hostId}
- `sync`: {t0} (time-sync)

### Messages serveur → client
- `state_sync`: État complet de la room
- `players_update`: Liste des joueurs
- `game_started`: Démarrage partie
- `song_changed`: Changement de morceau
- `answer_recorded`: Confirmation réponse
- `all_players_answered`: Tous ont répondu

## Calcul des points

Formule: `max(1, nbJoueurs - rang + 1)`

Exemples:
- 5 joueurs, rang 1 → 5 points
- 5 joueurs, rang 3 → 3 points
- 5 joueurs, rang 5 → 1 point

## Time-sync

Algorithme NTP simplifié:
1. Client envoie t0
2. Serveur répond t1
3. Client calcule offset = t1 - t0 - rtt/2
4. Moyenne glissante sur 5 mesures
5. Précision cible: ±30ms
```

#### Créer `docs/DEPLOYMENT.md`

Détailler:
- Variables d'environnement
- Procédure de déploiement
- Rollback
- Monitoring
- Incidents connus

#### Créer `docs/PROTOCOL.md`

Spécifier tous les messages en détail avec exemples JSON.

#### Validation
- [ ] Nouveau dev peut setup le projet en <30min
- [ ] Documentation à jour avec le code

---

### Récapitulatif Niveau 3

**Durée estimée**: 8 semaines supplémentaires (12 semaines total)

**Livrables**:
- ✅ Tone.js + scheduling microseconde
- ✅ Zustand pour state management
- ✅ Tests intégration + e2e
- ✅ Dashboards Axiom + alertes
- ✅ Feature flags Vercel
- ✅ Documentation complète

**Métriques de succès**:
- Audio sync <20ms
- Test coverage >85%
- Uptime >99.9%
- Temps de résolution incident <1h

---

## Annexes

### A. Checklist de migration complète

**Avant de commencer**
- [ ] Backup de la base Firestore
- [ ] Tag git `pre-partykit-migration`
- [ ] Feature flag activé en mode "Firestore only"

**Niveau 1**
- [ ] PartyKit setup et tests locaux
- [ ] usePartyKitRoom implémenté
- [ ] Tests manuels validés
- [ ] Déployé en staging
- [ ] Feature flag activé à 5% prod

**Niveau 2**
- [ ] Time-sync validé (<100ms)
- [ ] Préchargement fluide
- [ ] Sentry configuré
- [ ] Tests unitaires >70% coverage
- [ ] Feature flag à 50% prod

**Niveau 3**
- [ ] Tone.js déployé (opt-in)
- [ ] Zustand migré
- [ ] Tests e2e passent
- [ ] Dashboards opérationnels
- [ ] Feature flag à 100% prod

**Cleanup final**
- [ ] Code Firestore legacy supprimé
- [ ] Cleanup-service décommissionné
- [ ] Documentation mise à jour
- [ ] Post-mortem rédigé

---

### B. Commandes utiles

**Développement local**
```bash
# Démarrer Next.js
npm run dev

# Démarrer PartyKit (port 1999)
npm run dev:partykit

# Tests
npm test
npm run test:ui
npm run test:integration

# Build
npm run build
```

**Déploiement**
```bash
# PartyKit
npm run deploy:partykit

# Vercel
vercel --prod

# Vérifier les logs PartyKit
partykit tail your-project
```

**Monitoring**
```bash
# Logs Sentry
open https://sentry.io/organizations/your-org/issues/

# Dashboards Axiom
open https://app.axiom.co/your-org/dashboards

# Edge Config
vercel env pull
```

---

### C. Variables d'environnement

**`.env.local`** (développement)
```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
# ... autres configs Firebase

# PartyKit
NEXT_PUBLIC_PARTYKIT_HOST=localhost:1999

# R2
NEXT_PUBLIC_R2_PUBLIC_URL=https://your-bucket.r2.dev

# Observabilité (optionnel en dev)
NEXT_PUBLIC_SENTRY_DSN=
AXIOM_TOKEN=
```

**Vercel (production)**
```env
# Ajouter via dashboard Vercel ou CLI
NEXT_PUBLIC_PARTYKIT_HOST=your-project.partykit.dev
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
AXIOM_TOKEN=xaat-xxx
AXIOM_ORG_ID=your-org
EDGE_CONFIG=ecfg_xxx
```

---

### D. Ressources

**Documentation officielle**
- [PartyKit](https://docs.partykit.io)
- [Tone.js](https://tonejs.github.io)
- [Zustand](https://docs.pmnd.rs/zustand)
- [Sentry Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Axiom](https://axiom.co/docs)

**Exemples de code**
- [PartyKit multiplayer game](https://github.com/partykit/partykit/tree/main/examples)
- [Tone.js examples](https://tonejs.github.io/examples/)

**Communauté**
- PartyKit Discord
- Tone.js GitHub Discussions

---

### E. Estimation budgétaire

**Coûts mensuels estimés (100 parties/jour)**

| Service | Plan | Coût |
|---------|------|------|
| PartyKit | Pro | $20/mois |
| Vercel | Pro | $20/mois |
| Sentry | Team | $26/mois |
| Axiom | Free | $0 |
| Firebase | Blaze (pay-as-you-go) | ~$5/mois |
| R2 Storage | Pay-as-you-go | ~$2/mois |
| **TOTAL** | | **~$73/mois** |

**Note**: Coûts réels dépendent du trafic. Avec 1000 parties/jour, compter ~$150-200/mois.

---

### F. Glossaire

- **PartyKit**: Platform temps réel basée sur Cloudflare Durable Objects
- **Durable Object**: Instance serveur isolée avec state persistant (1 room = 1 DO)
- **WebSocket**: Protocole de communication bidirectionnelle temps réel
- **Time-sync**: Synchronisation des horloges client/serveur
- **NTP**: Network Time Protocol (protocole de synchronisation d'horloge)
- **AudioBuffer**: Format audio décodé en mémoire (Web Audio API)
- **LRU Cache**: Least Recently Used (éviction du plus ancien élément)
- **Feature flag**: Toggle pour activer/désactiver une fonctionnalité sans redéployer
- **Edge Config**: Key-value store ultra-rapide de Vercel (latence <1ms)

---

**Dernière mise à jour**: 2025-12-02
**Version**: 1.0.0
**Auteur**: Assistant Claude
