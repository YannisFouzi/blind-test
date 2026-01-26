import type * as Party from "partykit/server";
import { z } from "zod";

// ============================================================================
// SECURITY CONSTANTS & HELPERS
// ============================================================================

const PASSWORD_ITERATIONS = 100_000;
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_HASH_BYTES = 32;
const SESSION_TOKEN_BYTES = 32;
const SESSION_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes
const ATTEMPT_COOLDOWN_MS = 2_000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

const toBase64 = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes));
const fromBase64 = (value: string) =>
  Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

const timingSafeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
};

const hashPassword = async (password: string) => {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(PASSWORD_SALT_BYTES));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PASSWORD_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    PASSWORD_HASH_BYTES * 8
  );
  const hashBytes = new Uint8Array(derivedBits);
  return `${toBase64(salt)}:${toBase64(hashBytes)}`;
};

const verifyPassword = async (password: string, storedHash: string) => {
  const [saltB64, hashB64] = storedHash.split(":");
  if (!saltB64 || !hashB64) return false;
  const salt = fromBase64(saltB64);
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PASSWORD_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    PASSWORD_HASH_BYTES * 8
  );
  const hashBytes = new Uint8Array(derivedBits);
  const computedHash = toBase64(hashBytes);
  return timingSafeEqual(computedHash, hashB64);
};

const hashToken = async (token: string) => {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return toBase64(new Uint8Array(digest));
};

const generateToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(SESSION_TOKEN_BYTES));
  return toBase64(bytes);
};

/**
 * SERVEUR PARTYKIT - BLIND TEST MULTIPLAYER
 * Ã‰tape 1.2 - ImplÃ©mentation complÃ¨te
 *
 * ResponsabilitÃ©s :
 * - GÃ©rer les connexions WebSocket des joueurs
 * - Router les messages (join, configure, start, answer, next)
 * - Calculer les rangs et points de maniÃ¨re autoritaire
 * - Broadcaster l'Ã©tat aux clients
 * - GÃ©rer le lifecycle de la room
 */

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

/**
 * Types de messages client â†’ serveur
 */
const MessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("join"),
    playerId: z.string().min(1),
    displayName: z.string().min(1),
    password: z.string().min(1).optional(),
    token: z.string().min(1).optional(),
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
    hostId: z.string().optional(),
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
 * Structure d'une rÃ©ponse
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
 * Structure d'un morceau (simplifiÃ©)
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

interface AuthTokenRecord {
  playerId: string;
  expiresAt: number;
}

interface StoredAuthToken {
  tokenHash: string;
  playerId: string;
  expiresAt: number;
}

interface FailedAttempt {
  count: number;
  lastAttempt: number;
  lockUntil?: number;
}

