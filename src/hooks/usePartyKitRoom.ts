import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PartySocket from "partysocket";
import { Room, RoomPlayer, RoomResponse, Song } from "@/types";
import { usePartyKitProvider } from "@/context/PartyKitProvider";

type UsePartyKitRoomOptions = {
  roomId?: string;
  playerId?: string;
  displayName?: string;
};

type ServerStateSnapshot = {
  roomId?: string;
  hostId?: string;
  universeId?: string;
  songs?: Song[];
  currentSongIndex?: number;
  state?: string;
  allowedWorks?: string[];
  options?: { noSeek?: boolean };
  players?: RoomPlayer[];
};

type IncomingMessage =
  | { type: "state_sync"; state: ServerStateSnapshot }
  | { type: "join_success"; playerId: string; isHost?: boolean; state?: string; hostId?: string }
  | { type: "players_update"; players: RoomPlayer[] }
  | {
      type: "room_configured";
      universeId?: string;
      songsCount?: number;
      songs?: Song[];
      allowedWorks?: string[];
      options?: { noSeek?: boolean };
    }
  | {
      type: "game_started";
      currentSongIndex?: number;
      state?: "playing";
      currentSong?: Song;
      songs?: Song[];
      totalSongs?: number;
    }
  | { type: "configure_success" }
  | { type: "song_changed"; currentSongIndex?: number; currentSong?: Song }
  | { type: "game_ended"; players?: RoomPlayer[] }
  | { type: "answer_recorded"; rank: number; points: number; isCorrect: boolean; duplicate: boolean }
  | { type: "all_players_answered" }
  | { type: "host_changed"; newHostId?: string; players?: RoomPlayer[] }
  | { type: "error"; message: string }
  | { type: "unknown"; [key: string]: unknown };

