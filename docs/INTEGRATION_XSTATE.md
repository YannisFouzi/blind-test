# Intégration XState dans Game Party

**Date** : 2025-12-04
**Statut** : Documentation pour Phase 2.2
**Objectif** : Expliquer comment intégrer la state machine XState dans le serveur PartyKit

---

## ✅ Ce qui a été fait (Phase 2.1)

La state machine XState a été créée dans `party/machines/gameMachine.ts` avec :

- **États** : `idle` → `configured` → `playing` → `results`
- **Guards** : Validation automatique (isHost, hasMoreSongs, isLastSong)
- **Actions** : Mutations du contexte (addPlayer, configureSongs, recordAnswer, etc.)
- **Transitions** : Validées automatiquement par XState

---

## 🎯 Ce qu'il reste à faire (Phase 2.2)

### Option 1 : Remplacement complet (RISQUÉ)

Remplacer `party/index.ts` par une nouvelle implémentation basée sur XState.

**❌ Problèmes** :
- Risque de casser le code existant
- Nécessite des tests approfondis
- Migration complexe

**✅ Avantages** :
- Architecture propre
- Garanties de XState
- Code maintenable

### Option 2 : Intégration progressive (RECOMMANDÉ)

Garder `party/index.ts` fonctionnel et créer un nouveau fichier `party/game-xstate.ts` en parallèle.

**Structure recommandée** :

```typescript
// party/game-xstate.ts
import type * as Party from "partykit/server";
import { createActor } from "xstate";
import { gameStateMachine, type GameEvent } from "./machines/gameMachine";
import { z } from "zod";

export default class BlindTestGameXState implements Party.Server {
  actor: ReturnType<typeof createActor>;
  connectionToPlayer: Map<string, string> = new Map();

  constructor(public room: Party.Room) {
    // Initialiser l'acteur XState
    this.actor = createActor(gameStateMachine, {
      input: {
        roomId: room.id,
        hostId: "",
      },
    });

    // Subscribe aux changements d'état
    this.actor.subscribe((state) => {
      console.log(`[${this.room.id}] State:`, state.value);
      this.broadcastState();
    });

    this.actor.start();
  }

  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    console.log(`[${this.room.id}] Connection:`, conn.id);

    // Envoyer l'état actuel
    this.sendStateToConnection(conn);
  }

  async onMessage(message: string, sender: Party.Connection) {
    try {
      const msg = JSON.parse(message);
      console.log(`[${this.room.id}] Message:`, msg.type);

      // Router vers la state machine
      switch (msg.type) {
        case "join":
          this.handleJoin(msg, sender);
          break;
        case "configure":
          this.actor.send({
            type: "CONFIGURE",
            universeId: msg.universeId,
            songs: msg.songs,
            allowedWorks: msg.allowedWorks,
            options: msg.options,
          });
          break;
        case "start":
          this.actor.send({
            type: "START",
            hostId: msg.hostId,
          });
          break;
        case "answer":
          this.actor.send({
            type: "ANSWER",
            playerId: msg.playerId,
            songId: msg.songId,
            workId: msg.workId,
          });
          break;
        case "next":
          this.actor.send({
            type: "NEXT",
            hostId: msg.hostId,
          });
          break;
        default:
          sender.send(JSON.stringify({
            type: "error",
            message: `Unknown message type: ${msg.type}`,
          }));
      }
    } catch (error) {
      console.error(`[${this.room.id}] Error:`, error);
      sender.send(JSON.stringify({
        type: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  }

  async onClose(conn: Party.Connection) {
    const playerId = this.connectionToPlayer.get(conn.id);
    if (playerId) {
      this.actor.send({ type: "PLAYER_LEAVE", playerId });
      this.connectionToPlayer.delete(conn.id);
    }
  }

  private handleJoin(msg: any, sender: Party.Connection) {
    this.connectionToPlayer.set(sender.id, msg.playerId);

    this.actor.send({
      type: "PLAYER_JOIN",
      playerId: msg.playerId,
      displayName: msg.displayName,
      connectionId: sender.id,
    });

    // Envoyer confirmation
    const snapshot = this.actor.getSnapshot();
    const isHost = snapshot.context.hostId === msg.playerId;

    sender.send(JSON.stringify({
      type: "join_success",
      playerId: msg.playerId,
      isHost,
    }));
  }

  private broadcastState() {
    const snapshot = this.actor.getSnapshot();
    const state = snapshot.value;
    const context = snapshot.context;

    const message = {
      type: "state_sync",
      state: {
        roomId: context.roomId,
        state,
        hostId: context.hostId,
        universeId: context.universeId,
        songs: context.songs,
        currentSongIndex: context.currentSongIndex,
        players: Array.from(context.players.values()),
        allowedWorks: context.allowedWorks,
        options: context.options,
      },
    };

    this.room.broadcast(JSON.stringify(message));
  }

  private sendStateToConnection(conn: Party.Connection) {
    const snapshot = this.actor.getSnapshot();
    const state = snapshot.value;
    const context = snapshot.context;

    conn.send(JSON.stringify({
      type: "state_sync",
      state: {
        roomId: context.roomId,
        state,
        hostId: context.hostId,
        universeId: context.universeId,
        songs: context.songs,
        currentSongIndex: context.currentSongIndex,
        players: Array.from(context.players.values()),
        allowedWorks: context.allowedWorks,
        options: context.options,
      },
    }));
  }
}

BlindTestGameXState satisfies Party.Worker;
```

