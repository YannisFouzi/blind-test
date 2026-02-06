import type * as Party from "partykit/server";
import { z } from "zod";
import type { Song as SharedSong, RoomPlayer as SharedRoomPlayer } from "@shared-types";
import {
  calculateGameRounds,
  getCurrentRound,
  type GameRound,
  type MysteryEffectsConfig,
} from "@shared-utils/mysteryEffects";

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

// Types & schemas

/**
 * Client -> server message types
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
        audioUrlReversed: z.string().optional(),
        duration: z.number(),
      })
    ),
    allowedWorks: z.array(z.string()).optional(),
    worksPerRound: z.number().int().min(2).max(8).optional(),
    options: z.object({ noSeek: z.boolean() }).optional(),
    hostId: z.string().optional(),
    mysteryEffectsConfig: z
      .object({
        enabled: z.boolean(),
        frequency: z.number().int().min(1).max(100),
        effects: z.array(z.enum(["double", "reverse"])).min(1),
      })
      .optional(),
  }),
  z.object({
    type: z.literal("start"),
    hostId: z.string().min(1),
  }),
  z.object({
    type: z.literal("answer"),
    playerId: z.string().min(1),
    // Mode normal/reverse : format simple
    songId: z.string().min(1).optional(),
    workId: z.string().optional().nullable(),
    // Mode double : mapping explicite songId ? workId
    answers: z
      .array(
        z.object({
          songId: z.string().min(1),
          workId: z.string().nullable(),
        })
      )
      .optional(),
  }),
  z.object({
    type: z.literal("next"),
    hostId: z.string().min(1),
  }),
  z.object({
    type: z.literal("show_scores"),
    hostId: z.string().min(1),
  }),
  z.object({
    type: z.literal("reset_to_waiting"),
    hostId: z.string().min(1),
  }),
  z.object({
    type: z.literal("host_preview_start"),
    universeId: z.string().min(1),
    universeName: z.string().optional(),
  }),
  z.object({
    type: z.literal("host_preview_options"),
    noSeek: z.boolean().optional(),
    mysteryEffects: z
      .object({
        enabled: z.boolean(),
        frequency: z.number().int().min(1).max(100),
        effects: z.array(z.enum(["double", "reverse"])),
      })
      .optional(),
    allowedWorks: z.array(z.string()).optional(),
    allowedWorkNames: z.array(z.string()).optional(),
    allWorksSelected: z.boolean().optional(),
    maxSongs: z.number().int().min(1).nullable().optional(),
    totalSongs: z
      .union([z.number().int().min(0), z.unknown()])
      .optional()
      .transform((v) => (typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : undefined)),
  }),
  z.object({
    type: z.literal("host_preview_clear"),
  }),
  z.object({
    type: z.literal("player_ready"),
    playerId: z.string().min(1).optional(),
  }),
]);

type Message = z.infer<typeof MessageSchema>;

// Player stored in the room
type Player = Omit<SharedRoomPlayer, "lastSeen" | "hasAnsweredCurrentSong" | "isHost"> & {
  connectionId: string;
  isHost: boolean;
};

// Player response
interface Response {
  songId: string;
  playerId: string;
  workId: string | null;
  isCorrect: boolean;
  rank: number;
  points: number;
  timestamp: number;
}

// Song payload
type Song = Omit<SharedSong, "createdAt">;

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

// Full room state
interface RoomState {
  roomId: string;
  hostId: string;
  universeId: string;
  songs: Song[];
  currentSongIndex: number;
  state: "idle" | "configured" | "starting" | "playing" | "results";
  players: Map<string, Player>; // key: playerId
  responses: Map<string, Response>; // key: `${songId}-${playerId}`
  allowedWorks?: string[];
  worksPerRound?: number;
  options?: { noSeek: boolean };
  createdAt: number;
  passwordHash?: string;
  authTokens: Map<string, AuthTokenRecord>;
  failedAttempts: Map<string, FailedAttempt>;
  // Mystery effects (round model)
  rounds?: GameRound[];
  currentRoundIndex?: number;
  mysteryEffectsConfig?: MysteryEffectsConfig;
}

// ============================================================================
// PartyKit server
// ============================================================================

export default class BlindTestRoom implements Party.Server {
  state: RoomState;
  private securityReady = false;
  private authenticatedConnections = new Set<string>();
  private connectionIps = new Map<string, string | null>();
  private globalCooldownUntil = 0;
  /** Timer pour le countdown Ready Check (phase "starting") ? game_started aprËs startIn ms */
  private startingCountdownTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(public room: Party.Room) {
    // Initialiser l'√©tat de la room
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
    // Si une alarme de cleanup √©tait programm√©e, l'annuler car quelqu'un revient
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
   * R√©ception d'un message
   */
  async onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message);
      const parsed = MessageSchema.parse(data);
      await this.ensureSecurityState();

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
        case "show_scores":
          this.handleShowScores(parsed, sender);
          break;
        case "reset_to_waiting":
          this.handleResetToWaiting(parsed, sender);
          break;
        case "host_preview_start":
          this.handleHostPreviewStart(parsed, sender);
          break;
        case "host_preview_options":
          this.handleHostPreviewOptions(parsed, sender);
          break;
        case "host_preview_clear":
          this.handleHostPreviewClear(sender);
          break;
        case "player_ready":
          this.handlePlayerReady(parsed, sender);
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
   * D√©connexion d'un joueur
   */
  async onClose(conn: Party.Connection) {
    console.log(`[${this.room.id}] Disconnection: ${conn.id}`);
    console.log(
      `[HOST-DEBUG] onClose conn=${conn.id} | hostId=${this.state.hostId} | players=${this.state.players.size}`
    );
    this.authenticatedConnections.delete(conn.id);
    this.connectionIps.delete(conn.id);

    // Trouver le joueur associ√© √† cette connexion
    const disconnectedPlayer = this.getPlayerByConnectionId(conn.id);

    if (!disconnectedPlayer) {
      await this.maybeScheduleCleanup();
      return;
    }

    const disconnectedPlayerId = disconnectedPlayer.id;
    const wasHost = disconnectedPlayer.id === this.state.hostId;
    console.log(
      `[HOST-DEBUG] onClose joueur trouvÈ: disconnectedPlayerId=${disconnectedPlayerId} wasHost=${wasHost}`
    );

    this.state.players.delete(disconnectedPlayerId);

    for (const key of this.state.responses.keys()) {
      if (key.endsWith(`-${disconnectedPlayerId}`)) {
        this.state.responses.delete(key);
      }
    }

    if (wasHost && this.state.players.size > 0) {
      const newHost = this.state.players.values().next().value as Player;
      newHost.isHost = true;
      this.state.hostId = newHost.id;
      console.log(
        `[HOST-DEBUG] Transfert d'hÙte: ${disconnectedPlayerId} -> ${newHost.id} (${newHost.displayName})`
      );
      console.log(`[${this.room.id}] Host left; new host: ${newHost.id} (${newHost.displayName})`);
    } else if (wasHost) {
      this.state.hostId = "";
    }

    console.log(`[${this.room.id}] Player ${disconnectedPlayerId} removed; players left: ${this.state.players.size}`);

    this.broadcast({
      type: "players_update",
      players: this.getPlayersArray(),
    });

    await this.maybeScheduleCleanup();
  }

  /** Programme une alarme de cleanup si la room est vide (survit ‡ l'hibernation). */
  private async maybeScheduleCleanup() {
    if (this.state.players.size > 0) return;
    const existingAlarm = await this.room.storage.getAlarm();
    if (existingAlarm) return;
    const connections = Array.from(this.room.getConnections());
    console.log(`[${this.room.id}] No players in room, scheduling cleanup alarm`, {
      connectionsCount: connections.length,
      connectionIds: connections.map((c) => c.id),
    });
    await this.room.storage.put("roomIdForCleanup", this.room.id);
    await this.room.storage.setAlarm(Date.now() + 30000);
  }

  /**
   * Alarme de cleanup - appel√©e automatiquement par PartyKit apr√®s le d√©lai
   * Survit √† l'hibernation du serveur
   * Note: this.room.id n'est pas accessible ici (limitation PartyKit)
   */
  async onAlarm() {
    // R√©cup√©rer le roomId depuis le storage (sauvegard√© avant l'alarme)
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
        headers: { "Content-Type": "application/json", ...this.getLobbyAuthHeaders() },
        body: JSON.stringify({
          type: "room_deleted",
          roomId,
        }),
      });
      console.log(`[${roomId}] Notified lobby: room_deleted`);
    } catch (error) {
      console.error(`[${roomId}] Failed to notify lobby:`, error);
    }
    // Delete durable object state to release storage
    // Cela supprime le fichier SQLite physique et lib√®re les ressources
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
    console.log(
      `[HOST-DEBUG] handleJoin playerId=${playerId} displayName=${displayName} isFirstPlayer=${isFirstPlayer} hostId=${this.state.hostId}`
    );

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

    // VÈrifier si le joueur existe dÈj‡ (reconnexion)
    const existingPlayer = this.state.players.get(playerId);

    if (existingPlayer) {
      if (existingPlayer.connectionId && existingPlayer.connectionId !== sender.id) {
        this.authenticatedConnections.delete(existingPlayer.connectionId);
      }
      // Reconnexion : mettre ‡ jour la connexion
      existingPlayer.connected = true;
      existingPlayer.connectionId = sender.id;
      existingPlayer.displayName = displayName;
      existingPlayer.isHost = existingPlayer.id === this.state.hostId;
      console.log(
        `[HOST-DEBUG] Reconnexion: playerId=${playerId} -> isHost=${existingPlayer.isHost} (hostId serveur=${this.state.hostId})`
      );
      console.log(`[${this.room.id}] Player ${playerId} reconnected`);
    } else {
      // Nouveau joueur
      const newPlayer: Player = {
        id: playerId,
        displayName,
        score: 0,
        correct: 0,
        incorrect: 0,
        isHost: isFirstPlayer,
        connected: true,
        connectionId: sender.id,
      };

      this.state.players.set(playerId, newPlayer);

      if (isFirstPlayer) {
        this.state.hostId = playerId;
        console.log(`[${this.room.id}] Player ${playerId} is now host`);

        // Phase 7: Notifier le Lobby qu'une nouvelle room est crÈÈe
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

    // Envoyer l'Ètat complet au joueur (important pour les reconnexions)
    sender.send(
      JSON.stringify({
        type: "state_sync",
        state: this.serializeState(),
      })
    );

    // Broadcaster la liste des joueurs ‡ tous
    this.broadcast({
      type: "players_update",
      players: this.getPlayersArray(),
    });
  }

  /**
   * Handler: CONFIGURE - Configuration de la playlist
   */
  private handleConfigure(msg: Extract<Message, { type: "configure" }>, sender: Party.Connection) {
    const {
      universeId,
      songs,
      allowedWorks,
      worksPerRound,
      options,
      hostId: hostIdFromClient,
      mysteryEffectsConfig,
    } = msg;
    const senderPlayer = this.getPlayerByConnectionId(sender.id);
    const senderId = senderPlayer?.id ?? hostIdFromClient;

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

    // V√©rifier que c'est le host qui configure (optionnel, on peut laisser n'importe qui)

    this.state.universeId = universeId;
    this.state.songs = songs;
    this.state.allowedWorks = allowedWorks;
    this.state.worksPerRound = worksPerRound;
    this.state.options = options;

    // Effets mysteres : calculer les rounds si configures
    const hasEffects =
      mysteryEffectsConfig?.enabled && mysteryEffectsConfig.effects && mysteryEffectsConfig.effects.length > 0;

    if (hasEffects) {
      this.state.mysteryEffectsConfig = mysteryEffectsConfig;
      this.state.rounds = calculateGameRounds(this.state.songs, mysteryEffectsConfig);
      this.state.currentRoundIndex = 0;

      const firstRound = this.state.rounds[0];
      const firstSongId = firstRound?.songIds[0];
      const firstSongIndex = this.state.songs.findIndex((s) => s.id === firstSongId);
      this.state.currentSongIndex = firstSongIndex >= 0 ? firstSongIndex : 0;
    } else {
      this.state.mysteryEffectsConfig = undefined;
      this.state.rounds = undefined;
      this.state.currentRoundIndex = undefined;
      this.state.currentSongIndex = 0;
    }

    this.state.state = "configured";

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
      worksPerRound,
      options,
    };
    this.broadcast(broadcastMessage);
  }

  /**
   * Handler: START - D√©marrage de la partie
   */
  private handleStart(msg: Extract<Message, { type: "start" }>, sender: Party.Connection) {
    const senderPlayer = this.requireHostSender(sender, "start the game");
    if (!senderPlayer) {
      return;
    }

    if (msg.hostId !== senderPlayer.id) {
      console.warn(
        `[${this.room.id}] START spoof attempt: claimedHostId=${msg.hostId}, senderPlayerId=${senderPlayer.id}, expectedHostId=${this.state.hostId}, conn=${sender.id}`
      );
    }

    // Validation: √©tat de la room (doit √™tre "idle" ou "configured")
    if (this.state.state !== "idle" && this.state.state !== "configured") {
      sender.send(
        JSON.stringify({
          type: "error",
          message: "Game already started",
        })
      );
      return;
    }

    // Validation: au moins une chanson configur√©e
    if (this.state.songs.length === 0) {
      sender.send(
        JSON.stringify({
          type: "error",
          message: "No songs configured",
        })
      );
      return;
    }

    // DÈterminer l'index du premier morceau si les rounds sont configurÈs
    if (this.state.rounds && this.state.rounds.length > 0) {
      // S'assurer que currentRoundIndex est initialisÈ ‡ 0 si les rounds existent
      if (this.state.currentRoundIndex === undefined) {
        this.state.currentRoundIndex = 0;
      }
      const currentRound = getCurrentRound(this.state.rounds, this.state.currentRoundIndex) ?? this.state.rounds[0];
      const firstSongId = currentRound?.songIds[0];
      const firstSongIndex = this.state.songs.findIndex((s) => s.id === firstSongId);
      this.state.currentSongIndex = firstSongIndex >= 0 ? firstSongIndex : 0;
    } else {
      this.state.currentSongIndex = 0;
    }

    // Ready Check (Option A) : passer en phase "starting", pas directement "playing"
    this.state.state = "starting";
    for (const p of this.state.players.values()) {
      p.ready = false;
    }
    if (this.startingCountdownTimer) {
      clearTimeout(this.startingCountdownTimer);
      this.startingCountdownTimer = null;
    }

    // Phase 7: Notifier le Lobby que la room a commenc√© √† jouer
    void this.notifyLobby("room_state_changed", { state: "starting", playersCount: this.state.players.size, universeId: this.state.universeId, hasPassword: Boolean(this.state.passwordHash), });

    this.broadcast({
      type: "game_starting",
      state: "starting",
      currentSongIndex: this.state.currentSongIndex,
      currentRoundIndex: this.state.currentRoundIndex,
      currentRound: this.getCurrentRound(),
      roundCount: this.state.rounds?.length,
      displayedSongIndex: this.getDisplayedSongIndex(),
      displayedTotalSongs: this.getDisplayedTotalSongs(),
      songs: this.state.songs,
      totalSongs: this.state.songs.length,
    });

    this.broadcast({
      type: "players_update",
      players: this.getPlayersArray(),
    });
  }

  private handlePlayerReady(msg: Extract<Message, { type: "player_ready" }>, sender: Party.Connection) {
    if (this.state.state !== "starting") {
      sender.send(JSON.stringify({ type: "error", message: "Not in starting phase" }));
      return;
    }
    const senderPlayer = this.getPlayerByConnectionId(sender.id);
    if (!senderPlayer) {
      sender.send(JSON.stringify({ type: "error", message: "Player not found" }));
      return;
    }
    const playerId = msg.playerId ?? senderPlayer.id;
    if (playerId !== senderPlayer.id) {
      sender.send(JSON.stringify({ type: "error", message: "Player ID mismatch" }));
      return;
    }
    senderPlayer.ready = true;

    this.broadcast({
      type: "players_update",
      players: this.getPlayersArray(),
    });

    const allReady = Array.from(this.state.players.values()).every((p) => p.ready === true);
    if (!allReady) return;

    const startInMs = 3000;
    this.broadcast({
      type: "all_players_ready",
      startIn: startInMs,
    });

    if (this.startingCountdownTimer) {
      clearTimeout(this.startingCountdownTimer);
    }
    this.startingCountdownTimer = setTimeout(() => {
      this.startingCountdownTimer = null;
      this.state.state = "playing";
      console.log(`[${this.room.id}] Ready Check complete, game started`);
      void this.notifyLobby("room_state_changed", { state: "playing", playersCount: this.state.players.size, universeId: this.state.universeId, hasPassword: Boolean(this.state.passwordHash), });
      this.broadcastGameStarted();
      this.broadcast({
        type: "players_update",
        players: this.getPlayersArray(),
      });
    }, startInMs);
  }

  private broadcastGameStarted() {
    const currentRound = this.getCurrentRound();
    this.broadcast({
      type: "game_started",
      currentSongIndex: this.state.currentSongIndex,
      currentRoundIndex: this.state.currentRoundIndex,
      currentRound: currentRound,
      roundCount: this.state.rounds?.length,
      displayedSongIndex: this.getDisplayedSongIndex(),
      displayedTotalSongs: this.getDisplayedTotalSongs(),
      state: "playing",
      currentSong: this.state.songs[this.state.currentSongIndex],
      songs: this.state.songs,
      totalSongs: this.state.songs.length,
    });
  }

  /**
   * Handler: ANSWER - Soumission d'une r√©ponse
   */
  private handleAnswer(msg: Extract<Message, { type: "answer" }>, sender: Party.Connection) {
    const senderPlayer = this.requireConnectedSender(sender, "submit answers");
    if (!senderPlayer) {
      return;
    }

    if (msg.playerId !== senderPlayer.id) {
      console.warn(
        `[${this.room.id}] ANSWER rejected: claimedPlayerId=${msg.playerId}, senderPlayerId=${senderPlayer.id}, conn=${sender.id}`
      );
      sender.send(JSON.stringify({ type: "error", message: "Player ID mismatch" }));
      return;
    }

    const playerId = senderPlayer.id;
    const player = senderPlayer;

    // Validation: le jeu doit Ítre en mode "playing"
    if (this.state.state !== "playing") {
      sender.send(
        JSON.stringify({
          type: "error",
          message: "Game is not started yet",
        })
      );
      return;
    }
    // ? NOUVEAU : DÈtecter le mode double
    const currentRound = this.getCurrentRound();
    if (currentRound?.type === "double") {
      // Mode double : traiter les 2 rÈponses avec mapping explicite
      return this.handleAnswerDouble(msg, sender, player, currentRound);
    }

    // Mode normal/reverse : logique existante
    if (!msg.songId) {
      sender.send(
        JSON.stringify({
          type: "error",
          message: "songId is required for normal/reverse mode",
        })
      );
      return;
    }

    const songId = msg.songId;
    const workId = msg.workId ?? null;

    // D√©duplication: a-t-il d√©j√† r√©pondu ?
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

    // Trouver la bonne r√©ponse
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

    // Calculer le rang (nombre de bonnes r√©ponses d√©j√† enregistr√©es + 1)
    let rank = 1;
    for (const response of this.state.responses.values()) {
      if (response.songId === songId && response.isCorrect) {
        rank++;
      }
    }

    // Calculer les points (formule: max(1, nbJoueurs - rang + 1))
    const connectedPlayers = this.getConnectedPlayers();
    const activePlayers = connectedPlayers.length;
    const points = isCorrect ? Math.max(1, activePlayers - rank + 1) : 0;

    // Enregistrer la r√©ponse
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

    // Mettre √† jour le score du joueur
    if (isCorrect) {
      player.score += points; // Points totaux selon le rang
            player.correct += 1; // Correct answers count
    } else {
      player.incorrect += 1;
    }

    console.log(
      `[${this.room.id}] Answer: ${playerId} ‚Üí ${isCorrect ? "‚úì" : "‚úó"} (rank ${rank}, ${points} pts)`
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

    // Broadcaster qu'un joueur a r√©pondu (sans r√©v√©ler si correct)
    this.broadcast({
      type: "player_answered",
      playerId,
      songId,
    });

    // Broadcaster la mise √† jour des scores et statuts
    this.broadcast({
      type: "players_update",
      players: this.getPlayersArray(),
    });

    // V√©rifier si tous les joueurs ont r√©pondu
    // ? FIX: Utiliser le songId du round actuel au lieu de celui du message
    // pour Ítre cohÈrent avec le mode double et Èviter les problËmes de synchronisation
    const roundSongId = currentRound?.songIds[0] ?? songId;
    const currentSongResponses = Array.from(this.state.responses.values()).filter(
      (r) => r.songId === roundSongId
    );

    if (currentSongResponses.length === connectedPlayers.length) {
      console.log(`[${this.room.id}] All players answered for song ${roundSongId}`);
      this.broadcast({ type: "all_players_answered" });
    }
  }

  /**
   * Handler pour mode double : traiter 2 rÈponses avec mapping explicite
   */
  private handleAnswerDouble(
    msg: Extract<Message, { type: "answer" }>,
    sender: Party.Connection,
    player: Player,
    currentRound: GameRound
  ) {
    const playerId = player.id;

    // VÈrifier que le message contient 2 rÈponses
    if (!msg.answers || msg.answers.length !== 2) {
      sender.send(
        JSON.stringify({
          type: "error",
          message: "Double mode requires 2 answers",
        })
      );
      return;
    }

    // VÈrifier que les songIds correspondent au round
    const expectedSongIds = currentRound.songIds;
    const receivedSongIds = msg.answers.map((a) => a.songId);

    if (
      !expectedSongIds.every((id) => receivedSongIds.includes(id)) ||
      expectedSongIds.length !== receivedSongIds.length
    ) {
      sender.send(
        JSON.stringify({
          type: "error",
          message: "SongIds don't match current round",
        })
      );
      return;
    }

    // Traiter en multiset : l'ordre des sÈlections ne compte pas
    const connectedPlayers = this.getConnectedPlayers();
    const activePlayers = connectedPlayers.length;
    let totalPoints = 0;
    let totalCorrect = 0;
    let totalIncorrect = 0;

    // Multiset des úuvres correctes pour ce round (avec multiplicitÈ)
    const correctWorkIds = currentRound.songIds
      .map((sid) => this.state.songs.find((s) => s.id === sid)?.workId)
      .filter((w): w is string => Boolean(w));
    let remainingCorrect = [...correctWorkIds];

    for (const answer of msg.answers) {
      const song = this.state.songs.find((s) => s.id === answer.songId);
      if (!song) {
        console.warn(`[${this.room.id}] Song ${answer.songId} not found in handleAnswerDouble`);
        continue;
      }

      // VÈrifier dÈduplication pour cette combinaison songId + playerId
      const responseKey = `${answer.songId}-${playerId}`;
      if (this.state.responses.has(responseKey)) {
        console.log(`[${this.room.id}] Player ${playerId} already answered for song ${answer.songId}, skipping`);
        continue;
      }

      // Multiset : la sÈlection est correcte si cette úuvre fait partie des correctes restantes
      const idx = remainingCorrect.indexOf(answer.workId ?? "");
      const isCorrect = idx !== -1;
      if (isCorrect) remainingCorrect.splice(idx, 1);

      // Rang pour cette bonne rÈponse : combien ont dÈj‡ rÈpondu correctement pour ce songId spÈcifique
      // ? FIX: Calculer le rank par songId (comme en mode normal) pour que chaque musique ait son propre rank
      // mÍme si elles partagent le mÍme workId
      let rank = 1;
      if (isCorrect) {
        for (const response of this.state.responses.values()) {
          // Compter les rÈponses prÈcÈdentes pour ce songId spÈcifique (pas par workId)
          if (response.songId === answer.songId && response.isCorrect) {
            rank++;
          }
        }
      }

      const points = isCorrect ? Math.max(1, activePlayers - rank + 1) : 0;
      totalPoints += points;

      if (isCorrect) {
        totalCorrect += 1;
      } else {
        totalIncorrect += 1;
      }

      // Enregistrer la rÈponse
      const response: Response = {
        songId: answer.songId,
        playerId,
        workId: answer.workId,
        isCorrect,
        rank: isCorrect ? rank : 0,
        points,
        timestamp: Date.now(),
      };

      this.state.responses.set(responseKey, response);

      console.log(
        `[${this.room.id}] Double Answer: ${playerId} ? song ${answer.songId} ? ${isCorrect ? "?" : "?"} (rank ${rank}, ${points} pts)`
      );

      this.broadcast({
        type: "player_answered",
        playerId,
        songId: answer.songId,
      });
    }

    // Mettre ‡ jour le score du joueur (somme des points)
    player.score += totalPoints;
    player.correct += totalCorrect;
    player.incorrect += totalIncorrect;

    console.log(
      `[${this.room.id}] Double Answer Total: ${playerId} ? ${totalCorrect} correct, ${totalIncorrect} incorrect, ${totalPoints} pts`
    );

    // Notifier le joueur (points totaux)
    sender.send(
      JSON.stringify({
        type: "answer_recorded",
                rank: totalCorrect > 0 ? 1 : 0,
        points: totalPoints,
        isCorrect: totalCorrect > 0,
        duplicate: false,
      })
    );

    // Broadcaster la mise ‡ jour des scores et statuts
    this.broadcast({
      type: "players_update",
      players: this.getPlayersArray(),
    });

    // VÈrifier si tous les joueurs ont rÈpondu aux 2 songs du round
    const roundSongIds = currentRound.songIds;
    const allPlayersAnsweredRound = roundSongIds.every((songId) => {
      const songResponses = Array.from(this.state.responses.values()).filter(
        (r) => r.songId === songId
      );
      return songResponses.length === activePlayers;
    });

    if (allPlayersAnsweredRound) {
      console.log(`[${this.room.id}] All players answered for double round`);
      this.broadcast({ type: "all_players_answered" });
    }
  }

  /**
   * Handler: NEXT - Passer au morceau suivant
   */
  private handleNext(msg: Extract<Message, { type: "next" }>, sender: Party.Connection) {
    const senderPlayer = this.requireHostSender(sender, "go to next song");
    if (!senderPlayer) {
      return;
    }

    if (msg.hostId !== senderPlayer.id) {
      console.warn(
        `[${this.room.id}] NEXT spoof attempt: claimedHostId=${msg.hostId}, senderPlayerId=${senderPlayer.id}, expectedHostId=${this.state.hostId}, conn=${sender.id}`
      );
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

    // Si des rounds sont dÈfinis, on navigue par round, sinon fallback historique par songIndex
    if (this.state.rounds && this.state.rounds.length > 0) {
      // S'assurer que currentRoundIndex est dÈfini (utiliser 0 par dÈfaut si undefined)
      const currentRoundIndex = this.state.currentRoundIndex ?? 0;
      const nextRoundIndex = currentRoundIndex + 1;

      if (nextRoundIndex >= this.state.rounds.length) {
        // Fin de partie
        this.state.state = "results";

        console.log(`[${this.room.id}] Game ended (rounds)`);

        this.broadcast({
          type: "game_ended",
          state: "results",
          players: this.getPlayersArray(),
          finalScores: this.getFinalScores(),
        });

        return;
      }

      const nextRound = this.state.rounds[nextRoundIndex];
      if (!nextRound) {
        console.error(`[${this.room.id}] Next round at index ${nextRoundIndex} is undefined`);
        return;
      }
      const nextSongId = nextRound.songIds[0];
      const nextSongIndex = this.state.songs.findIndex((s) => s.id === nextSongId);
      const nextSong = nextSongIndex >= 0 ? this.state.songs[nextSongIndex] : this.state.songs[0];

      this.state.currentRoundIndex = nextRoundIndex;
      this.state.currentSongIndex = nextSongIndex >= 0 ? nextSongIndex : 0;

      console.log(
        `[${this.room.id}] Next round: ${this.state.currentRoundIndex + 1}/${this.state.rounds.length} (songIndex=${
          this.state.currentSongIndex + 1
        }/${this.state.songs.length})`
      );

      const currentRound = this.getCurrentRound();
      this.broadcast({
        type: "song_changed",
        currentSongIndex: this.state.currentSongIndex,
        currentRoundIndex: this.state.currentRoundIndex,
        currentRound: currentRound,
        roundCount: this.state.rounds?.length,
        displayedSongIndex: this.getDisplayedSongIndex(),
        displayedTotalSongs: this.getDisplayedTotalSongs(),
        currentSong: nextSong,
      });
    } else {
      // Comportement historique : navigation sÈquentielle par songIndex
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

      this.state.currentSongIndex++;
      const nextSong = this.state.songs[this.state.currentSongIndex];

      console.log(
        `[${this.room.id}] Next song: ${this.state.currentSongIndex + 1}/${this.state.songs.length}`
      );

      const currentRound = this.getCurrentRound();
      this.broadcast({
        type: "song_changed",
        currentSongIndex: this.state.currentSongIndex,
        currentRoundIndex: this.state.currentRoundIndex,
        currentRound: currentRound,
        roundCount: this.state.rounds?.length,
        displayedSongIndex: this.getDisplayedSongIndex(),
        displayedTotalSongs: this.getDisplayedTotalSongs(),
        currentSong: nextSong,
      });
    }

    // FIX: Envoyer players_update pour r√©initialiser hasAnsweredCurrentSong
    this.broadcast({
      type: "players_update",
      players: this.getPlayersArray(),
    });
  }

  /**
   * Handler: SHOW_SCORES - Rediriger tous les joueurs vers la page scores
   */
  private handleShowScores(msg: Extract<Message, { type: "show_scores" }>, sender: Party.Connection) {
    const senderPlayer = this.requireHostSender(sender, "show scores");
    if (!senderPlayer) {
      return;
    }

    if (msg.hostId !== senderPlayer.id) {
      console.warn(
        `[${this.room.id}] SHOW_SCORES spoof attempt: claimedHostId=${msg.hostId}, senderPlayerId=${senderPlayer.id}, expectedHostId=${this.state.hostId}, conn=${sender.id}`
      );
    }

    // Validation: on doit Ítre en mode playing ou results
    if (this.state.state !== "playing" && this.state.state !== "results") {
      sender.send(
        JSON.stringify({
          type: "error",
          message: "Game must be playing or finished to show scores",
        })
      );
      return;
    }

    // Si on est encore en mode "playing", vÈrifier si on peut terminer la partie.
    // Utiliser la mÍme logique que le client (displayedSongIndex >= displayedTotalSongs)
    // pour rester alignÈ avec líUI (rounds / double rounds).
    if (this.state.state === "playing") {
      let atEnd: boolean;
      if (this.state.rounds && this.state.rounds.length > 0) {
        const roundIndex = this.state.currentRoundIndex ?? 0;
        atEnd = roundIndex >= this.state.rounds.length - 1;
      } else {
        const displayedTotal = this.getDisplayedTotalSongs();
        const displayedIndex = this.getDisplayedSongIndex();
        atEnd = displayedTotal > 0 && displayedIndex >= displayedTotal;
      }

      if (!atEnd) {
        sender.send(
          JSON.stringify({
            type: "error",
            message: "Can only show scores at the end of the game",
          })
        );
        return;
      }

      // VÈrifier si tous les joueurs ont rÈpondu au(x) morceau(x) de la manche courante
      const currentRound = this.getCurrentRound();
      const songIdsToCheck: string[] = currentRound
        ? currentRound.songIds
        : [this.state.songs[this.state.currentSongIndex]?.id].filter(Boolean) as string[];

      if (songIdsToCheck.length === 0) {
        sender.send(
          JSON.stringify({
            type: "error",
            message: "No current song found",
          })
        );
        return;
      }

      const connectedPlayers = this.getConnectedPlayers();
      for (const songId of songIdsToCheck) {
        const responsesForSong = Array.from(this.state.responses.values()).filter(
          (r) => r.songId === songId
        );
        if (responsesForSong.length < connectedPlayers.length) {
          sender.send(
            JSON.stringify({
              type: "error",
              message: "All players must answer before showing scores",
            })
          );
          return;
        }
      }

      // Tous les joueurs ont rÈpondu au dernier morceau : terminer la partie automatiquement
      console.log(`[${this.room.id}] All players answered last song, ending game automatically`);
      this.state.state = "results";

      this.broadcast({
        type: "game_ended",
        state: "results",
        players: this.getPlayersArray(),
        finalScores: this.getFinalScores(),
      });
    }

    console.log(`[${this.room.id}] Host requested to show scores`);

    // Broadcaster le message ‡ tous les joueurs pour qu'ils redirigent
    this.broadcast({
      type: "show_scores",
      roomId: this.state.roomId,
      finalScores: this.getFinalScores(),
    });
  }

  /**
   * Handler: RESET_TO_WAITING - RÈinitialiser la room et retourner au lobby
   * 
   * RÈinitialise complËtement l'Ètat de la room (scores, rÈponses, config, etc.)
   * et redirige tous les joueurs vers la waiting room pour reconfigurer.
   * 
   * Host-only action.
   */
  private handleResetToWaiting(msg: Extract<Message, { type: "reset_to_waiting" }>, sender: Party.Connection) {
    const { hostId } = msg;
    const senderPlayer = this.getPlayerByConnectionId(sender.id);
    const senderId = senderPlayer?.id ?? hostId;

    // Validation: est-ce bien le host ?
    if (senderId !== this.state.hostId) {
      console.warn(
        `[${this.room.id}] RESET_TO_WAITING rejected: expected hostId=${this.state.hostId}, senderId=${senderId}`
      );
      sender.send(
        JSON.stringify({
          type: "error",
          message: "Only the host can reset the room to waiting",
        })
      );
      return;
    }

    // ? RESET COMPLET DE L'…TAT DE LA ROOM
    // RÈinitialiser tous les champs de configuration et de jeu
    this.state.universeId = "";
    this.state.songs = [];
    this.state.currentSongIndex = 0;
    this.state.responses.clear();
    this.state.rounds = undefined;
    this.state.currentRoundIndex = undefined;
    this.state.mysteryEffectsConfig = undefined;
    this.state.allowedWorks = undefined;
    this.state.worksPerRound = undefined;
    this.state.options = undefined;
    this.state.state = "idle";

    if (this.startingCountdownTimer) {
      clearTimeout(this.startingCountdownTimer);
      this.startingCountdownTimer = null;
    }

    // ? RESET DES SCORES DE TOUS LES JOUEURS
    // RÈinitialiser score, correct, incorrect pour chaque joueur
    for (const player of this.state.players.values()) {
      player.score = 0;
      player.correct = 0;
      player.incorrect = 0;
    }

    console.log(`[${this.room.id}] Room reset to waiting state`, {
      state: this.state.state,
      universeId: this.state.universeId,
      songsCount: this.state.songs.length,
      playersCount: this.state.players.size,
      playersReset: Array.from(this.state.players.values()).map((p) => ({
        id: p.id,
        score: p.score,
        correct: p.correct,
        incorrect: p.incorrect,
      })),
    });

    // ? NOTIFIER LE LOBBY que la room est revenue en Ètat idle
    void this.notifyLobby("room_state_changed", {
      state: "idle",
      playersCount: this.state.players.size,
      universeId: "",
      hasPassword: Boolean(this.state.passwordHash),
    });

    // ? BROADCAST players_update pour mettre ‡ jour les scores ‡ zÈro cÙtÈ client
    this.broadcast({
      type: "players_update",
      players: this.getPlayersArray(),
    });

    // ? BROADCAST state_sync pour forcer tous les clients ‡ synchroniser l'Ètat reset
    // (obligatoire pour Èviter les ghost states)
    this.broadcast({
      type: "state_sync",
      state: this.serializeState(),
    });

    // ? BROADCAST redirect_to_waiting_room pour rediriger tous les joueurs
    // Chaque client construira son URL avec son playerId et displayName depuis le serveur
    this.broadcast({
      type: "redirect_to_waiting_room",
      roomId: this.state.roomId,
      // Inclure les infos des joueurs pour que chaque client puisse construire son URL
      players: this.getPlayersArray().map((p) => ({
        id: p.id,
        displayName: p.displayName,
      })),
    });

    console.log(`[${this.room.id}] Reset to waiting completed, all players will be redirected`);
  }

  // ==========================================================================
  // M√âTHODES UTILITAIRES
  // ==========================================================================

  /**
   * Broadcaster un message √† tous les clients connect√©s
   */
  private handleHostPreviewStart(
    msg: Extract<Message, { type: "host_preview_start" }>,
    sender: Party.Connection
  ) {
    const senderPlayer = this.getPlayerByConnectionId(sender.id);
    if (!senderPlayer || senderPlayer.id !== this.state.hostId) return;
    this.broadcast({
      type: "host_preview_start",
      universeId: msg.universeId,
      universeName: msg.universeName,
    });
  }

  private handleHostPreviewOptions(
    msg: Extract<Message, { type: "host_preview_options" }>,
    sender: Party.Connection
  ) {
    const senderPlayer = this.getPlayerByConnectionId(sender.id);
    if (!senderPlayer || senderPlayer.id !== this.state.hostId) return;
    this.broadcast({
      type: "host_preview_options",
      noSeek: msg.noSeek,
      mysteryEffects: msg.mysteryEffects,
      allowedWorks: msg.allowedWorks,
      allowedWorkNames: msg.allowedWorkNames,
      allWorksSelected: msg.allWorksSelected,
      maxSongs: msg.maxSongs,
      totalSongs: msg.totalSongs,
    });
  }

  private handleHostPreviewClear(sender: Party.Connection) {
    const senderPlayer = this.getPlayerByConnectionId(sender.id);
    if (!senderPlayer || senderPlayer.id !== this.state.hostId) return;
    this.broadcast({ type: "host_preview_clear" });
  }
  private requireConnectedSender(sender: Party.Connection, action: string): Player | null {
    const senderPlayer = this.getPlayerByConnectionId(sender.id);
    if (!senderPlayer) {
      console.warn(
        `[${this.room.id}] ${action.toUpperCase()} rejected: no player for connection ${sender.id}`
      );
      sender.send(
        JSON.stringify({
          type: "error",
          message: "Player not found for this connection",
        })
      );
      return null;
    }

    if (!senderPlayer.connected) {
      console.warn(
        `[${this.room.id}] ${action.toUpperCase()} rejected: disconnected playerId=${senderPlayer.id}, conn=${sender.id}`
      );
      sender.send(
        JSON.stringify({
          type: "error",
          message: "Player not connected",
        })
      );
      return null;
    }

    return senderPlayer;
  }

  private requireHostSender(sender: Party.Connection, action: string): Player | null {
    const senderPlayer = this.requireConnectedSender(sender, action);
    if (!senderPlayer) {
      return null;
    }

    if (senderPlayer.id !== this.state.hostId) {
      console.warn(
        `[${this.room.id}] ${action.toUpperCase()} rejected: expectedHostId=${this.state.hostId}, senderPlayerId=${senderPlayer.id}, conn=${sender.id}`
      );
      sender.send(
        JSON.stringify({
          type: "error",
          message: `Only the host can ${action}`,
        })
      );
      return null;
    }

    return senderPlayer;
  }

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

  private getPlayerByConnectionId(connectionId: string) {
    return Array.from(this.state.players.values()).find((player) => player.connectionId === connectionId);
  }

  private getConnectedPlayers() {
    return Array.from(this.state.players.values()).filter((player) => player.connected);
  }

  /**
   * Obtenir le round actuel (helper pour Èviter la rÈpÈtition)
   */
  private getCurrentRound(): GameRound | undefined {
    if (!this.state.rounds || this.state.rounds.length === 0) {
      return undefined;
    }
    // Si currentRoundIndex n'est pas dÈfini mais que rounds existe, utiliser 0 par dÈfaut
    const roundIndex = this.state.currentRoundIndex ?? 0;
    return getCurrentRound(this.state.rounds, roundIndex);
  }

  /**
   * Calculer le total de "songs consommÈs" basÈ sur les rounds (comme en solo)
   */
  private getDisplayedTotalSongs(): number {
    if (this.state.rounds && this.state.rounds.length > 0) {
      return this.state.rounds.reduce((acc, round) => {
        return acc + (round.type === "double" ? 2 : 1);
      }, 0);
    }
    return this.state.songs.length;
  }

  /**
   * Calculer l'index affichÈ du morceau actuel basÈ sur les rounds (comme en solo)
   */
  private getDisplayedSongIndex(): number {
    if (this.state.rounds && this.state.rounds.length > 0) {
      // Si currentRoundIndex n'est pas dÈfini mais que rounds existe, utiliser 0 par dÈfaut
      const roundIndex = this.state.currentRoundIndex ?? 0;
      // Somme des morceaux "consommÈs" par tous les rounds prÈcÈdents
      let consumed = 0;
      for (let i = 0; i < roundIndex; i++) {
        const round = this.state.rounds[i];
        consumed += round.type === "double" ? 2 : 1;
      }
      // L'index affichÈ commence ‡ 1
      return consumed + 1;
    }
    // Fallback historique : index basÈ sur currentSongIndex
    return (this.state.currentSongIndex ?? 0) + 1;
  }

  /**
   * S√©rialiser l'√©tat pour l'envoyer au client
   */
  private serializeState() {
    const currentRound = this.getCurrentRound();
    return {
      roomId: this.state.roomId,
      hostId: this.state.hostId,
      universeId: this.state.universeId,
      songs: this.state.songs,
      currentSongIndex: this.state.currentSongIndex,
      currentRoundIndex: this.state.currentRoundIndex,
      currentRound: currentRound,
      roundCount: this.state.rounds?.length,
      displayedSongIndex: this.getDisplayedSongIndex(),
      displayedTotalSongs: this.getDisplayedTotalSongs(),
      state: this.state.state,
      players: this.getPlayersArray(),
      allowedWorks: this.state.allowedWorks,
      worksPerRound: this.state.worksPerRound,
      options: this.state.options,
    };
  }

  /**
   * Convertir Map<string, Player> en tableau
   * Inclut hasAnsweredCurrentSong pour le tableau de score temps r√©el
   */
  private getPlayersArray() {
    const currentSongId = this.state.songs[this.state.currentSongIndex]?.id;
    
    return Array.from(this.state.players.values()).map((p) => {
      // V√©rifier si ce joueur a r√©pondu au morceau actuel
      const hasAnsweredCurrentSong = currentSongId
        ? this.state.responses.has(`${currentSongId}-${p.id}`)
        : false;
      
      return {
        id: p.id,
        displayName: p.displayName,
        score: p.score,
        correct: p.correct,
        incorrect: p.incorrect,
        isHost: p.isHost,
        connected: p.connected,
        ready: p.ready ?? false,
        hasAnsweredCurrentSong,
      };
    });
  }

  /**
   * Calculer les scores finaux tri√©s
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

  // Lobby integration
  private async notifyLobby(type: string, data: Record<string, any> = {}) {
    try {
      // LobbyParty singleton endpoint
      const lobbyUrl = `${this.room.env.PARTYKIT_HOST}/parties/lobby/main`;

      await fetch(lobbyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...this.getLobbyAuthHeaders() },
        body: JSON.stringify({
          type,
          roomId: this.room.id,
          ...data,
        }),
      });

      console.log(`[${this.room.id}] Notified lobby: ${type}`);
    } catch (error) {
      console.error(`[${this.room.id}] Failed to notify lobby:`, error);
      // Do not throw; game continues if lobby is unavailable.
    }
  }

  private getLobbyAuthHeaders(): Record<string, string> {
    const lobbyToken = this.readEnvString("PARTYKIT_LOBBY_TOKEN");
    if (!lobbyToken) {
      return {};
    }
    return { Authorization: `Bearer ${lobbyToken}` };
  }

  private readEnvString(key: string) {
    const value = (this.room.env as Record<string, unknown>)[key];
    return typeof value === "string" ? value.trim() : "";
  }
}
