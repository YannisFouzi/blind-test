import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PartySocket from "partysocket";
import { Room, RoomPlayer, RoomResponse, Song } from "@/types";

/**
 * Hook pour se connecter à une room PartyKit
 *
 * Remplace l'ancien useRoom.ts (Firestore) par une connexion WebSocket temps réel
 * API compatible pour faciliter la migration
 *
 * @example
 * const { room, players, startGame, submitAnswer } = usePartyKitRoom({
 *   roomId: "room-123",
 *   playerId: "player-456",
 *   displayName: "Alice"
 * });
 */

type UsePartyKitRoomOptions = {
  roomId?: string;
  playerId?: string;
  displayName?: string;
};

export const usePartyKitRoom = ({ roomId, playerId, displayName }: UsePartyKitRoomOptions) => {
  // ============================================================================
  // STATE LOCAL
  // ============================================================================

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
  const pendingAnswerCallbackRef = useRef<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
  } | null>(null);

  // ============================================================================
  // COMPUTED VALUES (compatibilité avec ancien hook)
  // ============================================================================

  const currentSong = useMemo<Song | null>(() => {
    if (!room.songs || room.songs.length === 0) return null;
    return room.songs[room.currentSongIndex ?? 0] ?? null;
  }, [room.songs, room.currentSongIndex]);

  const currentSongId = currentSong?.id;

  // canGoNext : basé sur allPlayersAnswered envoyé par le serveur
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
  // WEBSOCKET CONNECTION
  // ============================================================================

  useEffect(() => {
    if (!roomId || !playerId || !displayName) {
      console.warn("[usePartyKitRoom] Missing required params:", { roomId, playerId, displayName });
      return;
    }

    const partyHost = process.env.NEXT_PUBLIC_PARTYKIT_HOST || "127.0.0.1:1999";
    console.log(`[usePartyKitRoom] Connecting to ${partyHost}/parties/main/${roomId}`);

    const socket = new PartySocket({
      host: partyHost,
      room: roomId,
      party: "main",
    });

    socket.addEventListener("open", () => {
      console.log(`[usePartyKitRoom] Connected to room ${roomId}`);
      setIsConnected(true);

      // Envoyer immédiatement le message JOIN
      const joinMessage = {
        type: "join",
        playerId,
        displayName,
      };

      console.log("[usePartyKitRoom] Sending JOIN:", joinMessage);
      socket.send(JSON.stringify(joinMessage));
    });

    socket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.error("[usePartyKitRoom] Invalid message:", error);
      }
    });

    socket.addEventListener("close", () => {
      console.log(`[usePartyKitRoom] Disconnected from room ${roomId}`);
      setIsConnected(false);
    });

    socket.addEventListener("error", (error) => {
      console.error("[usePartyKitRoom] WebSocket error:", error);
      setIsConnected(false);
    });

    socketRef.current = socket;

    // Cleanup au unmount
    return () => {
      console.log("[usePartyKitRoom] Cleaning up connection");
      socket.close();
      socketRef.current = null;
    };
  }, [roomId, playerId, displayName]);

  // ============================================================================
  // MESSAGE HANDLER
  // ============================================================================

  const handleMessage = useCallback((message: any) => {
    console.log("[usePartyKitRoom] Message received:", message.type, message);

    switch (message.type) {
      case "state_sync":
        // État complet au connect
        if (message.state) {
          setRoom((prev) => ({
            ...prev,
            id: message.state.roomId,
            hostId: message.state.hostId,
            universeId: message.state.universeId,
            songs: message.state.songs || [],
            currentSongIndex: message.state.currentSongIndex ?? 0,
            state: message.state.state || "idle",
            allowedWorks: message.state.allowedWorks,
            options: message.state.options,
          }));

          setPlayers(message.state.players || []);
        }
        break;

      case "join_success":
        // Confirmation de join
        setIsHost(message.isHost ?? false);
        console.log(`[usePartyKitRoom] Join success, isHost: ${message.isHost}`);
        break;

      case "players_update":
        // Mise à jour de la liste des joueurs
        setPlayers(message.players || []);
        break;

      case "room_configured":
        // Room configurée : mettre à jour les songs et la config
        console.log(`[usePartyKitRoom] Room configured: ${message.songsCount} songs`);
        setRoom((prev) => ({
          ...prev,
          universeId: message.universeId || prev.universeId,
          songs: message.songs || prev.songs || [],
          allowedWorks: message.allowedWorks,
          options: message.options,
        }));
        break;

      case "game_started":
        // Démarrage du jeu : reset allPlayersAnswered
        setRoom((prev) => ({
          ...prev,
          state: "playing",
          currentSongIndex: message.currentSongIndex ?? 0,
          songs: message.songs || prev.songs, // Utiliser les songs du message si fournis
        }));
        setAllPlayersAnswered(false);
        break;

      case "song_changed":
        // Changement de morceau : reset allPlayersAnswered
        setRoom((prev) => ({
          ...prev,
          currentSongIndex: message.currentSongIndex ?? prev.currentSongIndex,
        }));
        setAllPlayersAnswered(false);
        break;

      case "game_ended":
        // Fin de partie
        setRoom((prev) => ({
          ...prev,
          state: "results",
        }));

        if (message.players) {
          setPlayers(message.players);
        }
        break;

      case "answer_recorded":
        // Réponse enregistrée
        // Créer une RoomResponse pour l'ajouter au state local
        if (currentSongId && playerId) {
          const newResponse: RoomResponse = {
            id: `${currentSongId}-${playerId}`,
            roomId: roomId ?? "",
            songId: currentSongId,
            playerId: playerId,
            selectedWorkId: null, // On ne stocke pas ça côté client
            isCorrect: message.isCorrect,
            answeredAt: new Date(),
            rank: message.rank,
            points: message.points,
          };

          setResponses((prev) => {
            // Éviter les doublons
            const exists = prev.some((r) => r.songId === currentSongId && r.playerId === playerId);
            if (exists) return prev;
            return [...prev, newResponse];
          });
        }

        // Résoudre la Promise de submitAnswer
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
        // Tous les joueurs ont répondu : activer le bouton "Next"
        console.log("[usePartyKitRoom] All players answered");
        setAllPlayersAnswered(true);
        break;

      case "host_changed":
        // Nouveau host
        if (message.newHostId === playerId) {
          setIsHost(true);
          console.log("[usePartyKitRoom] You are now the host");
        }

        if (message.players) {
          setPlayers(message.players);
        }
        break;

      case "error":
        // Erreur serveur
        console.error("[usePartyKitRoom] Server error:", message.message);

        // Si c'est une erreur de submitAnswer, rejeter la Promise
        if (pendingAnswerCallbackRef.current) {
          pendingAnswerCallbackRef.current.reject(new Error(message.message));
          pendingAnswerCallbackRef.current = null;
        }
        break;

      default:
        console.warn("[usePartyKitRoom] Unknown message type:", message.type);
    }
  }, [currentSongId, playerId, roomId]);

  // ============================================================================
  // ACTIONS (API compatible avec ancien hook)
  // ============================================================================

  const startGame = useCallback(async () => {
    if (!socketRef.current || !playerId) {
      return { success: false, error: "Not connected" };
    }

    const message = {
      type: "start",
      hostId: playerId,
    };

    console.log("[usePartyKitRoom] Sending START:", message);
    socketRef.current.send(JSON.stringify(message));

    // Le serveur va broadcaster game_started
    return { success: true };
  }, [playerId]);

  const goNextSong = useCallback(async () => {
    if (!socketRef.current || !playerId) {
      return { success: false, error: "Not connected" };
    }

    const message = {
      type: "next",
      hostId: playerId,
    };

    console.log("[usePartyKitRoom] Sending NEXT:", message);
    socketRef.current.send(JSON.stringify(message));

    // Le serveur va broadcaster song_changed ou game_ended
    return { success: true };
  }, [playerId]);

  const configureRoom = useCallback(
    async (universeId: string, songs: Song[], allowedWorks?: string[], options?: { noSeek: boolean }) => {
      if (!socketRef.current) {
        return { success: false, error: "Not connected" };
      }

      const message = {
        type: "configure",
        universeId,
        songs,
        allowedWorks: allowedWorks || [],
        options: options || { noSeek: false },
      };

      console.log("[usePartyKitRoom] Sending CONFIGURE:", message);
      socketRef.current.send(JSON.stringify(message));

      // Le serveur va broadcaster room_configured
      return { success: true };
    },
    []
  );

  const submitAnswer = useCallback(
    async (selectedWorkId: string | null, isCorrect: boolean) => {
      if (!socketRef.current || !playerId || !currentSong) {
        return { success: false, error: "Not ready" };
      }

      const message = {
        type: "answer",
        playerId,
        songId: currentSong.id,
        workId: selectedWorkId,
      };

      console.log("[usePartyKitRoom] Sending ANSWER:", message);

      // Créer une Promise qui sera résolue quand on reçoit answer_recorded
      return new Promise<{ success: boolean; data?: any; error?: string }>((resolve, reject) => {
        pendingAnswerCallbackRef.current = { resolve, reject };

        socketRef.current!.send(JSON.stringify(message));

        // Timeout après 5s
        setTimeout(() => {
          if (pendingAnswerCallbackRef.current) {
            pendingAnswerCallbackRef.current.reject(new Error("Timeout"));
            pendingAnswerCallbackRef.current = null;
          }
        }, 5000);
      });
    },
    [playerId, currentSong]
  );

  // ============================================================================
  // LOGS (debug, compatible avec ancien hook)
  // ============================================================================

  useEffect(() => {
    console.info("[usePartyKitRoom] players update", {
      roomId,
      playerId,
      count: players.length,
      ids: players.map((p) => p.id),
    });
  }, [players, roomId, playerId]);

  // Reset responses quand on change de morceau
  useEffect(() => {
    if (currentSongId) {
      // Vider les réponses locales pour le nouveau morceau
      setResponses([]);
    }
  }, [currentSongId]);

  // ============================================================================
  // RETURN (API identique à l'ancien hook)
  // ============================================================================

  return {
    // State
    room: room as Room, // Cast pour compatibilité
    players,
    responses,
    currentSong,
    currentSongIndex: room.currentSongIndex ?? 0,
    state: room.state ?? "idle",

    // Computed
    allPlayersAnswered,
    canGoNext,
    playerScore,

    // Options
    options: room.options,
    allowedWorks: room.allowedWorks,

    // Actions
    startGame,
    goNextSong,
    submitAnswer,
    configureRoom,

    // Extra (nouveau)
    isConnected,
    isHost,
  };
};