/**
 * Ã‰tat complet de la room
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
  passwordHash?: string;
  authTokens: Map<string, AuthTokenRecord>;
  failedAttempts: Map<string, FailedAttempt>;
}

// ============================================================================
// SERVEUR PARTYKIT
// ============================================================================

export default class BlindTestRoom implements Party.Server {
  state: RoomState;
  private securityReady = false;
  private authenticatedConnections = new Set<string>();
  private connectionIps = new Map<string, string | null>();
  private globalCooldownUntil = 0;

  constructor(public room: Party.Room) {
    // Initialiser l'Ã©tat de la room
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
      passwordHash: undefined,
      authTokens: new Map(),
      failedAttempts: new Map(),
    };

    console.log(`[BlindTestRoom] Initialized room: ${room.id}`);
  }

  /**
   * Nouvelle connexion WebSocket
   */
  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    await this.ensureSecurityState();
    // Si une alarme de cleanup Ã©tait programmÃ©e, l'annuler car quelqu'un revient
    const existingAlarm = await this.room.storage.getAlarm();
    if (existingAlarm) {
      await this.room.storage.deleteAlarm();
      await this.room.storage.delete("roomIdForCleanup");
      console.log(`[${this.room.id}] Cleanup alarm canceled (player reconnected)`);
    }

    const country = ctx.request.cf?.country || "unknown";
    const ipHeader =
      ctx.request.headers.get("cf-connecting-ip") ||
      ctx.request.headers.get("x-forwarded-for") ||
      ctx.request.headers.get("x-real-ip");
    const ip = ipHeader ? ipHeader.split(",")[0].trim() : null;
    this.connectionIps.set(conn.id, ip);

    console.log(`[${this.room.id}] Connection: ${conn.id} from ${country}`, {
      ip: ip ?? "unknown",
      hasPassword: Boolean(this.state.passwordHash),
    });
  }

  /**
   * RÃ©ception d'un message
   */
  async onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message);
      const parsed = MessageSchema.parse(data);
      await this.ensureSecurityState();

      console.log(`[${this.room.id}] Message from ${sender.id}:`, parsed.type, parsed);

      if (parsed.type !== "join" && !this.authenticatedConnections.has(sender.id)) {
        sender.send(
          JSON.stringify({
            type: "error",
            message: "Not authenticated",
          })
        );
        return;
      }

      // Router le message vers le bon handler
      switch (parsed.type) {
        case "join":
          await this.handleJoin(parsed, sender);
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
   * DÃ©connexion d'un joueur
   */
  async onClose(conn: Party.Connection) {
    console.log(`[${this.room.id}] Disconnection: ${conn.id}`);
    this.authenticatedConnections.delete(conn.id);
    this.connectionIps.delete(conn.id);

    // Trouver le joueur associÃ© Ã  cette connexion
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

      // Broadcaster la mise Ã  jour
      this.broadcast({
        type: "players_update",
        players: this.getPlayersArray(),
      });

      // Si c'Ã©tait le host et qu'il y a d'autres joueurs connectÃ©s, promouvoir un nouveau host
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

    // Si plus personne n'est connectÃ©, programmer une alarme de cleanup (survit Ã  l'hibernation)
    const hasConnectedPlayers = Array.from(this.state.players.values()).some((p) => p.connected);
    if (!hasConnectedPlayers) {
      const existingAlarm = await this.room.storage.getAlarm();
      if (existingAlarm) {
        console.log(`[${this.room.id}] Cleanup alarm already pending`);
        return;
      }
      const connections = Array.from(this.room.getConnections());
      console.log(`[${this.room.id}] No players connected, scheduling cleanup alarm`, {
        remainingPlayers: this.state.players.size,
        connectionsCount: connections.length,
        connectionIds: connections.map((c) => c.id),
      });
      // Sauvegarder le roomId dans le storage (car this.room.id n'est pas accessible dans onAlarm)
      await this.room.storage.put("roomIdForCleanup", this.room.id);
      // Alarme dans 30 secondes - survit mÃªme si le serveur hiberne
      await this.room.storage.setAlarm(Date.now() + 30000);
    }
  }

  /**
   * Alarme de cleanup - appelÃ©e automatiquement par PartyKit aprÃ¨s le dÃ©lai
   * Survit Ã  l'hibernation du serveur
   * Note: this.room.id n'est pas accessible ici (limitation PartyKit)
   */
  async onAlarm() {
    // RÃ©cupÃ©rer le roomId depuis le storage (sauvegardÃ© avant l'alarme)
    const roomId = await this.room.storage.get<string>("roomIdForCleanup");
    if (!roomId) {
      console.log("[onAlarm] No roomId found in storage, skipping cleanup");
      return;
    }

    console.log(`[${roomId}] Cleanup alarm triggered, notifying lobby room_deleted`);

    // Notifier le lobby directement (sans passer par notifyLobby qui utilise this.room.id)
    try {
      const lobbyUrl = `${this.room.env.PARTYKIT_HOST}/parties/lobby/main`;
      await fetch(lobbyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "room_deleted",
          roomId,
        }),
      });
      console.log(`[${roomId}] Notified lobby: room_deleted`);
    } catch (error) {
      console.error(`[${roomId}] Failed to notify lobby:`, error);
    }

    // âœ… SUPPRIMER COMPLÃˆTEMENT L'Ã‰TAT DU DURABLE OBJECT
    // Cela supprime le fichier SQLite physique et libÃ¨re les ressources
    await this.room.storage.deleteAll();
    console.log(`[${roomId}] Room state deleted completely (SQLite file removed)`);
  }

  // ==========================================================================
  // SECURITY HELPERS
  // ==========================================================================

  private async ensureSecurityState() {
    if (this.securityReady) return;

    const storedHash = await this.room.storage.get<string>("passwordHash");
    if (storedHash) {
      this.state.passwordHash = storedHash;
    }

    const storedTokens = await this.room.storage.get<StoredAuthToken[]>("authTokens");
    if (storedTokens && storedTokens.length > 0) {
      const now = Date.now();
      const validTokens = storedTokens.filter((token) => token.expiresAt > now);
      this.state.authTokens = new Map(
        validTokens.map((token) => [token.tokenHash, { playerId: token.playerId, expiresAt: token.expiresAt }])
      );
      if (validTokens.length !== storedTokens.length) {
        await this.persistAuthTokens();
      }
    }

    this.securityReady = true;
  }

  private async persistPasswordHash() {
    if (this.state.passwordHash) {
      await this.room.storage.put("passwordHash", this.state.passwordHash);
      return;
    }
    await this.room.storage.delete("passwordHash");
  }

  private async persistAuthTokens() {
    const tokens: StoredAuthToken[] = [];
    for (const [tokenHash, value] of this.state.authTokens.entries()) {
      tokens.push({ tokenHash, playerId: value.playerId, expiresAt: value.expiresAt });
    }
    await this.room.storage.put("authTokens", tokens);
  }

  private async setRoomPassword(password: string) {
    const hashed = await hashPassword(password);
    this.state.passwordHash = hashed;
    await this.persistPasswordHash();
  }

  private async issueSessionToken(playerId: string) {
    const token = generateToken();
    const tokenHash = await hashToken(token);
    const expiresAt = Date.now() + SESSION_TOKEN_TTL_MS;
    this.state.authTokens.set(tokenHash, { playerId, expiresAt });
    await this.persistAuthTokens();
    return token;
  }

  private async validateToken(token: string, playerId: string) {
    const tokenHash = await hashToken(token);
    const record = this.state.authTokens.get(tokenHash);
    if (!record) return { ok: false };
    if (record.expiresAt <= Date.now()) {
      this.state.authTokens.delete(tokenHash);
      await this.persistAuthTokens();
      return { ok: false };
    }
    if (record.playerId !== playerId) return { ok: false };
    return { ok: true };
  }

  private getRateLimitKey(playerId: string, senderId: string) {
    const ip = this.connectionIps.get(senderId);
    if (ip) {
      return { key: `ip:${ip}`, hasIp: true };
    }
    return { key: `player:${playerId}`, hasIp: false };
  }

  private canAttemptPassword(key: string, hasIp: boolean) {
    const now = Date.now();
    if (!hasIp && this.globalCooldownUntil && now < this.globalCooldownUntil) {
      return { ok: false, message: "Trop de tentatives. Reessayez plus tard." };
    }

    const attempt = this.state.failedAttempts.get(key);
    if (attempt?.lockUntil && now < attempt.lockUntil) {
      return { ok: false, message: "Trop de tentatives. Reessayez plus tard." };
    }

    if (attempt && now - attempt.lastAttempt < ATTEMPT_COOLDOWN_MS) {
      return { ok: false, message: "Trop de tentatives. Reessayez plus tard." };
    }

    return { ok: true };
  }

  private recordFailedAttempt(key: string, hasIp: boolean) {
    const now = Date.now();
    const current = this.state.failedAttempts.get(key) ?? { count: 0, lastAttempt: 0 };
    const next: FailedAttempt = {
      count: current.count + 1,
      lastAttempt: now,
      lockUntil: current.lockUntil,
    };

    if (next.count >= MAX_FAILED_ATTEMPTS) {
      next.lockUntil = now + LOCKOUT_MS;
      if (!hasIp) {
        this.globalCooldownUntil = next.lockUntil;
      }
    }

    this.state.failedAttempts.set(key, next);
    return next;
  }

  private clearFailedAttempt(key: string) {
    this.state.failedAttempts.delete(key);
  }

  // ==========================================================================
  // HANDLERS DE MESSAGES
  // ==========================================================================

  /**
   * Handler: JOIN - Un joueur rejoint la room
   */
  private async handleJoin(msg: Extract<Message, { type: "join" }>, sender: Party.Connection) {
    await this.ensureSecurityState();
    const { playerId, displayName, password, token } = msg;
    const isFirstPlayer = this.state.players.size === 0;

    let sessionToken: string | undefined;

    if (this.state.passwordHash) {
      let tokenValid = false;

      if (token) {
        const tokenCheck = await this.validateToken(token, playerId);
        tokenValid = tokenCheck.ok;
      }

      if (!tokenValid) {
        if (!password) {
          sender.send(JSON.stringify({ type: "password_required" }));
          return;
        }

        const { key, hasIp } = this.getRateLimitKey(playerId, sender.id);
        const rateCheck = this.canAttemptPassword(key, hasIp);
        if (!rateCheck.ok) {
          sender.send(
            JSON.stringify({
              type: "error",
              message: rateCheck.message ?? "Trop de tentatives. Reessayez plus tard.",
            })
          );
          return;
        }

        const isValid = await verifyPassword(password, this.state.passwordHash);
        if (!isValid) {
          const attempt = this.recordFailedAttempt(key, hasIp);
          const lockedOut = Boolean(attempt.lockUntil && attempt.lockUntil > Date.now());
          sender.send(
            JSON.stringify({
              type: "error",
              message: lockedOut ? "Trop de tentatives. Reessayez plus tard." : "Mot de passe incorrect.",
            })
          );
          if (lockedOut) {
            sender.close(1008, "Too many attempts");
          }
          return;
        }

        this.clearFailedAttempt(key);
        sessionToken = await this.issueSessionToken(playerId);
      }
    } else if (isFirstPlayer && password) {
      await this.setRoomPassword(password);
      sessionToken = await this.issueSessionToken(playerId);
    }

    // Vérifier si le joueur existe déjà (reconnexion)
    const existingPlayer = this.state.players.get(playerId);

    if (existingPlayer) {
      if (existingPlayer.connectionId && existingPlayer.connectionId !== sender.id) {
        this.authenticatedConnections.delete(existingPlayer.connectionId);
      }
      // Reconnexion : mettre à jour la connexion
      existingPlayer.connected = true;
      existingPlayer.connectionId = sender.id;
      existingPlayer.displayName = displayName;
      console.log(`[${this.room.id}] Player ${playerId} reconnected`);
    } else {
      // Nouveau joueur
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

        // Phase 7: Notifier le Lobby qu'une nouvelle room est créée
        void this.notifyLobby("room_created", {
          hostName: displayName,
          playersCount: 1,
          hasPassword: Boolean(this.state.passwordHash),
        });
      }

      console.log(`[${this.room.id}] Player ${playerId} joined (${displayName}) | hostId=${this.state.hostId} | total=${this.state.players.size}`);
    }

    this.authenticatedConnections.add(sender.id);

    // Envoyer confirmation au joueur
    sender.send(
      JSON.stringify({
        type: "join_success",
        playerId,
        isHost: this.state.players.get(playerId)!.isHost,
        hostId: this.state.hostId,
        state: this.state.state,
        sessionToken,
      })
    );

    // Envoyer l'état complet au joueur (important pour les reconnexions)
    sender.send(
      JSON.stringify({
        type: "state_sync",
        state: this.serializeState(),
      })
    );

    // Broadcaster la liste des joueurs à tous
    this.broadcast({
      type: "players_update",
      players: this.getPlayersArray(),
    });

    console.log(`[${this.room.id}] handleJoin snapshot`, {
      hostId: this.state.hostId,
      state: this.state.state,
      songs: this.state.songs.length,
      players: this.state.players.size,
    });
  }

  /**
   * Handler: CONFIGURE - Configuration de la playlist
   */
  private handleConfigure(msg: Extract<Message, { type: "configure" }>, sender: Party.Connection) {
    console.log(`[${this.room.id}] ========== CONFIGURE MESSAGE RECEIVED ==========`);
    const { universeId, songs, allowedWorks, options, hostId: hostIdFromClient } = msg;
    const senderPlayer = Array.from(this.state.players.values()).find((p) => p.connectionId === sender.id);
    const senderId = senderPlayer?.id ?? hostIdFromClient;

    console.log(`[${this.room.id}] handleConfigure called`, {
      senderId,
      senderPlayer: senderPlayer?.id,
      senderConn: sender.id,
      expectedHostId: this.state.hostId,
      hostIdFromClient,
      universeId,
      songs: songs.length,
      allowedWorks: allowedWorks?.length ?? 0,
      options,
      state: this.state.state,
      allPlayers: Array.from(this.state.players.values()).map(p => ({ id: p.id, connId: p.connectionId })),
    });

    // Validation: seul l'host peut configurer
    if (!senderId || senderId !== this.state.hostId) {
      console.warn(
        `[${this.room.id}] CONFIGURE rejected: expected hostId=${this.state.hostId}, senderId=${senderId}, conn=${sender.id}`
      );
      sender.send(
        JSON.stringify({
          type: "error",
          message: "Only the host can configure the game",
        })
      );
      return;
    }

    // VÃ©rifier que c'est le host qui configure (optionnel, on peut laisser n'importe qui)
    // Pour l'instant, on autorise tout le monde pour simplifier

    this.state.universeId = universeId;
    this.state.songs = songs;
    this.state.allowedWorks = allowedWorks;
    this.state.options = options;
    this.state.currentSongIndex = 0;
    this.state.state = "configured"; // âœ… ChangÃ© de "idle" Ã  "configured"

    console.log(`[${this.room.id}] Configured: ${songs.length} songs, universe ${universeId}`);

    // Envoyer confirmation
    sender.send(
      JSON.stringify({
        type: "configure_success",
      })
    );

    // Notifier le Lobby que la room est configur?e avec l'univers choisi
    void this.notifyLobby("room_state_changed", {
      state: "configured",
      playersCount: this.state.players.size,
      universeId,
      hasPassword: Boolean(this.state.passwordHash),
    });

    // Broadcaster la nouvelle config avec les songs
    const broadcastMessage = {
      type: "room_configured",
      universeId,
      songsCount: songs.length,
      songs,
      allowedWorks,
      options,
    };
    const configConnections = Array.from(this.room.getConnections());
    console.log(`[${this.room.id}] Broadcasting room_configured`, {
      universeId,
      songsCount: songs.length,
      connectionsCount: configConnections.length,
      connectionIds: configConnections.map(c => c.id),
    });
    this.broadcast(broadcastMessage);
    console.log(`[${this.room.id}] room_configured broadcast DONE`);

    console.log(`[${this.room.id}] handleConfigure applied`, {
      universeId: this.state.universeId,
      songs: this.state.songs.length,
      state: this.state.state,
      players: this.state.players.size,
    });
  }

  /**
   * Handler: START - DÃ©marrage de la partie
   */
  private handleStart(msg: Extract<Message, { type: "start" }>, sender: Party.Connection) {
    console.log(`[${this.room.id}] ========== START MESSAGE RECEIVED ==========`);
    const { hostId } = msg;
    const senderPlayer = Array.from(this.state.players.values()).find((p) => p.connectionId === sender.id);

    console.log(`[${this.room.id}] handleStart called`, {
      hostId,
      senderPlayer: senderPlayer?.id,
      senderConn: sender.id,
      expectedHostId: this.state.hostId,
      state: this.state.state,
      songs: this.state.songs.length,
      players: this.state.players.size,
      allPlayers: Array.from(this.state.players.values()).map(p => ({ id: p.id, connId: p.connectionId })),
    });

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

    // Validation: Ã©tat de la room (doit Ãªtre "idle" ou "configured")
    if (this.state.state !== "idle" && this.state.state !== "configured") {
      sender.send(
        JSON.stringify({
          type: "error",
          message: "Game already started",
        })
      );
      return;
    }

    // Validation: au moins une chanson configurÃ©e
    if (this.state.songs.length === 0) {
      sender.send(
        JSON.stringify({
          type: "error",
          message: "No songs configured",
        })
      );
      return;
    }

    // DÃ©marrer la partie
    this.state.state = "playing";
    this.state.currentSongIndex = 0;

    console.log(`[${this.room.id}] Game started by hostId=${hostId} (conn=${sender.id}, senderPlayer=${senderPlayer?.id})`);

    // âœ… Phase 7: Notifier le Lobby que la room a commencÃ© Ã  jouer
    void this.notifyLobby("room_state_changed", { state: "playing", playersCount: this.state.players.size, universeId: this.state.universeId, hasPassword: Boolean(this.state.passwordHash), });

    // Broadcaster le dÃ©marrage (avec la liste complÃ¨te des songs)
    this.broadcast({
      type: "game_started",
      currentSongIndex: 0,
      state: "playing",
      currentSong: this.state.songs[0],
      songs: this.state.songs, // Ajouter pour que les clients aient la liste
      totalSongs: this.state.songs.length,
    });

    // âœ… FIX: Envoyer players_update pour initialiser hasAnsweredCurrentSong
    this.broadcast({
      type: "players_update",
      players: this.getPlayersArray(),
    });
  }

  /**
   * Handler: ANSWER - Soumission d'une rÃ©ponse
   */
  private handleAnswer(msg: Extract<Message, { type: "answer" }>, sender: Party.Connection) {
    const { playerId, songId } = msg;
    const workId = msg.workId ?? null; // Normaliser undefined â†’ null
    console.log(`[${this.room.id}] handleAnswer called`, {
      playerId,
      songId,
      workId,
      state: this.state.state,
      responses: this.state.responses.size,
      players: this.state.players.size,
    });

    // âœ… Validation: le jeu doit Ãªtre en mode "playing"
    if (this.state.state !== "playing") {
      sender.send(
        JSON.stringify({
          type: "error",
          message: "Game is not started yet",
        })
      );
      return;
    }

    // VÃ©rifier que le joueur existe
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

    // VÃ©rifier que le joueur est connectÃ©
    if (!player.connected) {
      sender.send(
        JSON.stringify({
          type: "error",
          message: "Player not connected",
        })
      );
      return;
    }

    // DÃ©duplication: a-t-il dÃ©jÃ  rÃ©pondu ?
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

    // Trouver la bonne rÃ©ponse
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

    // Calculer le rang (nombre de bonnes rÃ©ponses dÃ©jÃ  enregistrÃ©es + 1)
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

    // Enregistrer la rÃ©ponse
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

    // Mettre Ã  jour le score du joueur
    player.score += points;
    if (!isCorrect) {
      player.incorrect += 1;
    }

    console.log(
      `[${this.room.id}] Answer: ${playerId} â†’ ${isCorrect ? "âœ“" : "âœ—"} (rank ${rank}, ${points} pts)`
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

    // Broadcaster qu'un joueur a rÃ©pondu (sans rÃ©vÃ©ler si correct)
    this.broadcast({
      type: "player_answered",
      playerId,
      songId,
    });

    // Broadcaster la mise Ã  jour des scores et statuts
    this.broadcast({
      type: "players_update",
      players: this.getPlayersArray(),
    });

    // VÃ©rifier si tous les joueurs ont rÃ©pondu
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
    console.log(`[${this.room.id}] handleNext called`, {
      hostId: msg.hostId,
      expectedHostId: this.state.hostId,
      state: this.state.state,
      currentSongIndex: this.state.currentSongIndex,
      songs: this.state.songs.length,
    });
    const { hostId } = msg;
    const senderPlayer = Array.from(this.state.players.values()).find((p) => p.connectionId === sender.id);

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

    // VÃ©rifier s'il reste des morceaux
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

    // âœ… FIX: Envoyer players_update pour rÃ©initialiser hasAnsweredCurrentSong
    this.broadcast({
      type: "players_update",
      players: this.getPlayersArray(),
    });
  }

  // ==========================================================================
  // MÃ‰THODES UTILITAIRES
  // ==========================================================================

  /**
   * Broadcaster un message Ã  tous les clients connectÃ©s
   */
  private broadcast(message: any, excludeConnectionIds: string[] = []) {
    const payload = JSON.stringify(message);

    for (const conn of this.room.getConnections()) {
      if (!this.authenticatedConnections.has(conn.id)) {
        continue;
      }
      if (!excludeConnectionIds.includes(conn.id)) {
        conn.send(payload);
      }
    }
  }

  /**
   * SÃ©rialiser l'Ã©tat pour l'envoyer au client
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
   * Inclut hasAnsweredCurrentSong pour le tableau de score temps rÃ©el
   */
  private getPlayersArray() {
    const currentSongId = this.state.songs[this.state.currentSongIndex]?.id;
    
    return Array.from(this.state.players.values()).map((p) => {
      // VÃ©rifier si ce joueur a rÃ©pondu au morceau actuel
      const hasAnsweredCurrentSong = currentSongId
        ? this.state.responses.has(`${currentSongId}-${p.id}`)
        : false;
      
      return {
        id: p.id,
        displayName: p.displayName,
        score: p.score,
        incorrect: p.incorrect,
        isHost: p.isHost,
        connected: p.connected,
        hasAnsweredCurrentSong,
      };
    });
  }

  /**
   * Calculer les scores finaux triÃ©s
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
  // PHASE 7 : INTÃ‰GRATION LOBBY PARTY
  // ============================================================================

  /**
   * Notifier le Lobby Party d'un Ã©vÃ©nement
   *
   * Le Lobby Party track toutes les rooms actives pour afficher
   * la liste aux clients qui cherchent une partie.
   *
   * @param type - Type d'Ã©vÃ©nement (room_created, room_state_changed, room_deleted)
   * @param data - DonnÃ©es supplÃ©mentaires
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
      // Ne pas throw : le jeu continue mÃªme si le lobby n'est pas notifiÃ©
    }
  }
}