export const usePartyKitRoom = ({ roomId, playerId, displayName }: UsePartyKitRoomOptions) => {
  const [room, setRoom] = useState<Partial<Room>>({
    state: "idle",
    currentSongIndex: 0,
    songs: [],
    hostId: "",
    universeId: "",
  });
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [responses, setResponses] = useState<RoomResponse[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [allPlayersAnswered, setAllPlayersAnswered] = useState(false);

  const socketRef = useRef<PartySocket | null>(null);
  const connectionKeyRef = useRef<string | null>(null);
  const handleMessageRef = useRef<((message: IncomingMessage) => void) | null>(null);

  type AnswerResult = { success: boolean; data?: { rank: number; points: number }; error?: string };
  type PendingAnswer = { resolve: (value: AnswerResult | PromiseLike<AnswerResult>) => void; reject: (error: unknown) => void };
  const pendingAnswerCallbackRef = useRef<PendingAnswer | null>(null);
  const partyKitProvider = usePartyKitProvider();

  // ============================================================================
  // COMPUTED
  // ============================================================================

  const currentSong = useMemo<Song | null>(() => {
    if (!room.songs || room.songs.length === 0) return null;
    return room.songs[room.currentSongIndex ?? 0] ?? null;
  }, [room.songs, room.currentSongIndex]);

  const currentSongId = currentSong?.id;

  const canGoNext = useMemo(() => {
    if (!room.songs || room.songs.length === 0) return false;
    if (!allPlayersAnswered) return false;
    return (room.currentSongIndex ?? 0) < room.songs.length - 1;
  }, [room.songs, room.currentSongIndex, allPlayersAnswered]);

  const playerScore = useMemo(() => {
    const me = players.find((p) => p.id === playerId && p.connected !== false);
    return {
      correct: me?.score ?? 0,
      incorrect: me?.incorrect ?? 0,
    };
  }, [players, playerId]);

  // ============================================================================
  // MESSAGE HANDLER
  // ============================================================================

  const handleMessage = useCallback(
    (message: IncomingMessage) => {
      switch (message.type) {
        case "state_sync":
          if (message.state) {
            console.info("[usePartyKitRoom] state_sync", {
              incomingHostId: message.state.hostId,
              incomingState: message.state.state,
              incomingSongs: message.state.songs?.length ?? 0,
              incomingPlayers: message.state.players?.length ?? 0,
            });
            const nextState = (message.state.state as Room["state"]) || "idle";

            setRoom((prev) => ({
              ...prev,
              id: message.state.roomId,
              hostId: message.state.hostId,
              universeId: message.state.universeId,
              songs: message.state.songs || [],
              currentSongIndex: message.state.currentSongIndex ?? 0,
              state: nextState,
              allowedWorks: message.state.allowedWorks,
              options: message.state.options
                ? { noSeek: Boolean(message.state.options.noSeek) }
                : prev.options,
            }));
            setPlayers(message.state.players || []);
            console.info("[usePartyKitRoom] state_sync applied", {
              roomId: message.state.roomId,
              hostId: message.state.hostId,
              state: nextState,
              songs: message.state.songs?.length ?? 0,
              players: message.state.players?.length ?? 0,
            });
          }
          break;

        case "join_success":
          setIsHost(message.isHost ?? false);
          if (message.hostId) {
            setRoom((prev) => ({ ...prev, hostId: message.hostId }));
          }
          console.info("[usePartyKitRoom] join_success", {
            roomId,
            playerId,
            isHost: message.isHost,
            state: message.state,
            hostIdFromMessage: message.hostId,
            localHostId: room.hostId,
          });
          break;

        case "players_update":
          console.info("[usePartyKitRoom] players_update", {
            roomId,
            playerId,
            players: message.players?.length ?? 0,
          });
          setPlayers(message.players || []);
          break;

        case "room_configured":
          console.info("[usePartyKitRoom] room_configured RECEIVED", {
            roomId,
            playerId,
            universeId: message.universeId,
            songs: message.songs?.length ?? 0,
            allowedWorks: message.allowedWorks?.length ?? 0,
            options: message.options,
            previousUniverseId: room.universeId,
          });
          setRoom((prev) => {
            const nextRoom = {
              ...prev,
              universeId: message.universeId || prev.universeId,
              songs: message.songs || prev.songs || [],
              allowedWorks: message.allowedWorks,
              options: message.options ? { noSeek: Boolean(message.options.noSeek) } : prev.options,
            };
            console.info("[usePartyKitRoom] room_configured APPLIED", {
              roomId,
              playerId,
              previousUniverseId: prev.universeId,
              newUniverseId: nextRoom.universeId,
              songsCount: nextRoom.songs.length,
            });
            return nextRoom;
          });
          break;

        case "game_started":
          console.info("[usePartyKitRoom] game_started", {
            roomId,
            playerId,
            songs: message.songs?.length ?? 0,
            currentSongIndex: message.currentSongIndex ?? 0,
          });
          setRoom((prev) => ({
            ...prev,
            state: "playing",
            currentSongIndex: message.currentSongIndex ?? 0,
            songs: message.songs || prev.songs,
          }));
          setAllPlayersAnswered(false);
          break;

        case "configure_success":
          console.info("[usePartyKitRoom] configure_success", { roomId, playerId });
          break;

        case "song_changed":
          console.info("[usePartyKitRoom] song_changed", {
            roomId,
            playerId,
            currentSongIndex: message.currentSongIndex,
          });
          setRoom((prev) => ({
            ...prev,
            currentSongIndex: message.currentSongIndex ?? prev.currentSongIndex,
          }));
          setAllPlayersAnswered(false);
          break;

        case "game_ended":
          console.info("[usePartyKitRoom] game_ended", {
            roomId,
            playerId,
            playersCount: message.players?.length ?? 0,
          });
          setRoom((prev) => ({
            ...prev,
            state: "results",
          }));
          if (message.players) {
            setPlayers(message.players);
          }
          break;

        case "answer_recorded":
          console.info("[usePartyKitRoom] answer_recorded", {
            roomId,
            playerId,
            currentSongId,
            isCorrect: message.isCorrect,
            rank: message.rank,
            points: message.points,
            duplicate: message.duplicate,
          });
          if (currentSongId && playerId) {
            const newResponse: RoomResponse = {
              id: `${currentSongId}-${playerId}`,
              roomId: roomId ?? "",
              songId: currentSongId,
              playerId,
              selectedWorkId: null,
              isCorrect: message.isCorrect,
              answeredAt: new Date(),
              rank: message.rank,
              points: message.points,
            };

            setResponses((prev) => {
              const exists = prev.some((r) => r.songId === currentSongId && r.playerId === playerId);
              if (exists) return prev;
              return [...prev, newResponse];
            });
          }

          if (pendingAnswerCallbackRef.current) {
            pendingAnswerCallbackRef.current.resolve({
              success: true,
              data: {
                rank: message.rank,
                points: message.points,
              },
            });
            pendingAnswerCallbackRef.current = null;
          }
          break;

        case "all_players_answered":
          console.info("[usePartyKitRoom] all_players_answered", {
            roomId,
            playerId,
          });
          setAllPlayersAnswered(true);
          break;

        case "host_changed":
          console.info("[usePartyKitRoom] host_changed", {
            roomId,
            playerId,
            newHostId: message.newHostId,
            players: message.players?.length ?? 0,
          });
          setIsHost(message.newHostId === playerId);
          setRoom((prev) => ({ ...prev, hostId: message.newHostId ?? prev.hostId }));
          if (message.players) {
            setPlayers(message.players);
          }
          break;

        case "error":
          console.error("[usePartyKitRoom] Server error:", message.message, {
            roomId,
            playerId,
            displayName,
            state: room.state,
            hostId: room.hostId,
          });
          if (pendingAnswerCallbackRef.current) {
            pendingAnswerCallbackRef.current.reject(new Error(message.message));
            pendingAnswerCallbackRef.current = null;
          }
          break;

        default:
          console.warn("[usePartyKitRoom] Unknown message type:", (message as { type: string }).type);
      }
    },
    [currentSongId, displayName, playerId, room.hostId, room.state, room.universeId, roomId]
  );

  // Garder le ref à jour avec la dernière version de handleMessage
  // Cela évite de recréer le useEffect de connexion à chaque changement de state
  handleMessageRef.current = handleMessage;

  // ============================================================================
  // CONNECTION
  // ============================================================================

  useEffect(() => {
    const key = `${roomId ?? ""}|${playerId ?? ""}|${displayName ?? ""}`;
    if (!roomId || !playerId || !displayName) {
      console.info("[usePartyKitRoom] skip connection (missing params)", { roomId, playerId, displayName });
      return;
    }

    connectionKeyRef.current = key;
    console.info("[usePartyKitRoom] init connection", { key, roomId, playerId, displayName });

    const partyHost = process.env.NEXT_PUBLIC_PARTYKIT_HOST || "127.0.0.1:1999";
    const managedSocket = partyKitProvider?.getSocket(roomId, playerId, displayName);
    const socket =
      socketRef.current && connectionKeyRef.current === key
        ? socketRef.current
        : managedSocket
        ? managedSocket
        : new PartySocket({
            host: partyHost,
            room: roomId,
            party: "game",
          });

    const handleOpen = () => {
      console.info("[usePartyKitRoom] socket open", { roomId, playerId, displayName });
      setIsConnected(true);
      socket.send(
        JSON.stringify({
          type: "join",
          playerId,
          displayName,
        })
      );
    };

    const handleMessageEvent = (event: MessageEvent) => {
      console.info("[usePartyKitRoom] raw message", { data: event.data });
      try {
        const message = JSON.parse(event.data) as IncomingMessage;
        // Utiliser le ref pour éviter les reconnexions quand handleMessage change
        handleMessageRef.current?.(message);
      } catch (error) {
        console.error("[usePartyKitRoom] Invalid message:", error);
      }
    };

    const handleClose = (event: CloseEvent) => {
      console.info("[usePartyKitRoom] socket close", {
        roomId,
        playerId,
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });
      setIsConnected(false);
    };

    const handleError = (error: Event) => {
      console.error("[usePartyKitRoom] WebSocket error:", error);
      setIsConnected(false);
    };

    socket.addEventListener("open", handleOpen);
    socket.addEventListener("message", handleMessageEvent);
    socket.addEventListener("close", handleClose);
    socket.addEventListener("error", handleError);

    if (socket.readyState === WebSocket.OPEN) {
      handleOpen();
    }

    socketRef.current = socket;

    return () => {
      console.info("[usePartyKitRoom] cleanup connection", { key, roomId, playerId, managed: Boolean(managedSocket) });
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("message", handleMessageEvent);
      socket.removeEventListener("close", handleClose);
      socket.removeEventListener("error", handleError);
      if (!managedSocket && socketRef.current === socket) {
        socket.close();
        socketRef.current = null;
      }
      // Forcer la réinitialisation de la clé pour permettre un réattachement propre
      connectionKeyRef.current = null;
    };
    // handleMessage est exclu des dépendances car on utilise handleMessageRef
    // Cela évite les reconnexions quand le state change
  }, [roomId, playerId, displayName, partyKitProvider]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const startGame = useCallback(async () => {
    console.info("[usePartyKitRoom] startGame called", {
      roomId,
      playerId,
      socketConnected: Boolean(socketRef.current),
    });
    if (!socketRef.current || !playerId) {
      console.error("[usePartyKitRoom] startGame FAILED: Not connected or no playerId", {
        socketConnected: Boolean(socketRef.current),
        playerId,
      });
      return { success: false, error: "Not connected" };
    }
    console.info("[usePartyKitRoom] send start", { roomId, playerId });
    socketRef.current.send(
      JSON.stringify({
        type: "start",
        hostId: playerId,
      })
    );
    return { success: true };
  }, [playerId, roomId]);

  const goNextSong = useCallback(async () => {
    if (!socketRef.current || !playerId) {
      return { success: false, error: "Not connected" };
    }
    console.info("[usePartyKitRoom] send next", { roomId, playerId });
    socketRef.current.send(
      JSON.stringify({
        type: "next",
        hostId: playerId,
      })
    );
    return { success: true };
  }, [playerId, roomId]);

  const configureRoom = useCallback(
    async (universeId: string, songs: Song[], allowedWorks?: string[], options?: { noSeek: boolean }) => {
      console.info("[usePartyKitRoom] configureRoom called", {
        roomId,
        playerId,
        isHost,
        socketConnected: Boolean(socketRef.current),
      });
      if (!socketRef.current) {
        console.error("[usePartyKitRoom] configureRoom FAILED: Not connected");
        return { success: false, error: "Not connected" };
      }
      if (!isHost) {
        console.error("[usePartyKitRoom] configureRoom FAILED: Not host", { isHost, playerId });
        return { success: false, error: "Only the host can configure" };
      }

      const configureMessage = {
        type: "configure",
        hostId: playerId,
        universeId,
        songs,
        allowedWorks: allowedWorks || [],
        options: options || { noSeek: false },
    };
    console.info("[usePartyKitRoom] send configure", {
      roomId,
      playerId,
        universeId,
        songs: songs.length,
        allowedWorks: allowedWorks?.length ?? 0,
        options,
        messageType: configureMessage.type,
        messageHostId: configureMessage.hostId,
      });
      socketRef.current.send(JSON.stringify(configureMessage));

      return { success: true };
    },
    [isHost, playerId, roomId]
  );

  const submitAnswer = useCallback(
    async (selectedWorkId: string | null, _isCorrect: boolean) => {
      if (!socketRef.current || !playerId || !currentSong) {
        return { success: false, error: "Not ready" };
      }

      void _isCorrect; // not used (reserved for future scoring)

      const message = {
        type: "answer",
        playerId,
        songId: currentSong.id,
        workId: selectedWorkId,
      };

      return new Promise<{ success: boolean; data?: { rank: number; points: number }; error?: string }>((resolve, reject) => {
        pendingAnswerCallbackRef.current = { resolve, reject };
        console.info("[usePartyKitRoom] send answer", { roomId, playerId, songId: currentSong.id, workId: selectedWorkId });
        socketRef.current!.send(JSON.stringify(message));

        setTimeout(() => {
          const pending = pendingAnswerCallbackRef.current;
          if (pending) {
            pending.reject(new Error("Timeout"));
            pendingAnswerCallbackRef.current = null;
          }
        }, 5000);
      });
    },
    [currentSong, playerId, roomId]
  );

  // Reset des réponses locales quand on change de morceau
  useEffect(() => {
    if (currentSongId) {
      setResponses([]);
    }
  }, [currentSongId]);

  return {
    room: room as Room,
    players,
    responses,
    currentSong,
    currentSongIndex: room.currentSongIndex ?? 0,
    state: room.state ?? "idle",

    allPlayersAnswered,
    canGoNext,
    playerScore,

    options: room.options,
    allowedWorks: room.allowedWorks,

    startGame,
    goNextSong,
    submitAnswer,
    configureRoom,

    isConnected,
    isHost,
  };
};
