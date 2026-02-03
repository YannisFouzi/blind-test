import type * as Party from "partykit/server";

const ROOM_KEY_PREFIX = "room:";
const ROOM_TTL_MS = 15 * 60 * 1000; // 15 minutes

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
    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        status: 200,
        headers: this.corsHeaders(),
      });
    }

    if (req.method === "DELETE") {
      return this.handleClearAllRooms();
    }

    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: this.corsHeaders() });
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
          return new Response("Unknown event type", { status: 400, headers: this.corsHeaders() });
      }

      return new Response("OK", { status: 200, headers: this.corsHeaders() });
    } catch (error) {
      console.error("[Lobby] Error:", error);
      return new Response("Internal error", { status: 500, headers: this.corsHeaders() });
    }
  }

  private async handleClearAllRooms() {
    const map = await this.room.storage.list();
    const roomKeys = Array.from(map.keys()).filter((key) => key.startsWith(ROOM_KEY_PREFIX));

    for (const key of roomKeys) {
      await this.room.storage.delete(key);
    }

    console.log(`[Lobby] Cleared ${roomKeys.length} rooms`);

    await this.broadcastRoomsList();

    return new Response(JSON.stringify({ deleted: roomKeys.length }), {
      status: 200,
      headers: { ...this.corsHeaders(), "Content-Type": "application/json" },
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

    console.log(`[Lobby] Room state changed: ${roomId} → ${metadata.state}`);

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
          console.log(`[Lobby] Room expired and deleted: ${value.id} (last update: ${new Date(value.updatedAt).toISOString()})`);
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

  private corsHeaders() {
    return {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
  }
}

// Type check pour PartyKit
LobbyParty satisfies Party.Worker;
