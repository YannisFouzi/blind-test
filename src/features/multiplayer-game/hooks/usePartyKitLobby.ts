import { useCallback, useEffect, useState } from "react";
import PartySocket from "partysocket";

export interface RoomMetadata {
  id: string;
  hostName: string;
  state: "idle" | "configured" | "playing" | "results";
  playersCount: number;
  createdAt: number;
  updatedAt: number;
  universeId?: string;
  hasPassword?: boolean;
}

export interface UsePartyKitLobbyOptions {
  enabled?: boolean;
}

const DEFAULT_PARTY_HOST = "http://127.0.0.1:1999";

const getPartyHost = () =>
  process.env.NEXT_PUBLIC_PARTYKIT_HOST || DEFAULT_PARTY_HOST;

const createRoomId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `room-${timestamp}-${random}`;
};

export const usePartyKitLobby = (options: UsePartyKitLobbyOptions = {}) => {
  const { enabled = true } = options;

  const [rooms, setRooms] = useState<RoomMetadata[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setRooms([]);
      setIsConnected(false);
      setError(null);
      return;
    }

    const socket = new PartySocket({
      host: getPartyHost(),
      party: "lobby",
      room: "main",
    });

    socket.addEventListener("open", () => {
      setIsConnected(true);
      setError(null);
    });

    socket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data as string);

        if (message.type === "rooms_list") {
          setRooms(message.rooms || []);
        }
      } catch (err) {
        console.error("[usePartyKitLobby] Parse error:", err);
        setError("Erreur de parsing des donnees du lobby");
      }
    });

    socket.addEventListener("close", () => {
      setIsConnected(false);
    });

    socket.addEventListener("error", (err) => {
      console.error("[usePartyKitLobby] Error:", err);
      setIsConnected(false);
      setError("Erreur de connexion au lobby");
    });

    return () => {
      socket.close();
    };
  }, [enabled]);

  const createRoom = useCallback(
    async (
      hostName: string,
      _universeId: string,
      hasPassword = false
    ): Promise<string> => {
      setIsCreating(true);
      setError(null);

      void _universeId;

      try {
        const roomId = createRoomId();

        try {
          await fetch(`${getPartyHost()}/parties/lobby/main`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "room_created",
              roomId,
              hostName,
              playersCount: 1,
              hasPassword: Boolean(hasPassword),
            }),
          });
        } catch (notifyError) {
          console.error("[usePartyKitLobby] Failed to notify lobby", notifyError);
        }

        setIsCreating(false);
        return roomId;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
        setError(errorMessage);
        setIsCreating(false);
        throw err;
      }
    },
    []
  );

  return {
    rooms,
    isConnected,
    createRoom,
    isCreating,
    error,
  };
};
