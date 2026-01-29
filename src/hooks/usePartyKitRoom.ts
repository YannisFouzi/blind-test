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
import { navigateToUrl } from "@/hooks/useGameNavigation";

type UsePartyKitRoomOptions = {
  roomId?: string;
  playerId?: string;
  displayName?: string;
  password?: string;
  /** Callback appelé avant redirection vers waiting room (pour cleanup audio, etc.) */
  onRedirect?: () => void;
  /** Navigation client (ex. router.push). Si fourni, remplace navigateToUrl pour show_scores et redirect_to_waiting_room. */
  navigate?: (url: string) => void;
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
      worksPerRound?: number;
      options?: { noSeek?: boolean };
    }
  | {
      type: "game_starting";
      state: "starting";
      songs?: Song[];
      totalSongs?: number;
      currentSongIndex?: number;
      currentRoundIndex?: number;
      currentRound?: import("@/types").GameRound;
      displayedSongIndex?: number;
      displayedTotalSongs?: number;
    }
  | { type: "all_players_ready"; startIn: number }
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
  | {
      type: "redirect_to_waiting_room";
      roomId: string;
      players?: Array<{ id: string; displayName: string }>;
    }
  | { type: "answer_recorded"; rank: number; points: number; isCorrect: boolean; duplicate: boolean }
  | { type: "player_answered"; playerId: string; songId: string }
  | { type: "all_players_answered" }
  | { type: "host_changed"; newHostId?: string; players?: RoomPlayer[] }
  | { type: "host_preview_start"; universeId: string; universeName?: string }
  | {
      type: "host_preview_options";
      noSeek?: boolean;
      mysteryEffects?: { enabled: boolean; frequency: number; effects: ("double" | "reverse")[] };
      allowedWorks?: string[];
      allowedWorkNames?: string[];
      allWorksSelected?: boolean;
      maxSongs?: number | null;
      totalSongs?: number;
    }
  | { type: "host_preview_clear" }
  | { type: "error"; message: string }
  | { type: "unknown"; [key: string]: unknown };

export type HostPreview = {
  universeId: string;
  universeName?: string;
  noSeek?: boolean;
  mysteryEffects?: { enabled: boolean; frequency: number; effects: ("double" | "reverse")[] };
  allowedWorks?: string[];
  allowedWorkNames?: string[];
  allWorksSelected?: boolean;
  maxSongs?: number | null;
  totalSongs?: number;
};

