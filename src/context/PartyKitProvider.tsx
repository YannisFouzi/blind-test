"use client";

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import PartySocket from "partysocket";

type PartyKitContextValue = {
  getSocket: (roomId: string, playerId: string, displayName: string, onOpen?: (socket: PartySocket) => void) => PartySocket;
  closeSocket: (roomId: string) => void;
};

const PartyKitContext = createContext<PartyKitContextValue | null>(null);

export const PartyKitProvider = ({ children }: { children: ReactNode }) => {
  const socketsRef = useRef<Map<string, PartySocket>>(new Map());

  const value = useMemo<PartyKitContextValue>(() => {
    const getSocket = (roomId: string, playerId: string, displayName: string, onOpen?: (socket: PartySocket) => void) => {
      const key = `${roomId}|${playerId}`;
      const existing = socketsRef.current.get(key);
      if (existing) {
        if (onOpen) {
          if (existing.readyState === WebSocket.OPEN) {
            onOpen(existing);
          } else {
            existing.addEventListener("open", () => onOpen(existing), { once: true });
          }
        }
        return existing;
      }

      // ✅ OPTION A FIX (docs/AUDIT-CONNEXION-ROOM-GAME.md):
      // Avant de créer une nouvelle socket pour un roomId, fermer les sockets des AUTRES roomIds.
      // Cela évite d'accumuler des connexions si l'utilisateur ouvre une autre room sans cliquer "Quitter".
      // Une seule room active par client à la fois.
      const otherRoomSockets = Array.from(socketsRef.current.entries()).filter(
        ([k]) => !k.startsWith(`${roomId}|`)
      );
      if (otherRoomSockets.length > 0) {
        console.info("[PartyKitProvider] Closing sockets for other rooms before creating new socket", {
          newRoomId: roomId,
          closingCount: otherRoomSockets.length,
          closingKeys: otherRoomSockets.map(([k]) => k),
        });
        otherRoomSockets.forEach(([k, socket]) => {
          try {
            socket.close();
          } catch {
            // ignore
          }
          socketsRef.current.delete(k);
        });
      }

      const host = process.env.NEXT_PUBLIC_PARTYKIT_HOST || "127.0.0.1:1999";
      const socket = new PartySocket({
        host,
        room: roomId,
        party: "game",
      });

      // Log minimal + callback hook (fix room→game: listener "open" du hook pas appelé, readyState pas mis à jour sur PartySocket)
      socket.addEventListener("open", () => {
        console.info("[PartyKitProvider] socket open", { roomId, playerId, displayName });
        // FIX: Pass the socket to callback so it can use it directly (readyState of wrapper is not synced)
        onOpen?.(socket);
      });
      socket.addEventListener("close", (event) => {
        console.info("[PartyKitProvider] socket close", {
          roomId,
          playerId,
          code: (event as CloseEvent).code,
          reason: (event as CloseEvent).reason,
          wasClean: (event as CloseEvent).wasClean,
        });
      });
      socket.addEventListener("error", (error) => {
        console.error("[PartyKitProvider] socket error", { roomId, playerId, error });
      });

      socketsRef.current.set(key, socket);
      return socket;
    };

    const closeSocket = (roomId: string) => {
      const toDelete = Array.from(socketsRef.current.entries()).filter(([key]) => key.startsWith(`${roomId}|`));
      toDelete.forEach(([key, socket]) => {
        try {
          socket.close();
        } catch {
          // ignore
        }
        socketsRef.current.delete(key);
      });
    };

    return { getSocket, closeSocket };
  }, []);

  useEffect(() => {
    const { current: sockets } = socketsRef;

    return () => {
      // Cleanup de tous les sockets si le provider est démonté
      if (process.env.NODE_ENV === "development" && sockets.size > 0) {
        console.warn("[HOST-DEBUG] PartyKitProvider unmount → fermeture de toutes les sockets (count=" + sockets.size + ")");
      }
      sockets.forEach((socket) => {
        try {
          socket.close();
        } catch {
          // ignore
        }
      });
      sockets.clear();
    };
  }, [socketsRef]);

  return <PartyKitContext.Provider value={value}>{children}</PartyKitContext.Provider>;
};

export const usePartyKitProvider = () => {
  return useContext(PartyKitContext);
};
