import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PartySocket from "partysocket";
import { useMachine } from "@xstate/react";
import type { Room, RoomPlayer, RoomResponse, Song } from "@/types";
import { usePartyKitProvider } from "@/context/PartyKitProvider";
import {
  roomMachine,
  type RoomMachineEvent,
  type ServerStateSnapshot,
} from "@/features/multiplayer-game/machines/roomStateMachine";

type UsePartyKitRoomOptions = {
  roomId?: string;
  playerId?: string;
  displayName?: string;
  password?: string;
};

type IncomingMessage =
  | { type: "state_sync"; state: ServerStateSnapshot }
  | {
      type: "join_success";
      playerId: string;
      isHost?: boolean;
      state?: string;
      hostId?: string;
      sessionToken?: string;
    }
  | { type: "password_required" }
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
      currentRoundIndex?: number;
      currentRound?: import("@/types").GameRound;
      displayedSongIndex?: number;
      displayedTotalSongs?: number;
      state?: "playing";
      currentSong?: Song;
      songs?: Song[];
      totalSongs?: number;
    }
  | { type: "configure_success" }
  | { type: "song_changed"; currentSongIndex?: number; currentRoundIndex?: number; currentRound?: import("@/types").GameRound; displayedSongIndex?: number; displayedTotalSongs?: number; currentSong?: Song }
  | { type: "game_ended"; state?: "results"; players?: RoomPlayer[]; finalScores?: unknown }
  | { type: "show_scores"; roomId?: string; finalScores?: Array<RoomPlayer & { rank: number }> }
  | { type: "answer_recorded"; rank: number; points: number; isCorrect: boolean; duplicate: boolean }
  | { type: "player_answered"; playerId: string; songId: string }
  | { type: "all_players_answered" }
  | { type: "host_changed"; newHostId?: string; players?: RoomPlayer[] }
  | { type: "error"; message: string }
  | { type: "unknown"; [key: string]: unknown };

