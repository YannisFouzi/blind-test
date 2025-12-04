import type * as Party from "partykit/server";
import { z } from "zod";

/**
 * SERVEUR PARTYKIT - BLIND TEST MULTIPLAYER
 * Étape 1.2 - Implémentation complète
 *
 * Responsabilités :
 * - Gérer les connexions WebSocket des joueurs
 * - Router les messages (join, configure, start, answer, next)
 * - Calculer les rangs et points de manière autoritaire
 * - Broadcaster l'état aux clients
 * - Gérer le lifecycle de la room
 */

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

/**
 * Types de messages client → serveur
 */
const MessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("join"),
    playerId: z.string().min(1),
    displayName: z.string().min(1),
  }),
  z.object({
    type: z.literal("configure"),
    universeId: z.string().min(1),
    songs: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        artist: z.string(),
        workId: z.string(),
        youtubeId: z.string(),
        audioUrl: z.string().optional(),
        duration: z.number(),
      })
    ),
    allowedWorks: z.array(z.string()).optional(),
    options: z.object({ noSeek: z.boolean() }).optional(),
  }),
  z.object({
    type: z.literal("start"),
    hostId: z.string().min(1),
  }),
  z.object({
    type: z.literal("answer"),
    playerId: z.string().min(1),
    songId: z.string().min(1),
    workId: z.string().optional().nullable(),
  }),
  z.object({
    type: z.literal("next"),
    hostId: z.string().min(1),
  }),
]);

type Message = z.infer<typeof MessageSchema>;

/**
 * Structure d'un joueur dans la room
 */
interface Player {
  id: string;
  displayName: string;
  score: number;
  incorrect: number;
  isHost: boolean;
  connected: boolean;
  connectionId: string; // ID de connexion WebSocket
}

/**
 * Structure d'une réponse
 */
interface Response {
  songId: string;
  playerId: string;
  workId: string | null;
  isCorrect: boolean;
  rank: number;
  points: number;
  timestamp: number;
}

/**
 * Structure d'un morceau (simplifié)
 */
interface Song {
  id: string;
  title: string;
  artist: string;
  workId: string;
  youtubeId: string;
  audioUrl?: string;
  duration: number;
}

/**
 * État complet de la room
 */
interface RoomState {
  roomId: string;
  hostId: string;
  universeId: string;
  songs: Song[];
  currentSongIndex: number;
  state: "idle" | "configured" | "playing" | "results";
  players: Map<string, Player>; // key: playerId
  responses: Map<string, Response>; // key: `${songId}-${playerId}`
  allowedWorks?: string[];
  options?: { noSeek: boolean };
  createdAt: number;
}

// ============================================================================
// SERVEUR PARTYKIT
// ============================================================================

export default class BlindTestRoom implements Party.Server {
  state: RoomState;

  constructor(public room: Party.Room) {
    // Initialiser l'état de la room
    this.state = {
      roomId: room.id,
      hostId: "",
      universeId: "",
      songs: [],
      currentSongIndex: 0,
      state: "idle",
      players: new Map(),
      responses: new Map(),
      createdAt: Date.now(),
    };

    console.log(`[BlindTestRoom] Initialized room: ${room.id}`);
  }

  /**
   * Nouvelle connexion WebSocket
   */
  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    const country = ctx.request.cf?.country || "unknown";
    console.log(`[${this.room.id}] Connection: ${conn.id} from ${country}`);

