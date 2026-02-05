"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  GameAnswer,
  GameRound,
  GameSession,
  MysteryEffectsConfig,
  Song,
  Work,
} from "@/types";
import { getSongsByWork, getWorksByUniverse, getWorksByIds } from "@/services/firebase";
import { RANDOM_UNIVERSE_ID } from "@/constants/gameModes";
import { generateId, shuffleArray, shuffleWithSeed } from "@/utils/formatters";
import { calculateGameRounds, getCurrentRound } from "@/utils/mysteryEffects";

export const CUSTOM_UNIVERSE_ID = "__custom__";

const PRELOAD_DELAY_MS = 1000;
const LAST_GAIN_RESET_MS = 2000;

const getActiveRound = (session: GameSession | null) => {
  if (!session?.rounds || session.currentRoundIndex === undefined) return undefined;
  return getCurrentRound(session.rounds, session.currentRoundIndex);
};

export interface UseSoloGameOptions {
  universeId: string;
  preloadNextTrack?: (song: Song) => void;
  allowedWorks?: string[];
  maxSongs?: number;
  worksPerRound?: number;
  mysteryEffectsConfig?: MysteryEffectsConfig;
}

export const useSoloGame = ({
  universeId,
  preloadNextTrack,
  allowedWorks,
  maxSongs,
  worksPerRound,
  mysteryEffectsConfig,
}: UseSoloGameOptions) => {
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [selectedWork, setSelectedWork] = useState<string | null>(null);
  const [gameAnswer, setGameAnswer] = useState<GameAnswer | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [lastGain, setLastGain] = useState<{ points: number; key: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setRounds] = useState<GameRound[]>([]);
  const [doubleSelections, setDoubleSelections] = useState<Record<string, string | null>>({});

  const currentRound = getActiveRound(gameSession);
  const isDoubleMode = currentRound?.type === "double";
  const isReverseMode = currentRound?.type === "reverse";

  const currentRoundSongs = useMemo<Song[]>(() => {
    if (!gameSession || !currentRound) {
      return currentSong ? [currentSong] : [];
    }

    const songsForRound = currentRound.songIds
      .map((id) => gameSession.songs.find((song) => song.id === id))
      .filter((song): song is Song => Boolean(song));

    if (!songsForRound.length && currentSong) {
      return [currentSong];
    }

    return songsForRound;
  }, [gameSession, currentRound, currentSong]);

  const currentSongIndex = gameSession?.currentSongIndex ?? 0;

  const initializeGame = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let fetchedWorks: Work[] = [];
      let filteredWorks: Work[] = [];

      const isCustomOrRandom =
        (universeId === CUSTOM_UNIVERSE_ID || universeId === RANDOM_UNIVERSE_ID) &&
        allowedWorks &&
        allowedWorks.length > 0;

      if (isCustomOrRandom) {
        const worksResult = await getWorksByIds(allowedWorks);
        fetchedWorks = worksResult.success && worksResult.data ? worksResult.data : [];
        filteredWorks = fetchedWorks;
      } else {
        const worksResult = await getWorksByUniverse(universeId);
        fetchedWorks = worksResult.success && worksResult.data ? worksResult.data : [];
        filteredWorks =
          allowedWorks && allowedWorks.length
            ? fetchedWorks.filter((work) => allowedWorks.includes(work.id))
            : fetchedWorks;
      }

      if (!fetchedWorks.length) {
        const msg = isCustomOrRandom
          ? `Aucune oeuvre trouvee pour les IDs selectionnes (${universeId}). Verifiez que ?works=... contient des IDs valides.`
          : `Aucune oeuvre trouvee pour l'univers "${universeId}"`;
        setError(msg);
        setLoading(false);
        return;
      }

      setWorks(filteredWorks);

      const songsSource = filteredWorks.length ? filteredWorks : fetchedWorks;

      const songs = songsSource.length
        ? (
            await Promise.all(
              songsSource.map(async (work) => {
                const result = await getSongsByWork(work.id);
                return result.success && result.data ? result.data : [];
              })
            )
          ).flat()
        : [];

      if (!songs.length) {
        setError(`Aucune chanson trouvee pour l'univers "${universeId}"`);
        setLoading(false);
        return;
      }

      const shuffledSongs = shuffleArray(songs);
      const limitedSongs =
        maxSongs && maxSongs > 0 && maxSongs < shuffledSongs.length
          ? shuffledSongs.slice(0, maxSongs)
          : shuffledSongs;

      let calculatedRounds: GameRound[];
      const hasEffects =
        mysteryEffectsConfig?.enabled &&
        mysteryEffectsConfig.effects.length > 0;

      if (hasEffects) {
        calculatedRounds = calculateGameRounds(limitedSongs, mysteryEffectsConfig);
      } else {
        calculatedRounds = limitedSongs.map((song) => ({
          type: "normal" as const,
          songIds: [song.id],
        }));
      }

      setRounds(calculatedRounds);

      const newGameSession: GameSession = {
        id: generateId(),
        universeId,
        songs: limitedSongs,
        currentSongIndex: 0,
        currentRoundIndex: 0,
        rounds: calculatedRounds,
        score: { correct: 0, incorrect: 0 },
        answers: [],
        createdAt: new Date(),
      };

      setGameSession(newGameSession);

      const firstRound = calculatedRounds[0];
      const firstSongId = firstRound?.songIds[0];
      const firstSong = limitedSongs.find((song) => song.id === firstSongId) ?? limitedSongs[0];

      setCurrentSong(firstSong);
      setLoading(false);
    } catch (err) {
      setError("Erreur lors du chargement du jeu");
      setLoading(false);
    }
  }, [universeId, allowedWorks, maxSongs, mysteryEffectsConfig]);

  const handleAnswer = useCallback(
    (workId: string) => {
      if (showAnswer || !gameSession || !currentSong) return;
      if (currentRound?.type === "double") return;

      const existingAnswer = gameSession.answers.find((answer) => answer.songId === currentSong.id);
      if (existingAnswer) return;

      const isCorrect = workId === currentSong.workId;

      setSelectedWork(workId);
      setGameAnswer({
        songId: currentSong.id,
        workId: currentSong.workId,
        selectedWorkId: workId,
        isCorrect,
        answeredAt: new Date(),
      });
    },
    [showAnswer, gameSession, currentSong, currentRound]
  );

  const validateAnswer = useCallback(() => {
    if (!gameSession) return;

    if (currentRound?.type === "double") {
      const songIds = currentRound.songIds;

      const songInfos = songIds
        .map((songId) => {
          const song = gameSession.songs.find((candidate) => candidate.id === songId);
          if (!song) return null;
          return {
            songId,
            song,
            selectedId: doubleSelections[songId] ?? null,
          };
        })
        .filter((info): info is { songId: string; song: Song; selectedId: string | null } =>
          Boolean(info)
        );

      if (!songInfos.length) return;

      const remainingCorrectWorks: string[] = songInfos.map((info) => info.song.workId);

      const newAnswers: GameAnswer[] = [];
      let addedCorrect = 0;
      let addedIncorrect = 0;

      songInfos.forEach((info) => {
        if (gameSession.answers.some((answer) => answer.songId === info.songId)) {
          return;
        }

        const selectedId = info.selectedId;
        let isCorrect = false;

        if (selectedId) {
          const matchIndex = remainingCorrectWorks.indexOf(selectedId);
          if (matchIndex !== -1) {
            remainingCorrectWorks.splice(matchIndex, 1);
            isCorrect = true;
          }
        }

        const answer: GameAnswer = {
          songId: info.songId,
          workId: info.song.workId,
          selectedWorkId: selectedId,
          isCorrect,
          answeredAt: new Date(),
        };

        newAnswers.push(answer);
        if (isCorrect) {
          addedCorrect += 1;
        } else if (selectedId) {
          addedIncorrect += 1;
        }
      });

      if (!newAnswers.length) return;

      const updatedSession: GameSession = {
        ...gameSession,
        answers: [...gameSession.answers, ...newAnswers],
        score: {
          correct: gameSession.score.correct + addedCorrect,
          incorrect: gameSession.score.incorrect + addedIncorrect,
        },
      };

      const timestamp = typeof performance !== "undefined" ? performance.now() : Date.now();
      setLastGain({ points: newAnswers.filter((answer) => answer.isCorrect).length, key: timestamp });
      setGameSession(updatedSession);
      setShowAnswer(true);
      return;
    }

    if (!currentSong || !gameAnswer) return;

    if (gameSession.answers.some((answer) => answer.songId === currentSong.id)) {
      return;
    }

    const updatedSession: GameSession = {
      ...gameSession,
      answers: [...gameSession.answers, gameAnswer],
      score: {
        correct: gameAnswer.isCorrect ? gameSession.score.correct + 1 : gameSession.score.correct,
        incorrect: gameAnswer.isCorrect ? gameSession.score.incorrect : gameSession.score.incorrect + 1,
      },
    };

    const timestamp = typeof performance !== "undefined" ? performance.now() : Date.now();
    setLastGain({ points: gameAnswer.isCorrect ? 1 : 0, key: timestamp });

    setGameSession(updatedSession);
    setShowAnswer(true);
  }, [gameSession, currentRound, currentSong, gameAnswer, doubleSelections]);

  const resetGameState = useCallback(() => {
    if (!gameSession || !currentSong) {
      setSelectedWork(null);
      setGameAnswer(null);
      setShowAnswer(false);
      setDoubleSelections({});
      return;
    }

    if (currentRound?.type === "double") {
      const songIds = currentRound.songIds;
      const newSelections: Record<string, string | null> = {};

      songIds.forEach((songId) => {
        const existing = gameSession.answers.find((answer) => answer.songId === songId);
        newSelections[songId] = existing?.selectedWorkId ?? null;
      });

      setDoubleSelections(newSelections);
      setSelectedWork(null);
      setGameAnswer(null);
      setShowAnswer(
        songIds.every((songId) =>
          gameSession.answers.some((answer) => answer.songId === songId)
        )
      );
      return;
    }

    const existingAnswer = gameSession.answers.find((answer) => answer.songId === currentSong.id);

    if (existingAnswer) {
      setSelectedWork(existingAnswer.selectedWorkId);
      setGameAnswer(existingAnswer);
      setShowAnswer(true);
    } else {
      setSelectedWork(null);
      setGameAnswer(null);
      setShowAnswer(false);
    }

    setDoubleSelections({});
  }, [gameSession, currentSong, currentRound]);

  const nextSong = useCallback(() => {
    if (!gameSession) return;

    if (!gameSession.rounds || gameSession.currentRoundIndex === undefined) {
      const nextIndex = gameSession.currentSongIndex + 1;

      if (nextIndex < gameSession.songs.length) {
        setGameSession({
          ...gameSession,
          currentSongIndex: nextIndex,
        });
        setCurrentSong(gameSession.songs[nextIndex]);
        resetGameState();
      }
      return;
    }

    const nextRoundIndex = gameSession.currentRoundIndex + 1;
    if (nextRoundIndex >= gameSession.rounds.length) {
      return;
    }

    const nextRound = gameSession.rounds[nextRoundIndex];
    const nextSongId = nextRound.songIds[0];
    const nextSong = gameSession.songs.find((song) => song.id === nextSongId);

    if (!nextSong) {
      return;
    }

    setGameSession({
      ...gameSession,
      currentRoundIndex: nextRoundIndex,
      currentSongIndex: gameSession.songs.findIndex((song) => song.id === nextSong.id),
    });
    setCurrentSong(nextSong);
    resetGameState();
  }, [gameSession, resetGameState]);

  const prevSong = useCallback(() => {
    if (!gameSession) return;

    if (gameSession.rounds && gameSession.currentRoundIndex !== undefined) {
      const prevRoundIndex = gameSession.currentRoundIndex - 1;
      if (prevRoundIndex < 0) return;

      const prevRound = gameSession.rounds[prevRoundIndex];
      const prevSongId = prevRound?.songIds[0];
      const prevSong = prevSongId
        ? gameSession.songs.find((song) => song.id === prevSongId)
        : undefined;

      if (!prevSong) {
        return;
      }

      setGameSession({
        ...gameSession,
        currentRoundIndex: prevRoundIndex,
        currentSongIndex: gameSession.songs.findIndex((song) => song.id === prevSong.id),
      });
      setCurrentSong(prevSong);
      resetGameState();
      return;
    }

    const prevIndex = gameSession.currentSongIndex - 1;

    if (prevIndex >= 0) {
      setGameSession({
        ...gameSession,
        currentSongIndex: prevIndex,
      });
      setCurrentSong(gameSession.songs[prevIndex]);
      resetGameState();
    }
  }, [gameSession, resetGameState]);

  const restartGame = useCallback(() => {
    initializeGame();
  }, [initializeGame]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  useEffect(() => {
    if (gameSession && currentSong) {
      resetGameState();
    }
  }, [gameSession, currentSong, resetGameState]);

  useEffect(() => {
    setLastGain(null);
  }, [currentSong?.id]);

  useEffect(() => {
    if (!lastGain) return;
    const timeoutId = setTimeout(() => setLastGain(null), LAST_GAIN_RESET_MS);
    return () => clearTimeout(timeoutId);
  }, [lastGain]);

  useEffect(() => {
    if (!gameSession || !currentSong || !preloadNextTrack) return;

    const nextIndex = gameSession.currentSongIndex + 1;
    if (nextIndex >= gameSession.songs.length) return;

    const nextSongItem = gameSession.songs[nextIndex];
    const timeoutId = setTimeout(() => {
      preloadNextTrack(nextSongItem);
    }, PRELOAD_DELAY_MS);
    return () => clearTimeout(timeoutId);
  }, [gameSession, currentSong, preloadNextTrack]);

  const correctWork = works.find((work) => work.id === currentSong?.workId);

  const canGoNext = gameSession
    ? gameSession.rounds && gameSession.currentRoundIndex !== undefined
      ? gameSession.currentRoundIndex < gameSession.rounds.length - 1
      : gameSession.currentSongIndex < gameSession.songs.length - 1
    : false;

  const canGoPrev = gameSession
    ? gameSession.rounds && gameSession.currentRoundIndex !== undefined
      ? gameSession.currentRoundIndex > 0
      : gameSession.currentSongIndex > 0
    : false;

  const isCurrentSongAnswered = useMemo(() => {
    if (!gameSession) return false;

    if (currentRound?.type === "double") {
      return currentRound.songIds.every((songId) =>
        gameSession.answers.some((answer) => answer.songId === songId)
      );
    }

    return Boolean(
      currentSong && gameSession.answers.some((answer) => answer.songId === currentSong.id)
    );
  }, [gameSession, currentSong, currentRound]);

  const currentSongAnswer =
    gameSession && currentSong
      ? gameSession.answers.find((answer) => answer.songId === currentSong.id) || null
      : null;

  const gameState: "idle" | "playing" | "finished" = !gameSession
    ? "idle"
    : canGoNext
      ? "playing"
      : isCurrentSongAnswered
        ? "finished"
        : "playing";

  const doubleSelectedWorkSlot1: string | null = useMemo(() => {
    if (!currentRound || currentRound.type !== "double") return null;
    const [songId1] = currentRound.songIds;
    return doubleSelections[songId1] ?? null;
  }, [currentRound, doubleSelections]);

  const doubleSelectedWorkSlot2: string | null = useMemo(() => {
    if (!currentRound || currentRound.type !== "double") return null;
    const [, songId2] = currentRound.songIds;
    return songId2 ? doubleSelections[songId2] ?? null : null;
  }, [currentRound, doubleSelections]);

  const displayedTotalSongs = useMemo(() => {
    if (gameSession?.rounds && gameSession.rounds.length > 0) {
      return gameSession.rounds.reduce((acc, round) => {
        return acc + (round.type === "double" ? 2 : 1);
      }, 0);
    }
    return gameSession?.songs.length ?? 0;
  }, [gameSession?.rounds, gameSession?.songs.length]);

  const displayedRoundCount = useMemo(() => {
    if (gameSession?.rounds && gameSession.rounds.length > 0) {
      return gameSession.rounds.length;
    }
    return gameSession?.songs.length ?? 0;
  }, [gameSession?.rounds, gameSession?.songs.length]);

  const displayedSongIndex = useMemo(() => {
    if (gameSession?.rounds && gameSession.currentRoundIndex !== undefined) {
      let consumed = 0;
      for (let i = 0; i < gameSession.currentRoundIndex; i += 1) {
        const round = gameSession.rounds[i];
        consumed += round.type === "double" ? 2 : 1;
      }
      return consumed + 1;
    }

    return (gameSession?.currentSongIndex ?? 0) + 1;
  }, [gameSession]);

  const displayedRoundIndex = useMemo(() => {
    if (gameSession?.rounds && gameSession.currentRoundIndex !== undefined) {
      return gameSession.currentRoundIndex + 1;
    }
    return (gameSession?.currentSongIndex ?? 0) + 1;
  }, [gameSession]);

  const handleDoubleSelection = useCallback(
    (slotIndex: 0 | 1, workId: string) => {
      if (showAnswer || !gameSession) return;
      if (!currentRound || currentRound.type !== "double") return;

      const songId = currentRound.songIds[slotIndex];
      if (!songId) return;

      if (gameSession.answers.some((answer) => answer.songId === songId)) {
        return;
      }

      setDoubleSelections((prev) => ({
        ...prev,
        [songId]: workId,
      }));
    },
    [gameSession, showAnswer, currentRound]
  );

  const clearDoubleSelectionForWork = useCallback(
    (workId: string) => {
      if (!gameSession || showAnswer) return;
      if (!currentRound || currentRound.type !== "double") return;

      setDoubleSelections((prev) => {
        const songIds = currentRound.songIds;
        const newSelections = { ...prev };

        const targetSongId = songIds.find((id) => newSelections[id] === workId);
        if (!targetSongId) {
          return prev;
        }

        newSelections[targetSongId] = null;
        return newSelections;
      });
    },
    [gameSession, showAnswer, currentRound]
  );

  const displayWorks = useMemo(() => {
    if (!worksPerRound || !currentSong || works.length === 0) {
      return works;
    }

    const correctId = currentSong.workId;
    const wrongWorks = works.filter((work) => work.id !== correctId);
    const count = Math.min(worksPerRound - 1, wrongWorks.length);
    const seed = `${currentSongIndex}-${currentSong.id}`;
    const shuffledWrong = shuffleWithSeed([...wrongWorks], seed);
    const selectedWrong = shuffledWrong.slice(0, count);
    const correctWorkForRound = works.find((work) => work.id === correctId);
    const pool = correctWorkForRound ? [correctWorkForRound, ...selectedWrong] : selectedWrong;
    const result = shuffleWithSeed(pool, `${seed}-final`);

    return result;
  }, [works, worksPerRound, currentSong, currentSongIndex, universeId]);

  return {
    gameSession,
    works: displayWorks,
    currentSong,
    selectedWork,
    gameAnswer,
    showAnswer,
    lastGain,
    loading,
    error,
    gameState,

    correctWork,
    canGoNext,
    canGoPrev,
    isCurrentSongAnswered,
    currentSongAnswer,
    currentSongIndex: gameSession?.currentSongIndex ?? 0,
    totalSongs: gameSession?.songs.length ?? 0,
    displayedSongIndex,
    displayedTotalSongs,
    displayedRoundIndex,
    displayedRoundCount,
    score: gameSession?.score ?? { correct: 0, incorrect: 0 },

    currentRound,
    isDoubleMode,
    isReverseMode,
    currentRoundSongs,
    doubleSelectedWorkSlot1,
    doubleSelectedWorkSlot2,

    handleAnswer,
    handleDoubleSelection,
    clearDoubleSelectionForWork,
    validateAnswer,
    nextSong,
    prevSong,
    restartGame,
    resetGameState,
  };
};