export const usePartyKitRoom = ({
  roomId,
  playerId,
  displayName,
  password,
  onRedirect,
  navigate: navigateClient,
}: UsePartyKitRoomOptions) => {
  const [machineState, send] = useMachine(roomMachine);
  const { room, players, responses, allPlayersAnswered, isConnected, startAt } =
    machineState.context;

  const socketRef = useRef<PartySocket | null>(null);
  const connectionKeyRef = useRef<string | null>(null);
  const handleMessageRef = useRef<((message: IncomingMessage) => void) | null>(
    null
  );
  // Flag pour ignorer les state_sync après un redirect_to_waiting_room
  const isRedirectingToWaitingRef = useRef(false);
  // WORKAROUND: listener 'open' not always triggered after room→game nav; see docs/AUDIT §11 + v2 root cause.
  const socketOpenSentRef = useRef(false);
  const sendRef = useRef(send);
  sendRef.current = send;
  const sendJoinRef = useRef<(options?: { password?: string; token?: string }) => void>(() => {});

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
  const [hostPreview, setHostPreview] = useState<HostPreview | null>(null);

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
    if (!allPlayersAnswered) return false;
    const roundCount = room.roundCount;
    if (roundCount != null && roundCount > 0) {
      return (room.currentRoundIndex ?? 0) < roundCount - 1;
    }
    const songs = room.songs || [];
    if (songs.length === 0) return false;
    return (room.currentSongIndex ?? 0) < songs.length - 1;
  }, [room.songs, room.currentSongIndex, room.currentRoundIndex, room.roundCount, allPlayersAnswered]);

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
    (options?: { password?: string; token?: string; _attempt?: number }) => {
      if (!socketRef.current || !playerId || !displayName) {
        console.warn("[usePartyKitRoom] ⚠️ sendJoin called but conditions not met", {
          hasSocket: !!socketRef.current,
          hasPlayerId: !!playerId,
          hasDisplayName: !!displayName,
          timestamp: Date.now(),
        });
        return;
      }

      const attempt = options?._attempt ?? 1;
      const maxAttempts = 10; // Max 10 tentatives (500ms total)

      // FIX: Wait for PartySocket wrapper readyState to sync with internal socket
      // The Provider callback fires when internal socket is OPEN, but wrapper.readyState may still be 0
      if (socketRef.current.readyState !== WebSocket.OPEN) {
        if (attempt >= maxAttempts) {
          console.error("[usePartyKitRoom] ❌ Failed to send join after", maxAttempts, "attempts", {
            readyState: socketRef.current.readyState,
            playerId,
            displayName,
          });
          return;
        }

        console.warn(`[usePartyKitRoom] ⚠️ Socket not OPEN (readyState: ${socketRef.current.readyState}), retry ${attempt}/${maxAttempts} in 50ms`);

        setTimeout(() => {
          if (socketRef.current && playerId && displayName) {
            sendJoin({ ...options, _attempt: attempt + 1 });
          }
        }, 50);
        return;
      }

      // Socket is OPEN, send the join message
      const storedToken = options?.token ?? getSessionToken();
      const payload = {
        type: "join",
        playerId,
        displayName,
        ...(options?.password ? { password: options.password } : {}),
        ...(storedToken ? { token: storedToken } : {}),
      };

      setAuthError(null);
      socketRef.current.send(JSON.stringify(payload));
    },
    [displayName, getSessionToken, playerId]
  );
  sendJoinRef.current = sendJoin;

  // ============================================================================
  // MESSAGE HANDLER
  // ============================================================================

  const handleMessage = useCallback(
    (message: IncomingMessage) => {
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
          if (message.roomId && typeof window !== "undefined") {
            // Stocker les scores finaux avant navigation : la page scores monte une nouvelle
            // machine et ne reçoit pas game_ended/show_scores, donc elle lit ce stockage.
            if (message.finalScores && Array.isArray(message.finalScores)) {
              try {
                sessionStorage.setItem(
                  `blindtest_scores_${message.roomId}`,
                  JSON.stringify(message.finalScores)
                );
              } catch (e) {
                console.warn("[usePartyKitRoom] Could not store finalScores for scores page", e);
              }
            }
            const url = `/scores/${message.roomId}`;
            if (navigateClient) {
              navigateClient(url);
            } else {
              navigateToUrl(url);
            }
          }
          return;
        }

        case "redirect_to_waiting_room": {
          // [HOST-DEBUG] Tracer qui reçoit la redirection et avec quel isHost (avant navigation)
          if (process.env.NODE_ENV === "development") {
            console.info("[HOST-DEBUG] redirect_to_waiting_room reçu", {
              roomId: message.roomId,
              playerId,
              isHost,
            });
          }
          // Marquer qu'on est en train de rediriger pour ignorer les state_sync suivants
          isRedirectingToWaitingRef.current = true;

          // Rediriger vers la waiting room avec les infos du joueur depuis le serveur
          if (message.roomId && typeof window !== "undefined" && playerId) {
            // Trouver le displayName du joueur depuis la liste envoyée par le serveur
            const playerInfo = message.players?.find((p) => p.id === playerId);
            const playerDisplayName = playerInfo?.displayName || displayName || `Joueur-${playerId.slice(0, 4)}`;

            // Construire l'URL avec les paramètres nécessaires
            const params = new URLSearchParams({
              name: playerDisplayName,
              player: playerId,
            });

            // Si c'est l'hôte, ajouter le flag host=1
            if (isHost) {
              params.set("host", "1");
            }

            const url = `/room/${message.roomId}?${params.toString()}`;
            if (navigateClient) {
              onRedirect?.();
              navigateClient(url);
            } else {
              if (process.env.NODE_ENV === "development") {
                console.warn("[HOST-DEBUG] redirect_to_waiting_room: pas de navigate, fallback full reload (window.location) → ferme la WebSocket");
              }
              navigateToUrl(url, onRedirect);
            }
          }
          return;
        }

        case "host_preview_start": {
          setHostPreview((prev) => ({
            ...prev,
            universeId: message.universeId,
            universeName: message.universeName ?? message.universeId,
          }));
          return;
        }
        case "host_preview_options": {
          setHostPreview((prev) => ({
            universeId: prev?.universeId ?? "",
            universeName: prev?.universeName,
            noSeek: message.noSeek,
            mysteryEffects: message.mysteryEffects,
            allowedWorks: message.allowedWorks,
            allowedWorkNames: message.allowedWorkNames,
            allWorksSelected: message.allWorksSelected,
            maxSongs: message.maxSongs,
            totalSongs: message.totalSongs,
          }));
          return;
        }
        case "host_preview_clear": {
          setHostPreview(null);
          return;
        }
        case "unknown":
          console.warn(
            "[usePartyKitRoom] Unknown message type:",
            (message as { type: string }).type
          );
          return;

        default:
          // Ignorer state_sync si on est en train de rediriger vers waiting room
          // (pour éviter que l'ancien état ne déclenche un redirect vers /game)
          if (message.type === "state_sync" && isRedirectingToWaitingRef.current) {
            console.log("[usePartyKitRoom] ⚠️ Ignoring state_sync during redirect to waiting room");
            return;
          }
          send(message as RoomMachineEvent);
      }
    },
    [
      currentSongId,
      displayName,
      navigateClient,
      playerId,
      room.hostId,
      room.state,
      roomId,
      send,
      storeSessionToken,
      clearSessionToken,
      isHost,
      onRedirect,
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
    socketOpenSentRef.current = false;

    // Callback appelé par le Provider quand la socket s'ouvre (fix: listener "open" du hook pas appelé, readyState pas mis à jour sur PartySocket)
    const onOpenFromProvider = (openedSocket: PartySocket) => {
      if (socketOpenSentRef.current) return;
      socketOpenSentRef.current = true;

      // FIX: The useEffect attached listeners on `socket`, but we need them on `openedSocket`
      // If socket !== openedSocket, messages will be sent/received on different instances
      // Solution: Always use openedSocket for everything
      socketRef.current = openedSocket;

      send({ type: "socket_open" });
      setIsAuthenticated(false);
      setAuthRequired(false);
      setAuthError(null);

      // Send join message
      if (!playerId || !displayName) return;

      const storedToken = getSessionToken();
      const payload = {
        type: "join",
        playerId,
        displayName,
        ...(initialPasswordRef.current ? { password: initialPasswordRef.current } : {}),
        ...(storedToken ? { token: storedToken } : {}),
      };

      openedSocket.send(JSON.stringify(payload));

      // FIX: Manually handle join_success since listeners may be on a different socket instance
      // Listen for the first "message" event on openedSocket to get join_success
      const tempMessageHandler = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data) as IncomingMessage;
          handleMessageRef.current?.(message);
        } catch (error) {
          console.error("[usePartyKitRoom] Invalid message:", error);
        }
      };

      openedSocket.addEventListener("message", tempMessageHandler);

      // Cleanup: remove temp handler when component unmounts (will be handled by useEffect cleanup)
    };

    const partyHost =
      process.env.NEXT_PUBLIC_PARTYKIT_HOST || "127.0.0.1:1999";
    const managedSocket = partyKitProvider?.getSocket(
      roomId,
      playerId,
      displayName,
      onOpenFromProvider
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
      if (process.env.NODE_ENV === "development") {
        console.info("[HOST-DEBUG] handleOpen", { roomId, playerId, readyState: socket.readyState });
      }
      // WORKAROUND: si le polling readyState a déjà envoyé socket_open, ne pas double-envoyer
      if (socketOpenSentRef.current) return;
      // Éviter le double appel UNIQUEMENT si on a déjà des songs dans le state
      // (car la socket peut être réutilisée entre la waiting room et la page de jeu)
      const hasSongs = (room.songs?.length ?? 0) > 0;
      // Type assertion pour ajouter une propriété custom à la socket
      const socketWithFlag = socket as PartySocket & { __handleOpenCalled?: boolean };
      if (socketWithFlag.__handleOpenCalled && hasSongs) return;
      socketWithFlag.__handleOpenCalled = true;
      socketOpenSentRef.current = true;
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
      handleOpen();
    }

    return () => {
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("message", handleMessageEvent);
      socket.removeEventListener("close", handleClose);
      socket.removeEventListener("error", handleError);

      // ✅ OPTION A FIX (docs/AUDIT-CONNEXION-ROOM-GAME.md):
      // Ne plus fermer la socket ici pour qu'elle survive à la navigation room → game.
      // La socket sera fermée uniquement dans leaveRoom() (clic "Quitter") ou par le Provider au démontage total.
      // Cela évite le bug de transfert d'hôte (serveur pense que l'hôte a quitté lors de la navigation).

      // AVANT (bug de transfert d'hôte) :
      // if (managedSocket && partyKitProvider?.closeSocket) {
      //   partyKitProvider.closeSocket(roomId);
      // } else if (!managedSocket && socketRef.current === socket) {
      //   socket.close();
      //   socketRef.current = null;
      // }

      // [HOST-DEBUG] Tracer le cleanup du hook (socket NE doit pas être fermée ici pour "Retour à l'accueil")
      if (process.env.NODE_ENV === "development") {
        console.info("[HOST-DEBUG] usePartyKitRoom cleanup", {
          roomId,
          playerId,
          readyState: socket.readyState,
          managedSocket: Boolean(managedSocket),
        });
      }
      // Conserver uniquement le cleanup local (refs + machine d'état)
      connectionKeyRef.current = null;
      send({ type: "socket_close" });
    };
    // getSessionToken utilisé dans onOpenFromProvider. room.songs volontairement omis (évite re-run à chaque state_sync).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, playerId, displayName, partyKitProvider, send, sendJoin, getSessionToken]);

  // WORKAROUND: listener 'open' not always triggered after room→game nav; see docs/AUDIT §11 + v2 root cause.
  // Poll readyState until OPEN; when OPEN and machine not connected, send socket_open once (fallback to event handler).
  // Refs for send/sendJoin to avoid effect re-run (and clearing interval) when those identities change.
  useEffect(() => {
    if (!roomId || !playerId || isConnected) return;
    const id = setInterval(() => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      if (socketOpenSentRef.current) return;
      socketOpenSentRef.current = true;
      sendRef.current({ type: "socket_open" });
      setIsAuthenticated(false);
      setAuthRequired(false);
      setAuthError(null);
      sendJoinRef.current({ password: initialPasswordRef.current });
    }, 100);
    return () => clearInterval(id);
  }, [roomId, playerId, isConnected]);

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

  const sendPlayerReady = useCallback(() => {
    if (!socketRef.current || !playerId) return;
    socketRef.current.send(
      JSON.stringify({
        type: "player_ready",
        playerId,
      })
    );
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

  const resetToWaiting = useCallback(async () => {
    if (!socketRef.current || !playerId) {
      return { success: false, error: "Not connected" };
    }
    if (!isHost) {
      return { success: false, error: "Only the host can reset the room to waiting" };
    }
    socketRef.current.send(
      JSON.stringify({
        type: "reset_to_waiting",
        hostId: playerId,
      })
    );
    return { success: true };
  }, [playerId, isHost]);

  const sendHostPreviewStart = useCallback(
    (universeId: string, universeName?: string) => {
      if (!socketRef.current) return;
      socketRef.current.send(
        JSON.stringify({ type: "host_preview_start", universeId, universeName })
      );
    },
    []
  );

  const sendHostPreviewOptions = useCallback(
    (payload: {
      noSeek?: boolean;
      mysteryEffects?: { enabled: boolean; frequency: number; effects: ("double" | "reverse")[] };
      allowedWorks?: string[];
      allowedWorkNames?: string[];
      allWorksSelected?: boolean;
      maxSongs?: number | null;
      totalSongs?: number;
    }) => {
      if (!socketRef.current) return;
      socketRef.current.send(JSON.stringify({ type: "host_preview_options", ...payload }));
    },
    []
  );

  const sendHostPreviewClear = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.send(JSON.stringify({ type: "host_preview_clear" }));
  }, []);

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

  /** Fermer la socket et quitter la room (le caller doit naviguer vers / après) */
  const leaveRoom = useCallback(() => {
    if (roomId && partyKitProvider?.closeSocket) {
      partyKitProvider.closeSocket(roomId);
    }
    send({ type: "socket_close" });
  }, [roomId, partyKitProvider, send]);

  // Reset des réponses locales quand on change de morceau
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
    sendPlayerReady,
    goNextSong,
    showScores,
    resetToWaiting,
    submitAnswer,
    configureRoom,
    leaveRoom,
    startAt,

    isConnected,
    isHost,
    authRequired,
    authError,
    isAuthenticated,
    submitPassword,

    hostPreview,
    sendHostPreviewStart,
    sendHostPreviewOptions,
    sendHostPreviewClear,
  };
};
