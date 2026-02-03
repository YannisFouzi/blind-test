"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GameAnswer, Song } from "@/types";
import { usePartyKitRoom } from "@/features/multiplayer-game/hooks/usePartyKitRoom";
import { useWorksByIdsQuery, useWorksQuery } from "@/features/game-ui/queries";
import { CUSTOM_UNIVERSE_ID, RANDOM_UNIVERSE_ID } from "@/constants/gameModes";
import { shuffleWithSeed } from "@/utils/formatters";
import type { GameRound } from "@/utils/mysteryEffects";

const GAME_NOT_STARTED_MESSAGE = "La partie n'a pas demarre";
const SELECT_TWO_WORKS_MESSAGE = "Veuillez selectionner deux oeuvres";
const PRELOAD_DELAY_MS = 1000;

export interface UseMultiplayerGameOptions {
  universeId: string;
  roomId?: string;
  playerId?: string;
  displayName?: string;
  preloadNextTrack?: (song: Song) => void;
  onRedirect?: () => void;
  navigate?: (url: string) => void;
}

export const useMultiplayerGame = ({
  universeId,
  roomId,
  playerId,
  displayName,
  preloadNextTrack,
  onRedirect,
  navigate,
}: UseMultiplayerGameOptions) => {
  const {
    room,
    players,
    responses,
    currentSong,
    currentSongIndex,
    state,
    canGoNext,
    goNextSong,
    showScores,
    resetToWaiting,
    submitAnswer,
    startGame,
    sendPlayerReady,
    startAt,
    options,
    allowedWorks,
    worksPerRound,
    configureRoom,
    leaveRoom,
    isConnected,
    isHost: isHostFromRoom,
    authRequired,
    authError,
    submitPassword,
    allPlayersAnswered,
  } = usePartyKitRoom({ roomId, playerId, displayName, onRedirect, navigate });

  const isCustomOrRandomMode =
    universeId === CUSTOM_UNIVERSE_ID || universeId === RANDOM_UNIVERSE_ID;

  const universeQueryId = isCustomOrRandomMode ? "" : universeId;
  const { data: worksByUniverse = [], isLoading: isLoadingByUniverse } =
    useWorksQuery(universeQueryId);

  const workIdsForQuery = isCustomOrRandomMode && allowedWorks?.length ? allowedWorks : [];
  const { data: worksByIds = [], isLoading: isLoadingByIds } =
    useWorksByIdsQuery(workIdsForQuery);

  const works = isCustomOrRandomMode ? worksByIds : worksByUniverse;
  const isLoadingWorks = isCustomOrRandomMode ? isLoadingByIds : isLoadingByUniverse;

  const [selectedWork, setSelectedWork] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [gameAnswer, setGameAnswer] = useState<GameAnswer | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastGain, setLastGain] = useState<{ points: number; key: number } | null>(null);
  const [doubleSelections, setDoubleSelections] = useState<Record<string, string | null>>({});

  const currentSongAnswer = useMemo(() => {
    if (!currentSong || !playerId) return null;
    return (
      responses.find(
        (response) => response.playerId === playerId && response.songId === currentSong.id
      ) ?? null
    );
  }, [responses, playerId, currentSong]);

  const isCurrentSongAnswered = Boolean(currentSongAnswer);

  const filteredWorks = useMemo(() => {
    if (allowedWorks && allowedWorks.length > 0) {
      return works.filter((work) => allowedWorks.includes(work.id));
    }
    return works;
  }, [works, allowedWorks]);

  const isHost = isHostFromRoom;
  const canGoPrev = false;

  const currentRound: GameRound | undefined = room?.currentRound;
  const isReverseMode = currentRound?.type === "reverse";
  const isDoubleMode = currentRound?.type === "double";

  const currentRoundSongs = useMemo<Song[]>(() => {
    if (!room?.songs || !currentRound) {
      return currentSong ? [currentSong] : [];
    }

    const songsForRound = currentRound.songIds
      .map((id) => room.songs.find((song) => song.id === id))
      .filter((song): song is Song => Boolean(song));

    if (!songsForRound.length && currentSong) {
      return [currentSong];
    }

    return songsForRound;
  }, [room?.songs, currentRound, currentSong]);

  const displayWorks = useMemo(() => {
    const isRandom = universeId === RANDOM_UNIVERSE_ID;
    const roundWorkCount = worksPerRound ?? 0;

    if (!isRandom || roundWorkCount <= 0 || filteredWorks.length === 0) {
      return filteredWorks;
    }

    const songs =
      isDoubleMode && currentRoundSongs.length >= 2
        ? currentRoundSongs
        : currentSong
          ? [currentSong]
          : [];

    if (songs.length === 0) {
      return filteredWorks;
    }

    const correctIds = [...new Set(songs.map((song) => song.workId))];
    const wrongWorks = filteredWorks.filter((work) => !correctIds.includes(work.id));
    const correctWorks = correctIds
      .map((id) => filteredWorks.find((work) => work.id === id))
      .filter((work): work is NonNullable<typeof work> => Boolean(work));

    const count = Math.max(
      0,
      Math.min(roundWorkCount - correctWorks.length, wrongWorks.length)
    );
    const seed = `${currentSongIndex}-${songs.map((song) => song.id).join("-")}`;
    const shuffledWrong = shuffleWithSeed([...wrongWorks], seed);
    const selectedWrong = shuffledWrong.slice(0, count);
    const pool = [...correctWorks, ...selectedWrong];
    return shuffleWithSeed(pool, `${seed}-final`);
  }, [
    universeId,
    worksPerRound,
    filteredWorks,
    isDoubleMode,
    currentRoundSongs,
    currentSong,
    currentSongIndex,
  ]);

  useEffect(() => {
    setSelectedWork(null);
    setGameAnswer(null);
    setShowAnswer(false);
    setLastGain(null);
    setDoubleSelections({});
  }, [currentSong?.id]);

  useEffect(() => {
    if (!lastGain) return;
    const timeoutId = setTimeout(() => setLastGain(null), 2000);
    return () => clearTimeout(timeoutId);
  }, [lastGain]);

  useEffect(() => {
    if (
      selectedWork &&
      allowedWorks &&
      allowedWorks.length > 0 &&
      !allowedWorks.includes(selectedWork)
    ) {
      setSelectedWork(null);
    }
  }, [allowedWorks, selectedWork]);

  useEffect(() => {
    if (!currentSong || !preloadNextTrack) return;
    const nextSong = room?.songs?.[currentSongIndex + 1];
    if (!nextSong) return;

    const timeoutId = setTimeout(() => preloadNextTrack(nextSong), PRELOAD_DELAY_MS);
    return () => clearTimeout(timeoutId);
  }, [currentSong, preloadNextTrack, room?.songs, currentSongIndex]);

  const handleAnswer = useCallback(
    (workId: string) => {
      if (showAnswer || isCurrentSongAnswered || isDoubleMode) return;
      setSelectedWork(workId);
    },
    [showAnswer, isCurrentSongAnswered, isDoubleMode]
  );

  const validateAnswerDouble = useCallback(async () => {
    if (!isDoubleMode || currentRoundSongs.length < 2) {
      return;
    }

    if (state !== "playing") {
      setSubmitError(GAME_NOT_STARTED_MESSAGE);
      return;
    }

    const songInfos = currentRoundSongs.map((song) => ({
      songId: song.id,
      song,
      selectedId: doubleSelections[song.id] ?? null,
    }));

    if (songInfos.length < 2 || !songInfos.every((info) => info.selectedId)) {
      setSubmitError(SELECT_TWO_WORKS_MESSAGE);
      return;
    }

    try {
      const remainingCorrectWorks = songInfos.map((info) => info.song.workId);
      const answers: Array<{ songId: string; workId: string | null }> = [];

      songInfos.forEach((info) => {
        const selectedId = info.selectedId;
        let matchedWorkId: string | null = null;

        if (selectedId) {
          const matchIndex = remainingCorrectWorks.indexOf(selectedId);
          if (matchIndex !== -1) {
            remainingCorrectWorks.splice(matchIndex, 1);
            matchedWorkId = selectedId;
          } else {
            matchedWorkId = selectedId;
          }
        }

        answers.push({ songId: info.songId, workId: matchedWorkId });
      });

      const result = await submitAnswer(null, false, answers);

      if (result.success) {
        const pointsEarned = result.data?.points ?? 0;
        const timestamp = typeof performance !== "undefined" ? performance.now() : Date.now();

        setLastGain({ points: pointsEarned, key: timestamp });
        setSubmitError(null);
        setShowAnswer(true);
      } else {
        console.error("[useMultiplayerGame] submit double answer error", result.error);
        setSubmitError(result.error || "Impossible d'enregistrer les reponses");
      }
    } catch (error) {
      console.error("[useMultiplayerGame] submit double answer exception", error);
      setSubmitError(
        error instanceof Error ? error.message : "Erreur inconnue lors de la validation"
      );
    }
  }, [isDoubleMode, currentRoundSongs, doubleSelections, state, submitAnswer]);

  const validateAnswer = useCallback(async () => {
    if (isDoubleMode) {
      return validateAnswerDouble();
    }

    if (!currentSong || !selectedWork) return;

    if (state !== "playing") {
      setSubmitError(GAME_NOT_STARTED_MESSAGE);
      return;
    }

    const isCorrect = selectedWork === currentSong.workId;

    try {
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
        console.error("[useMultiplayerGame] submit answer error", result.error);
        setSubmitError(result.error || "Impossible d'enregistrer la reponse");
      }
    } catch (error) {
      console.error("[useMultiplayerGame] submit answer exception", error);
      setSubmitError(
        error instanceof Error ? error.message : "Erreur inconnue lors de la validation"
      );
    }
  }, [isDoubleMode, validateAnswerDouble, currentSong, selectedWork, state, submitAnswer]);

  const nextSong = useCallback(async () => {
    if (!canGoNext) return;
    await goNextSong();
  }, [canGoNext, goNextSong]);

  const handleShowScores = useCallback(async () => {
    if (!isHost) return;
    await showScores();
  }, [isHost, showScores]);

  const handleStartGame = useCallback(async () => {
    if (!isHost) return;
    await startGame();
  }, [isHost, startGame]);

  const handleConfigureRoom = useCallback(
    async (
      songs: Song[],
      universeIdParam: string,
      allowedWorksParam?: string[],
      optionsParam?: { noSeek: boolean },
      mysteryEffectsConfig?: {
        enabled: boolean;
        frequency: number;
        effects: ("double" | "reverse")[];
      }
    ) => {
      if (!isHost) return;
      await configureRoom(
        universeIdParam,
        songs,
        allowedWorksParam,
        optionsParam,
        mysteryEffectsConfig
      );
    },
    [configureRoom, isHost]
  );

  const handleDoubleSelection = useCallback(
    (slotIndex: 0 | 1, workId: string) => {
      if (showAnswer || isCurrentSongAnswered || !isDoubleMode) return;
      if (currentRoundSongs.length < 2) return;

      const songId = currentRoundSongs[slotIndex]?.id;
      if (!songId) return;

      const hasAnswered = responses.some(
        (response) => response.songId === songId && response.playerId === playerId
      );
      if (hasAnswered) return;

      setDoubleSelections((prev) => ({
        ...prev,
        [songId]: workId,
      }));
    },
    [
      showAnswer,
      isCurrentSongAnswered,
      isDoubleMode,
      currentRoundSongs,
      responses,
      playerId,
    ]
  );

  const clearDoubleSelectionForWork = useCallback(
    (workId: string) => {
      if (!isDoubleMode || showAnswer || currentRoundSongs.length === 0) return;

      setDoubleSelections((prev) => {
        const songIds = currentRoundSongs.map((song) => song.id);
        const newSelections = { ...prev };

        const targetSongId = songIds.find((id) => newSelections[id] === workId);
        if (!targetSongId) {
          return prev;
        }

        newSelections[targetSongId] = null;
        return newSelections;
      });
    },
    [currentRoundSongs, isDoubleMode, showAnswer]
  );

  const doubleSelectedWorkSlot1: string | null = useMemo(() => {
    if (!isDoubleMode || currentRoundSongs.length < 1) {
      return null;
    }
    const songId = currentRoundSongs[0]?.id;
    return songId ? doubleSelections[songId] ?? null : null;
  }, [isDoubleMode, currentRoundSongs, doubleSelections]);

  const doubleSelectedWorkSlot2: string | null = useMemo(() => {
    if (!isDoubleMode || currentRoundSongs.length < 2) {
      return null;
    }
    const songId = currentRoundSongs[1]?.id;
    return songId ? doubleSelections[songId] ?? null : null;
  }, [isDoubleMode, currentRoundSongs, doubleSelections]);

  return {
    mode: "multiplayer" as const,

    room,
    players,
    responses,
    state,
    isConnected,
    isHost,
    canGoNext,
    canGoPrev,

    works: displayWorks,
    isLoadingWorks,
    allowedWorks,

    currentSong,
    currentSongIndex,
    totalSongs: room?.songs?.length ?? 0,
    displayedSongIndex: room?.displayedSongIndex ?? currentSongIndex + 1,
    displayedTotalSongs: room?.displayedTotalSongs ?? room?.songs?.length ?? 0,
    roundCount: room?.roundCount,
    currentRoundIndex: room?.currentRoundIndex,

    selectedWork,
    showAnswer,
    gameAnswer,
    currentSongAnswer,
    isCurrentSongAnswered,
    submitError,

    lastGain,

    options,

    currentRound,
    isReverseMode,
    isDoubleMode,
    currentRoundSongs,
    doubleSelectedWorkSlot1,
    doubleSelectedWorkSlot2,
    handleDoubleSelection,
    clearDoubleSelectionForWork,

    handleAnswer,
    validateAnswer,
    nextSong,
    showScores: handleShowScores,
    resetToWaiting,
    startGame: handleStartGame,
    sendPlayerReady,
    startAt,
    configureRoom: handleConfigureRoom,
    leaveRoom,
    authRequired,
    authError,
    submitPassword,
    allPlayersAnswered,
  };
};
