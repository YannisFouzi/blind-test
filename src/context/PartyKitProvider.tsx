"use client";

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import PartySocket from "partysocket";

type PartyKitContextValue = {
  getSocket: (roomId: string, playerId: string, displayName: string) => PartySocket;
  closeSocket: (roomId: string) => void;
};

const PartyKitContext = createContext<PartyKitContextValue | null>(null);

export const PartyKitProvider = ({ children }: { children: ReactNode }) => {
  const socketsRef = useRef<Map<string, PartySocket>>(new Map());

  const value = useMemo<PartyKitContextValue>(() => {
    const getSocket = (roomId: string, playerId: string, displayName: string) => {
      const key = `${roomId}|${playerId}`;
      const existing = socketsRef.current.get(key);
      if (existing) {
        return existing;
      }

      const host = process.env.NEXT_PUBLIC_PARTYKIT_HOST || "127.0.0.1:1999";
      const socket = new PartySocket({
        host,
        room: roomId,
        party: "game",
      });

      // Log minimal pour suivre l'état de la connexion partagée
      socket.addEventListener("open", () => {
        console.info("[PartyKitProvider] socket open", { roomId, playerId, displayName });
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
    return () => {
      // Cleanup de tous les sockets si le provider est démonté
      socketsRef.current.forEach((socket) => {
        try {
          socket.close();
        } catch {
          // ignore
        }
      });
      socketsRef.current.clear();
    };
  }, []);

  return <PartyKitContext.Provider value={value}>{children}</PartyKitContext.Provider>;
};

export const usePartyKitProvider = () => {
  return useContext(PartyKitContext);
};