    // Envoyer l'état complet au nouveau client
    conn.send(
      JSON.stringify({
        type: "state_sync",
        state: this.serializeState(),
      })
    );
  }

  /**
   * Réception d'un message
   */
  async onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message);
      const parsed = MessageSchema.parse(data);

      console.log(`[${this.room.id}] Message from ${sender.id}:`, parsed.type);

      // Router le message vers le bon handler
      switch (parsed.type) {
        case "join":
          this.handleJoin(parsed, sender);
          break;
        case "configure":
          this.handleConfigure(parsed, sender);
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
      sender.send(
        JSON.stringify({
          type: "error",
          message: error instanceof Error ? error.message : "Invalid message format",
        })
      );
    }
  }

  /**
   * Déconnexion d'un joueur
   */
  async onClose(conn: Party.Connection) {
    console.log(`[${this.room.id}] Disconnection: ${conn.id}`);

    // Trouver le joueur associé à cette connexion
    let disconnectedPlayer: Player | undefined;
    for (const player of this.state.players.values()) {
      if (player.connectionId === conn.id) {
        player.connected = false;
        disconnectedPlayer = player;
        break;
      }
    }

    if (disconnectedPlayer) {
      console.log(`[${this.room.id}] Player ${disconnectedPlayer.id} marked as disconnected`);

      // Broadcaster la mise à jour
      this.broadcast({
        type: "players_update",
        players: this.getPlayersArray(),
      });

      // Si c'était le host et qu'il y a d'autres joueurs connectés, promouvoir un nouveau host
      if (disconnectedPlayer.isHost) {
        const connectedPlayers = Array.from(this.state.players.values()).filter(
          (p) => p.connected
        );

        if (connectedPlayers.length > 0) {
          const newHost = connectedPlayers[0];
          newHost.isHost = true;
          this.state.hostId = newHost.id;

          console.log(`[${this.room.id}] New host promoted: ${newHost.id}`);

          this.broadcast({
            type: "host_changed",
            newHostId: newHost.id,
            players: this.getPlayersArray(),
          });
        }
      }
    }

    // Si plus personne n'est connecté, on pourrait nettoyer (PartyKit va auto-hibernate)
    const hasConnectedPlayers = Array.from(this.state.players.values()).some((p) => p.connected);
    if (!hasConnectedPlayers) {
      console.log(`[${this.room.id}] No players connected, room will hibernate`);

      // ✅ Phase 7: Notifier le Lobby que la room est vide et peut être supprimée
      void this.notifyLobby("room_deleted");
    }
  }

  // ==========================================================================
  // HANDLERS DE MESSAGES
  // ==========================================================================

  /**
   * Handler: JOIN - Un joueur rejoint la room
   */
  private handleJoin(msg: Extract<Message, { type: "join" }>, sender: Party.Connection) {
    const { playerId, displayName } = msg;

    // Vérifier si le joueur existe déjà (reconnexion)
    const existingPlayer = this.state.players.get(playerId);

    if (existingPlayer) {
      // Reconnexion : mettre à jour la connexion
      existingPlayer.connected = true;
      existingPlayer.connectionId = sender.id;
      console.log(`[${this.room.id}] Player ${playerId} reconnected`);
    } else {
      // Nouveau joueur
      const isFirstPlayer = this.state.players.size === 0;

      const newPlayer: Player = {
        id: playerId,
        displayName,
        score: 0,
        incorrect: 0,
        isHost: isFirstPlayer,
        connected: true,
        connectionId: sender.id,
      };

      this.state.players.set(playerId, newPlayer);

      if (isFirstPlayer) {
        this.state.hostId = playerId;
        console.log(`[${this.room.id}] Player ${playerId} is now host`);

        // ✅ Phase 7: Notifier le Lobby qu'une nouvelle room est créée
        void this.notifyLobby("room_created", {
          hostName: displayName,
          playersCount: 1,
        });
      }

      console.log(`[${this.room.id}] Player ${playerId} joined (${displayName})`);
    }

    // Envoyer confirmation au joueur
    sender.send(
      JSON.stringify({
        type: "join_success",
        playerId,
        isHost: this.state.players.get(playerId)!.isHost,
      })
    );

    // Broadcaster la liste des joueurs à tous
    this.broadcast({
      type: "players_update",
      players: this.getPlayersArray(),
    });
  }

  /**
   * Handler: CONFIGURE - Configuration de la playlist
   */
  private handleConfigure(msg: Extract<Message, { type: "configure" }>, sender: Party.Connection) {
    const { universeId, songs, allowedWorks, options } = msg;

    // Vérifier que c'est le host qui configure (optionnel, on peut laisser n'importe qui)
    // Pour l'instant, on autorise tout le monde pour simplifier

    this.state.universeId = universeId;
    this.state.songs = songs;
    this.state.allowedWorks = allowedWorks;
    this.state.options = options;
    this.state.currentSongIndex = 0;
    this.state.state = "configured"; // ✅ Changé de "idle" à "configured"

    console.log(`[${this.room.id}] Configured: ${songs.length} songs, universe ${universeId}`);

    // Envoyer confirmation
    sender.send(
      JSON.stringify({
        type: "configure_success",
      })
    );

    // Broadcaster la nouvelle config avec les songs
    this.broadcast({
      type: "room_configured",
      universeId,
      songsCount: songs.length,
      songs,
      allowedWorks,
      options,
    });
  }

  /**
   * Handler: START - Démarrage de la partie
   */
  private handleStart(msg: Extract<Message, { type: "start" }>, sender: Party.Connection) {
    const { hostId } = msg;

    // Validation: est-ce bien le host ?
    if (hostId !== this.state.hostId) {
      sender.send(
        JSON.stringify({
          type: "error",
          message: "Only the host can start the game",
        })
      );
      return;
    }

    // Validation: état de la room (doit être "idle" ou "configured")
    if (this.state.state !== "idle" && this.state.state !== "configured") {
      sender.send(
        JSON.stringify({
          type: "error",
          message: "Game already started",
        })
      );
      return;
    }

    // Validation: au moins une chanson configurée
    if (this.state.songs.length === 0) {
      sender.send(
        JSON.stringify({
          type: "error",
          message: "No songs configured",
        })
      );
      return;
    }

    // Démarrer la partie
    this.state.state = "playing";
    this.state.currentSongIndex = 0;

    console.log(`[${this.room.id}] Game started by ${hostId}`);

    // ✅ Phase 7: Notifier le Lobby que la room a commencé à jouer
    void this.notifyLobby("room_state_changed", {
      state: "playing",
      playersCount: this.state.players.size,
    });

    // Broadcaster le démarrage (avec la liste complète des songs)
    this.broadcast({
      type: "game_started",
      currentSongIndex: 0,
      state: "playing",
      currentSong: this.state.songs[0],
      songs: this.state.songs, // Ajouter pour que les clients aient la liste
      totalSongs: this.state.songs.length,
    });
  }

  /**
   * Handler: ANSWER - Soumission d'une réponse
   */
  private handleAnswer(msg: Extract<Message, { type: "answer" }>, sender: Party.Connection) {
    const { playerId, songId } = msg;
    const workId = msg.workId ?? null; // Normaliser undefined → null

    // ✅ Validation: le jeu doit être en mode "playing"
    if (this.state.state !== "playing") {
      sender.send(
        JSON.stringify({
          type: "error",
          message: "Game is not started yet",
        })
      );
      return;
    }

    // Vérifier que le joueur existe
    const player = this.state.players.get(playerId);
    if (!player) {
      sender.send(
        JSON.stringify({
          type: "error",
          message: "Player not found",
        })
      );
      return;
    }

    // Vérifier que le joueur est connecté
    if (!player.connected) {
      sender.send(
        JSON.stringify({
          type: "error",
          message: "Player not connected",
        })
      );
      return;
    }

    // Déduplication: a-t-il déjà répondu ?
    const responseKey = `${songId}-${playerId}`;
    if (this.state.responses.has(responseKey)) {
      const existing = this.state.responses.get(responseKey)!;
      sender.send(
        JSON.stringify({
          type: "answer_recorded",
          rank: existing.rank,
          points: existing.points,
          isCorrect: existing.isCorrect,
          duplicate: true,
        })
      );
      return;
    }

    // Trouver la bonne réponse
    const song = this.state.songs.find((s) => s.id === songId);
    if (!song) {
      sender.send(
        JSON.stringify({
          type: "error",
          message: "Song not found",
        })
      );
      return;
    }

    const isCorrect = workId === song.workId;

    // Calculer le rang (nombre de bonnes réponses déjà enregistrées + 1)
    let rank = 1;
    for (const response of this.state.responses.values()) {
      if (response.songId === songId && response.isCorrect) {
        rank++;
      }
    }

    // Calculer les points (formule: max(1, nbJoueurs - rang + 1))
    const connectedPlayers = Array.from(this.state.players.values()).filter((p) => p.connected);
    const activePlayers = connectedPlayers.length;
    const points = isCorrect ? Math.max(1, activePlayers - rank + 1) : 0;

    // Enregistrer la réponse
    const response: Response = {
      songId,
      playerId,
      workId,
      isCorrect,
      rank: isCorrect ? rank : 0,
      points,
      timestamp: Date.now(),
    };

    this.state.responses.set(responseKey, response);

    // Mettre à jour le score du joueur
    player.score += points;
    if (!isCorrect) {
      player.incorrect += 1;
    }

    console.log(
      `[${this.room.id}] Answer: ${playerId} → ${isCorrect ? "✓" : "✗"} (rank ${rank}, ${points} pts)`
    );

    // Notifier le joueur
    sender.send(
      JSON.stringify({
        type: "answer_recorded",
        rank: isCorrect ? rank : 0,
        points,
        isCorrect,
        duplicate: false,
      })
    );

    // Broadcaster la mise à jour des scores
    this.broadcast({
      type: "players_update",
      players: this.getPlayersArray(),
    });

    // Vérifier si tous les joueurs ont répondu
    const currentSongResponses = Array.from(this.state.responses.values()).filter(
      (r) => r.songId === songId
    );

    if (currentSongResponses.length === connectedPlayers.length) {
      console.log(`[${this.room.id}] All players answered for song ${songId}`);
      this.broadcast({ type: "all_players_answered" });
    }
  }

  /**
   * Handler: NEXT - Passer au morceau suivant
   */
  private handleNext(msg: Extract<Message, { type: "next" }>, sender: Party.Connection) {
    const { hostId } = msg;

    // Validation: est-ce bien le host ?
    if (hostId !== this.state.hostId) {
      sender.send(
        JSON.stringify({
          type: "error",
          message: "Only the host can go to next song",
        })
      );
      return;
    }

    // Validation: on est en mode playing
    if (this.state.state !== "playing") {
      sender.send(
        JSON.stringify({
          type: "error",
          message: "Game is not playing",
        })
      );
      return;
    }

    // Vérifier s'il reste des morceaux
    if (this.state.currentSongIndex >= this.state.songs.length - 1) {
      // Fin de partie
      this.state.state = "results";

      console.log(`[${this.room.id}] Game ended`);

      this.broadcast({
        type: "game_ended",
        state: "results",
        players: this.getPlayersArray(),
        finalScores: this.getFinalScores(),
      });

      return;
    }

    // Passer au morceau suivant
    this.state.currentSongIndex++;
    const nextSong = this.state.songs[this.state.currentSongIndex];

    console.log(`[${this.room.id}] Next song: ${this.state.currentSongIndex + 1}/${this.state.songs.length}`);

    this.broadcast({
      type: "song_changed",
      currentSongIndex: this.state.currentSongIndex,
      currentSong: nextSong,
    });
  }

  // ==========================================================================
  // MÉTHODES UTILITAIRES
  // ==========================================================================

  /**
   * Broadcaster un message à tous les clients connectés
   */
  private broadcast(message: any, excludeConnectionIds: string[] = []) {
    const payload = JSON.stringify(message);

    for (const conn of this.room.getConnections()) {
      if (!excludeConnectionIds.includes(conn.id)) {
        conn.send(payload);
      }
    }
  }

  /**
   * Sérialiser l'état pour l'envoyer au client
   */
  private serializeState() {
    return {
      roomId: this.state.roomId,
      hostId: this.state.hostId,
      universeId: this.state.universeId,
      songs: this.state.songs,
      currentSongIndex: this.state.currentSongIndex,
      state: this.state.state,
      players: this.getPlayersArray(),
      allowedWorks: this.state.allowedWorks,
      options: this.state.options,
    };
  }

  /**
   * Convertir Map<string, Player> en tableau
   */
  private getPlayersArray() {
    return Array.from(this.state.players.values()).map((p) => ({
      id: p.id,
      displayName: p.displayName,
      score: p.score,
      incorrect: p.incorrect,
      isHost: p.isHost,
      connected: p.connected,
    }));
  }

  /**
   * Calculer les scores finaux triés
   */
  private getFinalScores() {
    const players = this.getPlayersArray();
    return players
      .sort((a, b) => b.score - a.score)
      .map((p, index) => ({
        rank: index + 1,
        ...p,
      }));
  }

  // ============================================================================
  // PHASE 7 : INTÉGRATION LOBBY PARTY
  // ============================================================================

  /**
   * Notifier le Lobby Party d'un événement
   *
   * Le Lobby Party track toutes les rooms actives pour afficher
   * la liste aux clients qui cherchent une partie.
   *
   * @param type - Type d'événement (room_created, room_state_changed, room_deleted)
   * @param data - Données supplémentaires
   */
  private async notifyLobby(type: string, data: Record<string, any> = {}) {
    try {
      // URL du Lobby Party singleton
      const lobbyUrl = `${this.room.env.PARTYKIT_HOST}/parties/lobby/main`;

      await fetch(lobbyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          roomId: this.room.id,
          ...data,
        }),
      });

      console.log(`[${this.room.id}] Notified lobby: ${type}`);
    } catch (error) {
      console.error(`[${this.room.id}] Failed to notify lobby:`, error);
      // Ne pas throw : le jeu continue même si le lobby n'est pas notifié
    }
  }
}