export const usePartyKitRoom = ({
  roomId,
  playerId,
  displayName,
  password,
}: UsePartyKitRoomOptions) => {
  const [machineState, send] = useMachine(roomMachine);
  const { room, players, responses, allPlayersAnswered, isConnected } =
    machineState.context;

  const socketRef = useRef<PartySocket | null>(null);
  const connectionKeyRef = useRef<string | null>(null);
  const handleMessageRef = useRef<((message: IncomingMessage) => void) | null>(
    null
  );

  type AnswerResult = {
    success: boolean;
    data?: { rank: number; points: number };
    error?: string;
  };
  type PendingAnswer = {
    resolve: (value: AnswerResult | PromiseLike<AnswerResult>) => void;
    reject: (error: unknown) => void;
  };
  const pendingAnswerCallbackRef = useRef<PendingAnswer | null>(null);
  const partyKitProvider = usePartyKitProvider();
  const [authRequired, setAuthRequired] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isAuthenticatedRef = useRef(false);
  const initialPasswordRef = useRef<string | undefined>(password);

  // ============================================================================
  // COMPUTED
  // ============================================================================

  const currentSong = useMemo<Song | null>(() => {
    const songs = room.songs || [];
    if (songs.length === 0) return null;
    return songs[room.currentSongIndex ?? 0] ?? null;
  }, [room.songs, room.currentSongIndex]);

  const currentSongId = currentSong?.id;

  const canGoNext = useMemo(() => {
    const songs = room.songs || [];
    if (songs.length === 0) return false;
    if (!allPlayersAnswered) return false;
    return (room.currentSongIndex ?? 0) < songs.length - 1;
  }, [room.songs, room.currentSongIndex, allPlayersAnswered]);

  const playerScore = useMemo(() => {
    const me = players.find((p) => p.id === playerId && p.connected !== false);
    return {
      correct: me?.score ?? 0,
      incorrect: me?.incorrect ?? 0,
    };
  }, [players, playerId]);

  const isHost = useMemo(() => {
    if (!playerId) return false;
    if (room.hostId) return room.hostId === playerId;
    const me = players.find((p) => p.id === playerId);
    return Boolean(me?.isHost);
  }, [playerId, room.hostId, players]);

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    if (password && !initialPasswordRef.current) {
      initialPasswordRef.current = password;
    }
  }, [password]);

  const getSessionToken = useCallback(() => {
    if (typeof window === "undefined" || !roomId) return null;
    return window.sessionStorage.getItem(`roomToken:${roomId}`);
  }, [roomId]);

  const storeSessionToken = useCallback(
    (token: string) => {
      if (typeof window === "undefined" || !roomId) return;
      window.sessionStorage.setItem(`roomToken:${roomId}`, token);
    },
    [roomId]
  );

  const clearSessionToken = useCallback(() => {
    if (typeof window === "undefined" || !roomId) return;
    window.sessionStorage.removeItem(`roomToken:${roomId}`);
  }, [roomId]);

  const sendJoin = useCallback(
    (options?: { password?: string; token?: string }) => {
      if (!socketRef.current || !playerId || !displayName) {
        console.warn("[usePartyKitRoom] ⚠️ sendJoin called but conditions not met", {
          hasSocket: !!socketRef.current,
          hasPlayerId: !!playerId,
          hasDisplayName: !!displayName,
          timestamp: Date.now(),
        });
        return;
      }
      const storedToken = options?.token ?? getSessionToken();
      const payload = {
        type: "join",
        playerId,
        displayName,
        ...(options?.password ? { password: options.password } : {}),
        ...(storedToken ? { token: storedToken } : {}),
      };
      console.log("[usePartyKitRoom] 📤 SENDING join", {
        playerId,
        displayName,
        hasToken: !!storedToken,
        socketReadyState: socketRef.current.readyState,
        timestamp: Date.now(),
      });
      setAuthError(null);
      socketRef.current.send(JSON.stringify(payload));
    },
    [displayName, getSessionToken, playerId]
  );

  // ============================================================================
  // MESSAGE HANDLER
  // ============================================================================

  const handleMessage = useCallback(
    (message: IncomingMessage) => {
      console.log("[usePartyKitRoom] 📨 MESSAGE RECEIVED", {
        type: message.type,
        hasSongs: (message as any).songs?.length ?? (message as any).state?.songs?.length ?? 0,
        songsCount: (message as any).songs?.length ?? (message as any).state?.songs?.length ?? 0,
        currentSongIndex: (message as any).currentSongIndex ?? (message as any).state?.currentSongIndex,
        state: (message as any).state ?? (message as any).state?.state,
        timestamp: Date.now(),
      });
      switch (message.type) {
        case "password_required": {
          clearSessionToken();
          setAuthRequired(true);
          setIsAuthenticated(false);
          return;
        }

        case "join_success": {
          if (message.sessionToken) {
            storeSessionToken(message.sessionToken);
          }
          setIsAuthenticated(true);
          setAuthRequired(false);
          setAuthError(null);
          send(message as RoomMachineEvent);
          return;
        }

        case "answer_recorded": {
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

            send({ type: "answer_recorded", response: newResponse });
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
          return;
        }

        case "error": {
          if (!isAuthenticatedRef.current) {
            setAuthError(message.message);
            setAuthRequired(true);
            return;
          }
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
          send(message as RoomMachineEvent);
          return;
        }

        case "show_scores": {
          // Rediriger vers la page scores
          if (message.roomId && typeof window !== "undefined") {
            window.location.href = `/scores/${message.roomId}`;
          }
          return;
        }

        case "unknown":
          console.warn(
            "[usePartyKitRoom] Unknown message type:",
            (message as { type: string }).type
          );
          return;

        default:
          send(message as RoomMachineEvent);
      }
    },
    [
      currentSongId,
      displayName,
      playerId,
      room.hostId,
      room.state,
      roomId,
      send,
      storeSessionToken,
      clearSessionToken,
    ]
  );

  // Garder le ref Ã  jour avec la derniÃ¨re version de handleMessage
  handleMessageRef.current = handleMessage;

  // ============================================================================
  // CONNECTION
  // ============================================================================

  useEffect(() => {
    const key = `${roomId ?? ""}|${playerId ?? ""}|${displayName ?? ""}`;
    if (!roomId || !playerId || !displayName) {
      send({ type: "socket_close" });
      return;
    }

    connectionKeyRef.current = key;

    const partyHost =
      process.env.NEXT_PUBLIC_PARTYKIT_HOST || "127.0.0.1:1999";
    const managedSocket = partyKitProvider?.getSocket(
      roomId,
      playerId,
      displayName
    );
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
      // Éviter le double appel UNIQUEMENT si on a déjà des songs dans le state
      // (car la socket peut être réutilisée entre la waiting room et la page de jeu)
      const hasSongs = (room.songs?.length ?? 0) > 0;
      if ((socket as any).__handleOpenCalled && hasSongs) {
        console.log("[usePartyKitRoom] ⚠️ handleOpen already called AND has songs, skipping", {
          roomId,
          playerId,
          songsCount: room.songs?.length ?? 0,
          timestamp: Date.now(),
        });
        return;
      }
      (socket as any).__handleOpenCalled = true;
      console.log("[usePartyKitRoom] 🔌 socket_open handler called", {
        roomId,
        playerId,
        displayName,
        socketReadyState: socket.readyState,
        hasSongs,
        songsCount: room.songs?.length ?? 0,
        timestamp: Date.now(),
      });
      send({ type: "socket_open" });
      setIsAuthenticated(false);
      setAuthRequired(false);
      setAuthError(null);
      sendJoin({ password: initialPasswordRef.current });
    };

    const handleMessageEvent = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data) as IncomingMessage;
        handleMessageRef.current?.(message);
      } catch (error) {
        console.error("[usePartyKitRoom] Invalid message:", error);
      }
    };

    const handleClose = (event: CloseEvent) => {
      send({ type: "socket_close" });
      setIsAuthenticated(false);
      setAuthRequired(false);
      if (process.env.NODE_ENV === "development") {
        console.info("[usePartyKitRoom] socket close", {
          roomId,
          playerId,
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
      }
    };

    const handleError = (error: Event) => {
      send({
        type: "socket_error",
        error: error instanceof Error ? error.message : "WebSocket error",
      });
    };

    socket.addEventListener("open", handleOpen);
    socket.addEventListener("message", handleMessageEvent);
    socket.addEventListener("close", handleClose);
    socket.addEventListener("error", handleError);

    // ⚠️ IMPORTANT: Assigner socketRef AVANT d'appeler handleOpen() si la socket est déjà ouverte
    // Sinon sendJoin() ne trouvera pas socketRef.current et ne pourra pas envoyer le join
    socketRef.current = socket;

    // Si la socket est déjà ouverte (réutilisée), envoyer le join immédiatement
    if (socket.readyState === WebSocket.OPEN) {
      console.log("[usePartyKitRoom] 🔌 Socket already OPEN, calling handleOpen immediately", {
        roomId,
        playerId,
        displayName,
        timestamp: Date.now(),
      });
      handleOpen();
    } else {
      console.log("[usePartyKitRoom] 🔌 Socket not yet open, waiting for 'open' event", {
        roomId,
        playerId,
        displayName,
        readyState: socket.readyState,
        timestamp: Date.now(),
      });
    }

    return () => {
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("message", handleMessageEvent);
      socket.removeEventListener("close", handleClose);
      socket.removeEventListener("error", handleError);
      if (!managedSocket && socketRef.current === socket) {
        socket.close();
        socketRef.current = null;
      }
      connectionKeyRef.current = null;
      send({ type: "socket_close" });
    };
  }, [roomId, playerId, displayName, partyKitProvider, send, sendJoin]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const startGame = useCallback(async () => {
    if (!socketRef.current || !playerId) {
      return { success: false, error: "Not connected" };
    }
    socketRef.current.send(
      JSON.stringify({
        type: "start",
        hostId: playerId,
      })
    );
    return { success: true };
  }, [playerId]);

  const goNextSong = useCallback(async () => {
    if (!socketRef.current || !playerId) {
      return { success: false, error: "Not connected" };
    }
    socketRef.current.send(
      JSON.stringify({
        type: "next",
        hostId: playerId,
      })
    );
    return { success: true };
  }, [playerId]);

  const showScores = useCallback(async () => {
    if (!socketRef.current || !playerId) {
      return { success: false, error: "Not connected" };
    }
    socketRef.current.send(
      JSON.stringify({
        type: "show_scores",
        hostId: playerId,
      })
    );
    return { success: true };
  }, [playerId]);

  const configureRoom = useCallback(
    async (
      universeId: string,
      songs: Song[],
      allowedWorks?: string[],
      options?: { noSeek: boolean },
      mysteryEffectsConfig?: {
        enabled: boolean;
        frequency: number;
        effects: ("double" | "reverse")[];
      }
    ) => {
      if (!socketRef.current) {
        return { success: false, error: "Not connected" };
      }
      if (!isHost) {
        return { success: false, error: "Only the host can configure" };
      }

      const configureMessage = {
        type: "configure",
        hostId: playerId,
        universeId,
        songs,
        allowedWorks: allowedWorks || [],
        options: options || { noSeek: false },
        mysteryEffectsConfig,
      };
      socketRef.current.send(JSON.stringify(configureMessage));

      return { success: true };
    },
    [isHost, playerId]
  );

  const submitPassword = useCallback(
    (nextPassword: string) => {
      const trimmed = nextPassword.trim();
      if (!trimmed) return;
      sendJoin({ password: trimmed });
    },
    [sendJoin]
  );

  const submitAnswer = useCallback(
    async (
      selectedWorkId: string | null,
      _isCorrect: boolean,
      answers?: Array<{ songId: string; workId: string | null }>
    ) => {
      if (!socketRef.current || !playerId) {
        return { success: false, error: "Not ready" };
      }

      void _isCorrect;

      // Mode double : utiliser answers[]
      if (answers && answers.length > 0) {
        const message = {
          type: "answer",
          playerId,
          answers: answers.map((a) => ({
            songId: a.songId,
            workId: a.workId,
          })),
        };

        return new Promise<AnswerResult>((resolve, reject) => {
          pendingAnswerCallbackRef.current = { resolve, reject };
          socketRef.current!.send(JSON.stringify(message));

          setTimeout(() => {
            const pending = pendingAnswerCallbackRef.current;
            if (pending) {
              pending.reject(new Error("Timeout"));
              pendingAnswerCallbackRef.current = null;
            }
          }, 5000);
        });
      }

      // Mode normal/reverse : format simple
      if (!currentSong) {
        return { success: false, error: "Not ready" };
      }

      const message = {
        type: "answer",
        playerId,
        songId: currentSong.id,
        workId: selectedWorkId,
      };

      return new Promise<AnswerResult>((resolve, reject) => {
        pendingAnswerCallbackRef.current = { resolve, reject };
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
    [currentSong, playerId]
  );

  // Reset des rÃ©ponses locales quand on change de morceau
  useEffect(() => {
    if (currentSongId) {
      send({ type: "reset_responses" });
    }
  }, [currentSongId, send]);

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
    showScores,
    submitAnswer,
    configureRoom,

    isConnected,
    isHost,
    authRequired,
    authError,
    isAuthenticated,
    submitPassword,
  };
};
