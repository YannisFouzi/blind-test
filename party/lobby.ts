import type * as Party from "partykit/server";

/**
 * Métadonnées d'une room de jeu
 */
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
 * Architecture Multi-Party :
 * - Singleton : 1 seule instance pour toute l'app
 * - URL : /parties/lobby/main
 * - Rôle : Centraliser la liste des rooms disponibles
 *
 * Communication :
 * - Game Parties envoient des événements HTTP POST
 * - Clients WebSocket reçoivent la liste en temps réel
 *
 * @example
 * // Game Party notifie le lobby
 * await fetch('/parties/lobby/main', {
 *   method: 'POST',
 *   body: JSON.stringify({ type: 'room_created', roomId, hostName })
 * });
 */
export default class LobbyParty implements Party.Server {
  constructor(public room: Party.Room) {}

  async onStart() {
    console.log("[Lobby] Started");
  }

  /**
   * Nouveau client se connecte pour voir la liste des rooms
   */
  async onConnect(conn: Party.Connection) {
    console.log("[Lobby] Client connected:", conn.id);

    // Envoyer la liste actuelle des rooms
    await this.sendRoomsList(conn);
  }

  /**
   * Messages HTTP des Game Parties
   *
   * Les Game Parties notifient le Lobby via HTTP POST :
   * - room_created : Nouvelle room créée
   * - room_state_changed : État de la room changé (ex: idle → playing)
   * - room_deleted : Room supprimée
   */
  async onRequest(req: Party.Request) {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
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
          return new Response("Unknown event type", { status: 400 });
      }

      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("[Lobby] Error:", error);
      return new Response("Internal error", { status: 500 });
    }
  }

  /**
   * Game Party notifie : nouvelle room créée
   */
  private async handleRoomCreated(roomId: string, data: Record<string, any>) {
    const metadata: RoomMetadata = {
      id: roomId,
      hostName: data.hostName || "Unknown",
      state: "idle",
      playersCount: data.playersCount || 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.room.storage.put(`room:${roomId}`, metadata);

    console.log(`[Lobby] Room created: ${roomId} by ${metadata.hostName}`);

    // Broadcaster la nouvelle liste à tous les clients
    await this.broadcastRoomsList();
  }

  /**
   * Game Party notifie : état de la room changé
   */
  private async handleRoomStateChanged(roomId: string, data: Record<string, any>) {
    const key = `room:${roomId}`;
    const metadata = await this.room.storage.get<RoomMetadata>(key);

    if (!metadata) {
      console.warn(`[Lobby] Room not found: ${roomId}`);
      return;
    }

    metadata.state = data.state;
    metadata.playersCount = data.playersCount || metadata.playersCount;
    metadata.updatedAt = Date.now();

    await this.room.storage.put(key, metadata);

    console.log(`[Lobby] Room state changed: ${roomId} → ${metadata.state}`);

    // Broadcaster la liste mise à jour
    await this.broadcastRoomsList();
  }

  /**
   * Game Party notifie : room supprimée
   */
  private async handleRoomDeleted(roomId: string) {
    await this.room.storage.delete(`room:${roomId}`);

    console.log(`[Lobby] Room deleted: ${roomId}`);

    // Broadcaster la liste mise à jour
    await this.broadcastRoomsList();
  }

  /**
   * Récupérer toutes les rooms depuis storage
   *
   * Filtre uniquement les rooms "idle" ou "configured" (joinables)
   * Les rooms "playing" ou "results" ne sont pas affichées
   */
  private async getRooms(): Promise<RoomMetadata[]> {
    const rooms: RoomMetadata[] = [];
    const map = await this.room.storage.list<RoomMetadata>();

    for (const [key, value] of map.entries()) {
      if (key.startsWith("room:")) {
        rooms.push(value);
      }
    }

    // Filtrer uniquement les rooms joinables
    return rooms.filter((r) => r.state === "idle" || r.state === "configured");
  }

  /**
   * Broadcaster la liste des rooms à tous les clients connectés
   */
  private async broadcastRoomsList() {
    const rooms = await this.getRooms();

    this.room.broadcast(
      JSON.stringify({
        type: "rooms_list",
        rooms,
      })
    );
  }

  /**
   * Envoyer la liste à un client spécifique
   */
  private async sendRoomsList(conn: Party.Connection) {
    const rooms = await this.getRooms();

    conn.send(
      JSON.stringify({
        type: "rooms_list",
        rooms,
      })
    );
  }
}

// Type check pour PartyKit
LobbyParty satisfies Party.Worker;
