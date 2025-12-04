import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Room, RoomPlayer, RoomResponse, Song } from "@/types";
import {
  heartbeatPlayer,
  leaveRoom,
  nextSong as serviceNextSong,
  startGame as serviceStartGame,
  submitAnswer as serviceSubmitAnswer,
  subscribePlayers,
  subscribeResponsesForSong,
  subscribeRoom,
} from "@/services/firebase/rooms";

type UseRoomOptions = {
  roomId?: string;
  playerId?: string;
};

export const useRoom = ({ roomId, playerId }: UseRoomOptions) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [responses, setResponses] = useState<RoomResponse[]>([]);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatImmediateRef = useRef(false);

  const currentSong = useMemo<Song | null>(() => {
    if (!room) return null;
    return room.songs[room.currentSongIndex] ?? null;
  }, [room]);

  const currentSongId = currentSong?.id;
  const allPlayersAnswered = useMemo(() => {
    const activePlayers = players.filter((p) => p.connected !== false);
    if (!currentSongId || activePlayers.length === 0) return false;
    const answeredPlayers = responses.reduce((set, r) => {
      if (r.songId === currentSongId) {
        set.add(r.playerId);
      }
      return set;
    }, new Set<string>());
    return answeredPlayers.size >= activePlayers.length;
  }, [currentSongId, players, responses]);

  useEffect(() => {
    if (!roomId) return;

    const unsubRoom = subscribeRoom(roomId, setRoom);
    const unsubPlayers = subscribePlayers(roomId, setPlayers);

    return () => {
      unsubRoom?.();
      unsubPlayers?.();
    };
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !currentSongId) {
      setResponses([]);
      return;
    }
    const unsub = subscribeResponsesForSong(roomId, currentSongId, setResponses);
    return () => unsub?.();
  }, [roomId, currentSongId]);

  useEffect(() => {
    if (!roomId || !playerId) return;
    // heartbeat pour garder le joueur marqué comme connecté
    if (!heartbeatImmediateRef.current) {
      heartbeatImmediateRef.current = true;
      void heartbeatPlayer(roomId, playerId);
    }
    heartbeatRef.current = setInterval(() => {
      void heartbeatPlayer(roomId, playerId);
    }, 15000);
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [roomId, playerId]);

  useEffect(() => {
    if (!roomId || !playerId) return;
    const handleUnload = () => {
      void leaveRoom(roomId, playerId);
      void fetch("/api/cleanup-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      }).catch(() => {});
    };
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
      void fetch("/api/cleanup-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      }).catch(() => {});
    };
  }, [roomId, playerId]);

  useEffect(() => {
    console.info("[useRoom] players update", {
      roomId,
      playerId,
      count: players.length,
      ids: players.map((p) => p.id),
    });
  }, [players, roomId, playerId]);

  useEffect(() => {
    if (!currentSongId) return;
    console.info("[useRoom] allPlayersAnswered recompute", {
      roomId,
      playerId,
      currentSongId,
      playersCount: players.length,
      responsesCount: responses.length,
      allPlayersAnswered,
    });
  }, [allPlayersAnswered, roomId, playerId, currentSongId, players.length, responses.length]);

  const startGame = useCallback(async () => {
    if (!roomId) return { success: false, error: "Room inconnue" };
    return serviceStartGame(roomId);
  }, [roomId]);

  const goNextSong = useCallback(async () => {
    if (!roomId) return { success: false, error: "Room inconnue" };
    return serviceNextSong(roomId);
  }, [roomId]);

  const submitAnswer = useCallback(
    async (selectedWorkId: string | null, isCorrect: boolean) => {
      if (!roomId || !playerId) return { success: false, error: "Room inconnue" };
      if (!room || !currentSong) return { success: false, error: "Morceau indisponible" };
      return serviceSubmitAnswer({
        roomId,
        songId: currentSong.id,
        playerId,
        selectedWorkId,
        isCorrect,
      });
    },
    [room, currentSong, roomId, playerId]
  );

  const canGoNext = useMemo(() => {
    if (!room) return false;
    if (!allPlayersAnswered) return false;
    return room.currentSongIndex < room.songs.length - 1;
  }, [room, allPlayersAnswered]);

  const currentSongResponses = useMemo(() => responses, [responses]);

  const playerScore = useMemo(() => {
    const me = players.find((p) => p.id === playerId && p.connected !== false);
    return {
      correct: me?.score ?? 0,
      incorrect: me?.incorrect ?? 0,
    };
  }, [players, playerId]);

  return {
    room,
    players,
    responses: currentSongResponses,
    currentSong,
    currentSongIndex: room?.currentSongIndex ?? 0,
    state: room?.state ?? "idle",
    canGoNext,
    startGame,
    goNextSong,
    submitAnswer,
    playerScore,
    options: room?.options,
    allowedWorks: room?.allowedWorks,
    allPlayersAnswered,
  };
};