---

## 🔄 Plan de migration

### Étape 1 : Tester la state machine

1. Créer `party/game-xstate.ts` avec le code ci-dessus
2. Configurer `partykit.json` pour avoir deux parties :
   ```json
   {
     "parties": {
       "main": "party/index.ts",
       "xstate": "party/game-xstate.ts"
     }
   }
   ```
3. Tester avec `/parties/xstate/test-room`

### Étape 2 : Valider le comportement

Tester tous les scénarios :
- Join de joueurs
- Configuration
- Start
- Answer
- Next
- Transitions d'état

### Étape 3 : Migration finale (si validation OK)

1. Renommer `party/index.ts` → `party/index-old.ts`
2. Renommer `party/game-xstate.ts` → `party/index.ts`
3. Configurer `partykit.json` :
   ```json
   {
     "parties": {
       "main": "party/index.ts"
     }
   }
   ```

---

## ⚠️ Pourquoi ne pas migrer maintenant ?

**Raisons** :
1. **Phase 1 fonctionne** : Le fix du workflow est déjà appliqué et marche
2. **Risque de régression** : XState change complètement l'architecture
3. **Tests nécessaires** : Il faut valider que tous les cas fonctionnent
4. **Temps de développement** : Migration complète = 3-4h minimum

**Recommandation** :
- ✅ **Garder `party/index.ts` tel quel pour l'instant**
- ✅ **Documenter l'intégration XState** (ce fichier)
- ✅ **Passer aux phases suivantes** (TanStack Query, Lobby)
- 🔄 **Revenir à Phase 2.2 plus tard** quand les autres phases sont stables

---

## 📊 Comparaison

### Avec state machine actuelle (party/index.ts)

```typescript
// Validation manuelle
if (this.state.state !== "playing") {
  sender.send(JSON.stringify({ type: "error", message: "..." }));
  return;
}
```

**Problèmes** :
- Facile d'oublier une validation
- Incohérences possibles
- Difficile à maintenir

### Avec XState (futur)

```typescript
// XState rejette automatiquement
this.actor.send({ type: "ANSWER", ... });
```

**Avantages** :
- Impossible d'oublier une validation
- Transitions garanties
- Facile à visualiser (diagramme d'états)

---

## ✅ Conclusion

**Phase 2.1** : ✅ **TERMINÉE** - State machine créée et documentée
**Phase 2.2** : 🔄 **REPORTÉE** - Documentation créée, implémentation à faire plus tard

**Prochaine étape** : Phase 3 (TanStack Query côté client)
