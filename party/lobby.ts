import type * as Party from "partykit/server";

const ROOM_KEY_PREFIX = "room:";
const ROOM_TTL_MS = 15 * 60 * 1000; // 15 minutes
const BEARER_PREFIX = "Bearer ";
const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

// Room metadata stored in the lobby
interface RoomMetadata {
  id: string;
  hostName: string;
  state: "idle" | "configured" | "playing" | "results";
  playersCount: number;
  createdAt: number;
  updatedAt: number;
  universeId?: string;
  hasPassword?: boolean;
}

type AuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 403 | 500; body: string };

/**
 * LobbyParty tracks active rooms and broadcasts updates to clients.
 */
export default class LobbyParty implements Party.Server {
  constructor(public room: Party.Room) {}

  async onStart() {
    console.log("[Lobby] Started");
  }

  async onConnect(conn: Party.Connection) {
    console.log("[Lobby] Client connected:", conn.id);

    await this.sendRoomsList(conn);
  }

  async onRequest(req: Party.Request) {
    const headers = this.corsHeaders(req);

    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        status: 200,
        headers,
      });
    }

    if (req.method !== "POST" && req.method !== "DELETE") {
      return new Response("Method not allowed", { status: 405, headers });
    }

    const auth = this.authorizeRequest(req);
    if (!auth.ok) {
      return new Response(auth.body, { status: auth.status, headers });
    }

    if (req.method === "DELETE") {
      if (!this.isDeleteEnabled()) {
        return new Response("DELETE disabled", { status: 405, headers });
      }
      return this.handleClearAllRooms(headers);
    }

    try {
      const body = (await req.json()) as {
        type: string;
        roomId: string;
        [key: string]: any;
      };
      const { type, roomId, ...data } = body;

      console.log(`[Lobby] Event from game ${roomId}:`, type);

      switch (type) {
        case "room_created":
          await this.handleRoomCreated(roomId, data);
          break;
        case "room_state_changed":
          await this.handleRoomStateChanged(roomId, data);
          break;
        case "room_deleted":
          await this.handleRoomDeleted(roomId);
          break;
        default:
          return new Response("Unknown event type", { status: 400, headers });
      }

      return new Response("OK", { status: 200, headers });
    } catch (error) {
      console.error("[Lobby] Error:", error);
      return new Response("Internal error", { status: 500, headers });
    }
  }

  private async handleClearAllRooms(headers: Record<string, string>) {
    const map = await this.room.storage.list();
    const roomKeys = Array.from(map.keys()).filter((key) => key.startsWith(ROOM_KEY_PREFIX));

    for (const key of roomKeys) {
      await this.room.storage.delete(key);
    }

    console.log(`[Lobby] Cleared ${roomKeys.length} rooms`);

    await this.broadcastRoomsList();

    return new Response(JSON.stringify({ deleted: roomKeys.length }), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  private async handleRoomCreated(roomId: string, data: Record<string, any>) {
    const metadata: RoomMetadata = {
      id: roomId,
      hostName: data.hostName || "Unknown",
      state: "idle",
      playersCount: data.playersCount || 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      universeId: data.universeId,
      hasPassword: Boolean(data.hasPassword),
    };

    await this.room.storage.put(`${ROOM_KEY_PREFIX}${roomId}`, metadata);

    console.log(`[Lobby] Room created: ${roomId} by ${metadata.hostName}`);

    await this.broadcastRoomsList();
  }

  private async handleRoomStateChanged(roomId: string, data: Record<string, any>) {
    const key = `${ROOM_KEY_PREFIX}${roomId}`;
    const metadata = await this.room.storage.get<RoomMetadata>(key);

    if (!metadata) {
      console.warn(`[Lobby] Room not found: ${roomId}`);
      return;
    }

    metadata.state = data.state;
    metadata.playersCount = data.playersCount || metadata.playersCount;
    if (data.universeId) {
      metadata.universeId = data.universeId;
    }
    if (typeof data.hasPassword === "boolean") {
      metadata.hasPassword = data.hasPassword;
    }
    metadata.updatedAt = Date.now();

    await this.room.storage.put(key, metadata);

    console.log(`[Lobby] Room state changed: ${roomId} -> ${metadata.state}`);

    await this.broadcastRoomsList();
  }

  private async handleRoomDeleted(roomId: string) {
    await this.room.storage.delete(`${ROOM_KEY_PREFIX}${roomId}`);

    console.log(`[Lobby] Room deleted: ${roomId}`);

    await this.broadcastRoomsList();
  }

  private async getRooms(): Promise<RoomMetadata[]> {
    const rooms: RoomMetadata[] = [];
    const map = await this.room.storage.list<RoomMetadata>();
    const now = Date.now();

    for (const [key, value] of map.entries()) {
      if (key.startsWith(ROOM_KEY_PREFIX)) {
        const isExpired = now - value.updatedAt > ROOM_TTL_MS;

        if (isExpired) {
          await this.room.storage.delete(key);
          console.log(
            `[Lobby] Room expired and deleted: ${value.id} (last update: ${new Date(
              value.updatedAt
            ).toISOString()})`
          );
        } else {
          rooms.push(value);
        }
      }
    }

    return rooms;
  }

  private async broadcastRoomsList() {
    const rooms = await this.getRooms();

    this.room.broadcast(
      JSON.stringify({
        type: "rooms_list",
        rooms,
      })
    );
  }

  private async sendRoomsList(conn: Party.Connection) {
    const rooms = await this.getRooms();

    conn.send(
      JSON.stringify({
        type: "rooms_list",
        rooms,
      })
    );
  }

  private authorizeRequest(req: Party.Request): AuthResult {
    if (!this.isAuthRequired()) {
      return { ok: true };
    }

    const expectedToken = this.readEnvString("PARTYKIT_LOBBY_TOKEN");
    if (!expectedToken) {
      console.error("[Lobby] Missing PARTYKIT_LOBBY_TOKEN while auth is enabled");
      return { ok: false, status: 500, body: "Lobby auth misconfigured" };
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith(BEARER_PREFIX)) {
      return { ok: false, status: 401, body: "Authentication required" };
    }

    const providedToken = authHeader.slice(BEARER_PREFIX.length).trim();
    if (!providedToken) {
      return { ok: false, status: 401, body: "Authentication required" };
    }

    if (!this.timingSafeEqual(providedToken, expectedToken)) {
      return { ok: false, status: 403, body: "Invalid token" };
    }

    return { ok: true };
  }

  private isAuthRequired() {
    const configured = this.readEnvString("PARTYKIT_LOBBY_REQUIRE_AUTH").toLowerCase();
    if (configured === "true") return true;
    if (configured === "false") return false;

    const host = this.readEnvString("PARTYKIT_HOST").toLowerCase();
    const isLocalHost = host.includes("localhost") || host.includes("127.0.0.1");
    return !isLocalHost;
  }

  private isDeleteEnabled() {
    return this.readEnvString("PARTYKIT_LOBBY_ENABLE_DELETE").toLowerCase() === "true";
  }

  private corsHeaders(req: Party.Request) {
    const allowedOrigins = this.getAllowedOrigins();
    const requestOrigin = req.headers.get("origin");
    const responseOrigin =
      requestOrigin && allowedOrigins.includes(requestOrigin)
        ? requestOrigin
        : allowedOrigins[0] ?? DEFAULT_ALLOWED_ORIGINS[0];

    return {
      "Access-Control-Allow-Origin": responseOrigin,
      "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      Vary: "Origin",
    };
  }

  private getAllowedOrigins() {
    const raw = this.readEnvString("PARTYKIT_ALLOWED_ORIGINS");
    if (!raw) {
      return DEFAULT_ALLOWED_ORIGINS;
    }

    const parsed = raw
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);

    return parsed.length > 0 ? parsed : DEFAULT_ALLOWED_ORIGINS;
  }

  private readEnvString(key: string) {
    const value = (this.room.env as Record<string, unknown>)[key];
    return typeof value === "string" ? value.trim() : "";
  }

  private timingSafeEqual(a: string, b: string) {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i += 1) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}

// Type check pour PartyKit
LobbyParty satisfies Party.Worker;
