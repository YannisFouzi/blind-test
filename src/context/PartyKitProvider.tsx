"use client";

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import PartySocket from "partysocket";

type PartyKitContextValue = {
  getSocket: (
    roomId: string,
    playerId: string,
    displayName: string,
    onOpen?: (socket: PartySocket) => void
  ) => PartySocket;
  closeSocket: (roomId: string) => void;
};

type SocketEntry = { key: string; socket: PartySocket };

type SocketIdentifier = {
  roomId: string;
  playerId: string;
};

const PartyKitContext = createContext<PartyKitContextValue | null>(null);

const PARTY_NAME = "game";
const DEFAULT_PARTYKIT_HOST = "127.0.0.1:1999";

const buildSocketKey = ({ roomId, playerId }: SocketIdentifier) => `${roomId}|${playerId}`;

const buildRoomPrefix = (roomId: string) => `${roomId}|`;

const getRoomSockets = (entries: SocketEntry[], roomId: string) =>
  entries.filter(({ key }) => !key.startsWith(buildRoomPrefix(roomId)));

export const PartyKitProvider = ({ children }: { children: ReactNode }) => {
  const socketsRef = useRef<Map<string, PartySocket>>(new Map());

  const value = useMemo<PartyKitContextValue>(() => {
    const getSocket = (
      roomId: string,
      playerId: string,
      displayName: string,
      onOpen?: (socket: PartySocket) => void
    ) => {
      const key = buildSocketKey({ roomId, playerId });
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

      const otherRoomSockets = getRoomSockets(
        Array.from(socketsRef.current.entries()).map(([entryKey, socket]) => ({
          key: entryKey,
          socket,
        })),
        roomId
      );

      if (otherRoomSockets.length > 0) {
        console.info(
          "[PartyKitProvider] Closing sockets for other rooms before creating new socket",
          {
            newRoomId: roomId,
            closingCount: otherRoomSockets.length,
            closingKeys: otherRoomSockets.map(({ key: entryKey }) => entryKey),
          }
        );
        otherRoomSockets.forEach(({ key: entryKey, socket }) => {
          try {
            socket.close();
          } catch {
            // ignore
          }
          socketsRef.current.delete(entryKey);
        });
      }

      const host = process.env.NEXT_PUBLIC_PARTYKIT_HOST || DEFAULT_PARTYKIT_HOST;
      const socket = new PartySocket({
        host,
        room: roomId,
        party: PARTY_NAME,
      });

      socket.addEventListener("open", () => {
        console.info("[PartyKitProvider] socket open", { roomId, playerId, displayName });
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
      const roomPrefix = buildRoomPrefix(roomId);
      const entries = Array.from(socketsRef.current.entries());
      entries
        .filter(([entryKey]) => entryKey.startsWith(roomPrefix))
        .forEach(([entryKey, socket]) => {
          try {
            socket.close();
          } catch {
            // ignore
          }
          socketsRef.current.delete(entryKey);
        });
    };

    return { getSocket, closeSocket };
  }, []);

  useEffect(() => {
    const sockets = socketsRef.current;
    return () => {
      if (process.env.NODE_ENV === "development" && sockets.size > 0) {
        console.warn(
          `[HOST-DEBUG] PartyKitProvider unmount -> fermeture de toutes les sockets (count=${sockets.size})`
        );
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
  }, []);

  return <PartyKitContext.Provider value={value}>{children}</PartyKitContext.Provider>;
};

export const usePartyKitProvider = () => useContext(PartyKitContext);
