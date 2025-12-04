import { useEffect, useMemo, useState } from "react";
import { GameAnswer, Song } from "@/types";
import { usePartyKitRoom } from "@/hooks/usePartyKitRoom";
import { useWorksQuery } from "@/hooks/queries";

type MultiplayerOptions = {
  universeId: string;
  roomId?: string;
  playerId?: string;
  displayName?: string;
  preloadNextTrack?: (song: Song) => void;
};

export const useMultiplayerGame = ({
  universeId,
  roomId,
  playerId,
  displayName,
  preloadNextTrack,
}: MultiplayerOptions) => {
  const {
    room,
    players,
    responses,
    currentSong,
    currentSongIndex,
    state,
    canGoNext,
    goNextSong,
    submitAnswer,
    startGame,
    options,
    allowedWorks,
    configureRoom,
    isConnected,
    isHost: isHostFromRoom,
  } = usePartyKitRoom({ roomId, playerId, displayName });

  // ✅ Phase 5: Utiliser TanStack Query pour le cache automatique
  const { data: works = [], isLoading: isLoadingWorks } = useWorksQuery(universeId);

  const [selectedWork, setSelectedWork] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [gameAnswer, setGameAnswer] = useState<GameAnswer | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastGain, setLastGain] = useState<{ points: number; key: number } | null>(null);

  const currentSongAnswer = useMemo(() => {
    if (!currentSong || !playerId) return null;
    return responses.find((r) => r.playerId === playerId && r.songId === currentSong.id) ?? null;
  }, [responses, playerId, currentSong]);

  const isCurrentSongAnswered = Boolean(currentSongAnswer);

  // Filtrer les oeuvres si une liste autorisée est définie
  const filteredWorks = useMemo(() => {
    if (allowedWorks && allowedWorks.length) {
      return works.filter((w) => allowedWorks.includes(w.id));
    }
    return works;
  }, [works, allowedWorks]);

  useEffect(() => {
    // reset selection/answer on song change
    setSelectedWork(null);
    setGameAnswer(null);
    setShowAnswer(false);
    setLastGain(null);
  }, [currentSong?.id]);

  useEffect(() => {
    // si l'oeuvre sélectionnée n'est plus autorisée, on reset
    if (selectedWork && allowedWorks && allowedWorks.length && !allowedWorks.includes(selectedWork)) {
      setSelectedWork(null);
    }
  }, [allowedWorks, selectedWork]);

  useEffect(() => {
    if (currentSong && preloadNextTrack && room && room.songs[currentSongIndex + 1]) {
      const nextSong = room.songs[currentSongIndex + 1];
      setTimeout(() => preloadNextTrack(nextSong), 1000);
    }
  }, [currentSong, preloadNextTrack, room, currentSongIndex]);

  const handleWorkSelection = (workId: string) => {
    if (showAnswer || isCurrentSongAnswered) return;
    setSelectedWork(workId);
  };

  const handleValidateAnswer = async () => {
    if (!currentSong || !selectedWork) return;
    const isCorrect = selectedWork === currentSong.workId;
    try {
      console.log("[multi] submit answer", {
        roomId,
        songId: currentSong.id,
        playerId,
        selectedWork,
        isCorrect,
      });
      const result = await submitAnswer(selectedWork, isCorrect);
      if (result.success) {
        const pointsEarned = result.data?.points ?? 0;
        const timestamp = typeof performance !== "undefined" ? performance.now() : Date.now();
        setLastGain({ points: pointsEarned, key: timestamp });
        setSubmitError(null);
        setGameAnswer({
          songId: currentSong.id,
          workId: currentSong.workId,
          selectedWorkId: selectedWork,
          isCorrect,
          answeredAt: new Date(),
        });
        setShowAnswer(true);
      } else {
        console.error("[multi] submit answer error", result.error);
        setSubmitError(result.error || "Impossible d'enregistrer la réponse");
      }
    } catch (error) {
      console.error("[multi] submit answer exception", error);
      setSubmitError(error instanceof Error ? error.message : "Erreur inconnue lors de la validation");
    }
  };

  const handleNextSong = async () => {
    if (!canGoNext) return;
    await goNextSong();
  };

  const isHost = useMemo(() => {
    // Utiliser la valeur directe de usePartyKitRoom (plus fiable)
    return isHostFromRoom;
  }, [isHostFromRoom]);

  return {
    mode: "multiplayer" as const,
    room,
    players,
    works: filteredWorks,
    isLoadingWorks, // ✅ Phase 5: Exposer le loading state
    currentSong,
    currentSongIndex,
    selectedWork,
    showAnswer,
    options,
    allowedWorks,
    gameAnswer,
    handleWorkSelection,
    handleValidateAnswer,
    handleNextSong,
    startGame,
    canGoNext,
    canGoPrev: currentSongIndex > 0,
    isCurrentSongAnswered,
    currentSongAnswer,
    state,
    isHost,
    submitError,
    lastGain,
    isConnected,
    configureRoom,
  };
};
