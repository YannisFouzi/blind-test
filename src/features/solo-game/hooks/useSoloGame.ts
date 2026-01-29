"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import type {
  Song,
  Work,
  GameSession,
  GameAnswer,
  GameRound,
  MysteryEffectsConfig,
} from "@/types";
import { getSongsByWork, getWorksByUniverse, getWorksByIds } from "@/services/firebase";
import { RANDOM_UNIVERSE_ID } from "@/constants/gameModes";
import { generateId, shuffleArray, shuffleWithSeed } from "@/utils/formatters";
import { calculateGameRounds, getCurrentRound } from "@/utils/mysteryEffects";

/**
 * ID spécial pour le mode custom
 */
export const CUSTOM_UNIVERSE_ID = "__custom__";

/**
 * Options du hook useSoloGame
 */
export interface UseSoloGameOptions {
  /** ID de l'univers (ex: "disney", "90s") ou "__custom__" pour mode custom */
  universeId: string;

  /** Callback pour précharger la prochaine chanson */
  preloadNextTrack?: (song: Song) => void;

  /** Liste des œuvres autorisées (pour filtrage custom) */
  allowedWorks?: string[];

  /** Nombre maximum de chansons */
  maxSongs?: number;
  /** Mode aléatoire solo : nombre d'œuvres affichées par manche (2–8), depuis URL ?wpr= */
  worksPerRound?: number;
  /**
   * Configuration des effets mystères (optionnelle).
   * Si non fournie ou disabled, le jeu reste en mode "normal".
   */
  mysteryEffectsConfig?: MysteryEffectsConfig;
}

/**
 * Hook useSoloGame
 *
 * Gère toute la logique du mode solo :
 * - Chargement des works et songs
 * - Gestion des réponses
 * - Navigation (next/prev)
 * - Calcul du score
 *
 * @example
 * ```tsx
 * const game = useSoloGame({
 *   universeId: "disney",
 *   preloadNextTrack: (song) => console.log("Preload", song.audioUrl),
 *   maxSongs: 10
 * });
 *
 * return (
 *   <div>
 *     <button onClick={() => game.handleAnswer(workId)}>Répondre</button>
 *     <button onClick={game.nextSong}>Suivant</button>
 *   </div>
 * );
 * ```
 */
export const useSoloGame = ({
  universeId,
  preloadNextTrack,
  allowedWorks,
  maxSongs,
  worksPerRound,
  mysteryEffectsConfig,
}: UseSoloGameOptions) => {
  // État principal
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
  // Sélections en mode double : songId -> selectedWorkId
  const [doubleSelections, setDoubleSelections] = useState<Record<string, string | null>>({});

  /**
   * Initialiser le jeu : charger works + songs + créer session
   */
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

      // Mode Custom ou Mode aléatoire : charger les works par leurs IDs (URL ?works=...)
      if (isCustomOrRandom) {
        if (process.env.NODE_ENV === "development") {
          console.info("[SOLO-GAME] Chargement works par IDs (custom/random)", {
            universeId,
            allowedWorksCount: allowedWorks.length,
            allowedWorksSample: allowedWorks.slice(0, 3),
          });
        }
        const worksResult = await getWorksByIds(allowedWorks);
        fetchedWorks = worksResult.success && worksResult.data ? worksResult.data : [];
        filteredWorks = fetchedWorks;
        if (process.env.NODE_ENV === "development") {
          console.info("[SOLO-GAME] getWorksByIds résultat", {
            success: worksResult.success,
            fetchedCount: fetchedWorks.length,
            error: (worksResult as { error?: string }).error,
          });
        }
      } else {
        // Mode normal : charger les works de l'univers
        if (process.env.NODE_ENV === "development") {
          console.info("[SOLO-GAME] Chargement works par univers", { universeId });
        }
        const worksResult = await getWorksByUniverse(universeId);
        fetchedWorks = worksResult.success && worksResult.data ? worksResult.data : [];
        filteredWorks =
          allowedWorks && allowedWorks.length
            ? fetchedWorks.filter((w) => allowedWorks.includes(w.id))
            : fetchedWorks;
      }

      if (!fetchedWorks.length) {
        const msg = isCustomOrRandom
          ? `Aucune œuvre trouvée pour les IDs sélectionnés (${universeId}). Vérifiez que ?works=... contient des IDs valides.`
          : `Aucune œuvre trouvée pour l'univers "${universeId}"`;
        if (process.env.NODE_ENV === "development") {
          console.error("[SOLO-GAME] Aucune œuvre", { universeId, isCustomOrRandom, allowedWorksCount: allowedWorks?.length });
        }
        setError(msg);
        setLoading(false);
        return;
      }

      setWorks(filteredWorks);

      const songsSource = filteredWorks.length ? filteredWorks : fetchedWorks;

      // Charger toutes les chansons de toutes les œuvres
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
        setError(`Aucune chanson trouvée pour l'univers "${universeId}"`);
        setLoading(false);
        return;
      }

      // Mélanger et limiter
      const shuffledSongs = shuffleArray(songs);
      const limitedSongs =
        maxSongs && maxSongs > 0 && maxSongs < shuffledSongs.length
          ? shuffledSongs.slice(0, maxSongs)
          : shuffledSongs;

      // Calculer les rounds en fonction de la config d'effets mystères
      let calculatedRounds: GameRound[];
      const hasEffects = mysteryEffectsConfig?.enabled && mysteryEffectsConfig.effects.length > 0;

      if (hasEffects) {
        calculatedRounds = calculateGameRounds(limitedSongs, mysteryEffectsConfig);
      } else {
        calculatedRounds = limitedSongs.map((song) => ({
          type: "normal" as const,
          songIds: [song.id],
        }));
      }

      setRounds(calculatedRounds);

      // Créer la session
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
      // Déterminer le premier morceau à partir du premier round
      const firstRound = calculatedRounds[0];
      const firstSongId = firstRound?.songIds[0];
      const firstSong = limitedSongs.find((s) => s.id === firstSongId) ?? limitedSongs[0];

      setCurrentSong(firstSong);
      setLoading(false);
    } catch (err) {
      console.error("[useSoloGame] Erreur lors de l'initialisation:", err);
      setError("Erreur lors du chargement du jeu");
      setLoading(false);
    }
  }, [universeId, allowedWorks, maxSongs, mysteryEffectsConfig]);

  /**
   * Sélectionner une œuvre (réponse)
   */
  const handleAnswer = useCallback(
    (workId: string) => {
      if (showAnswer || !gameSession || !currentSong) return;

      // En mode double, la sélection passe par un handler dédié
      const currentRoundForAnswer =
        gameSession.rounds && gameSession.currentRoundIndex !== undefined
          ? getCurrentRound(gameSession.rounds, gameSession.currentRoundIndex)
          : undefined;

      if (currentRoundForAnswer?.type === "double") {
        return;
      }

      // Vérifier si déjà répondu
      const existingAnswer = gameSession.answers.find((answer) => answer.songId === currentSong.id);
      if (existingAnswer) {
        return;
      }

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
    [showAnswer, gameSession, currentSong]
  );

  /**
   * Valider la réponse
   */
  const validateAnswer = useCallback(() => {
    if (!gameSession) return;

    const currentRoundForValidation =
      gameSession.rounds && gameSession.currentRoundIndex !== undefined
        ? getCurrentRound(gameSession.rounds, gameSession.currentRoundIndex)
        : undefined;

    // Mode double : valider les deux chansons du round
    if (currentRoundForValidation?.type === "double") {
      const songIds = currentRoundForValidation.songIds;

      // Préparer les infos chansons + sélections
      const songInfos = songIds
        .map((songId) => {
          const song = gameSession.songs.find((s) => s.id === songId);
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

      if (!songInfos.length) {
        return;
      }

      // Ensemble des œuvres correctes (ordre-indépendant, avec multiplicité)
      const remainingCorrectWorks: string[] = songInfos.map((info) => info.song.workId);

      const newAnswers: GameAnswer[] = [];
      let addedCorrect = 0;
      let addedIncorrect = 0;

      songInfos.forEach((info) => {
        // Ne pas recréer une réponse si déjà présente
        if (gameSession.answers.some((answer) => answer.songId === info.songId)) {
          return;
        }

        const selectedId = info.selectedId;
        let isCorrect = false;

        if (selectedId) {
          const matchIndex = remainingCorrectWorks.indexOf(selectedId);
          if (matchIndex !== -1) {
            // On consomme une occurrence de cette œuvre correcte (multi-set)
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
          // On ne compte incorrect que si l'utilisateur a vraiment sélectionné quelque chose
          addedIncorrect += 1;
        }
      });

      if (!newAnswers.length) {
        return;
      }

      const updatedSession: GameSession = {
        ...gameSession,
        answers: [...gameSession.answers, ...newAnswers],
        score: {
          correct: gameSession.score.correct + addedCorrect,
          incorrect: gameSession.score.incorrect + addedIncorrect,
        },
      };

      const timestamp = typeof performance !== "undefined" ? performance.now() : Date.now();
      setLastGain({ points: newAnswers.filter((a) => a.isCorrect).length, key: timestamp });
      setGameSession(updatedSession);
      setShowAnswer(true);
      return;
    }

    // Mode normal / reverse (une seule chanson)
    if (!currentSong || !gameAnswer) return;

    // Vérifier si déjà répondu
    if (gameSession.answers.some((answer) => answer.songId === currentSong.id)) {
      return;
    }

    // Mettre à jour la session
    const updatedSession: GameSession = {
      ...gameSession,
      answers: [...gameSession.answers, gameAnswer],
      score: {
        correct: gameAnswer.isCorrect ? gameSession.score.correct + 1 : gameSession.score.correct,
        incorrect: gameAnswer.isCorrect ? gameSession.score.incorrect : gameSession.score.incorrect + 1,
      },
    };

    // Animation de points
    const timestamp = typeof performance !== "undefined" ? performance.now() : Date.now();
    setLastGain({ points: gameAnswer.isCorrect ? 1 : 0, key: timestamp });

    setGameSession(updatedSession);
    setShowAnswer(true);
  }, [gameSession, currentSong, gameAnswer, doubleSelections]);

  /**
   * Réinitialiser l'état pour la chanson actuelle
   */
  const resetGameState = useCallback(() => {
    if (!gameSession || !currentSong) {
      setSelectedWork(null);
      setGameAnswer(null);
      setShowAnswer(false);
       setDoubleSelections({});
      return;
    }

    const currentRoundForReset =
      gameSession.rounds && gameSession.currentRoundIndex !== undefined
        ? getCurrentRound(gameSession.rounds, gameSession.currentRoundIndex)
        : undefined;

    // Mode double : reconstruire les sélections à partir des réponses existantes
    if (currentRoundForReset?.type === "double") {
      const songIds = currentRoundForReset.songIds;
      const newSelections: Record<string, string | null> = {};

      songIds.forEach((songId) => {
        const existing = gameSession.answers.find((answer) => answer.songId === songId);
        newSelections[songId] = existing?.selectedWorkId ?? null;
      });

      setDoubleSelections(newSelections);
      setSelectedWork(null);
      setGameAnswer(null);
      setShowAnswer(songIds.every((songId) =>
        gameSession.answers.some((answer) => answer.songId === songId)
      ));
      return;
    }

    // Mode normal / reverse (un seul morceau)
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
  }, [gameSession, currentSong]);

  /**
   * Passer à la chanson suivante
   */
  const nextSong = useCallback(() => {
    if (!gameSession) return;

    // Si aucun round n'est défini, fallback sur le comportement historique
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
    const nextSong = gameSession.songs.find((s) => s.id === nextSongId);

    if (!nextSong) return;

    setGameSession({
      ...gameSession,
      currentRoundIndex: nextRoundIndex,
      currentSongIndex: gameSession.songs.findIndex((s) => s.id === nextSong.id),
    });
    setCurrentSong(nextSong);
    resetGameState();
  }, [gameSession, resetGameState]);

  /**
   * Revenir à la chanson précédente
   */
  const prevSong = useCallback(() => {
    if (!gameSession) return;

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

  /**
   * Recommencer le jeu
   */
  const restartGame = useCallback(() => {
    initializeGame();
  }, [initializeGame]);

  // ========================================
  // EFFECTS
  // ========================================

  /**
   * Initialiser le jeu au montage
   */
  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  /**
   * Réinitialiser l'état quand la chanson change
   */
  useEffect(() => {
    if (gameSession && currentSong) {
      resetGameState();
    }
  }, [gameSession, currentSong, resetGameState]);

  /**
   * Reset lastGain quand chanson change
   */
  useEffect(() => {
    setLastGain(null);
  }, [currentSong?.id]);

  /**
   * Masquer l'animation des points apres 1s
   */
  useEffect(() => {
    if (!lastGain) return;
    const timeoutId = setTimeout(() => setLastGain(null), 2000);
    return () => clearTimeout(timeoutId);
  }, [lastGain]);

  /**
   * Précharger la prochaine chanson
   */
  useEffect(() => {
    if (gameSession && currentSong && preloadNextTrack) {
      const nextIndex = gameSession.currentSongIndex + 1;
      if (nextIndex < gameSession.songs.length) {
        const nextSong = gameSession.songs[nextIndex];
        setTimeout(() => {
          preloadNextTrack(nextSong);
        }, 1000);
      }
    }
  }, [gameSession, currentSong, preloadNextTrack]);

  // ========================================
  // COMPUTED VALUES
  // ========================================

  const correctWork = works.find((work) => work.id === currentSong?.workId);
  const canGoNext = gameSession
    ? (gameSession.rounds && gameSession.currentRoundIndex !== undefined
        ? gameSession.currentRoundIndex < gameSession.rounds.length - 1
        : gameSession.currentSongIndex < gameSession.songs.length - 1)
    : false;
  const canGoPrev = gameSession ? gameSession.currentSongIndex > 0 : false;

  const isCurrentSongAnswered = useMemo(() => {
    if (!gameSession) return false;

    const currentRoundForStatus =
      gameSession.rounds && gameSession.currentRoundIndex !== undefined
        ? getCurrentRound(gameSession.rounds, gameSession.currentRoundIndex)
        : undefined;

    // Mode double : considérer la manche comme "répondue" si les deux chansons ont une réponse
    if (currentRoundForStatus?.type === "double") {
      return currentRoundForStatus.songIds.every((songId) =>
        gameSession.answers.some((answer) => answer.songId === songId)
      );
    }

    return Boolean(
      gameSession &&
        currentSong &&
        gameSession.answers.some((answer) => answer.songId === currentSong.id)
    );
  }, [gameSession, currentSong]);

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

  // Round courant + flags d'effets
  const currentRound = useMemo(() => {
    if (!gameSession?.rounds || gameSession.currentRoundIndex === undefined) return undefined;
    return getCurrentRound(gameSession.rounds, gameSession.currentRoundIndex);
  }, [gameSession?.rounds, gameSession?.currentRoundIndex]);

  const isDoubleMode = currentRound?.type === "double";
  const isReverseMode = currentRound?.type === "reverse";

  const currentRoundSongs: Song[] = useMemo(() => {
    if (!gameSession || !currentRound) {
      return currentSong ? [currentSong] : [];
    }

    const songsForRound = currentRound.songIds
      .map((id) => gameSession.songs.find((s) => s.id === id))
      .filter((s): s is Song => Boolean(s));

    if (!songsForRound.length && currentSong) {
      return [currentSong];
    }

    return songsForRound;
  }, [gameSession, currentRound, currentSong]);

  // Sélections actuelles pour les deux chansons du round double (slot 1 / slot 2)
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

  /**
   * Index "affiché" du morceau (1-based) et total,
   * calculés en fonction des rounds pour que :
   * - normal / reverse : 1, 2, 3, ...
   * - double : chaque round consomme 2 "morceaux" dans le total.
   */
  const displayedTotalSongs = useMemo(() => {
    if (gameSession?.rounds && gameSession.rounds.length > 0) {
      return gameSession.rounds.reduce((acc, round) => {
        return acc + (round.type === "double" ? 2 : 1);
      }, 0);
    }
    return gameSession?.songs.length ?? 0;
  }, [gameSession?.rounds, gameSession?.songs.length]);

  const displayedSongIndex = useMemo(() => {
    if (gameSession?.rounds && gameSession.currentRoundIndex !== undefined) {
      // Somme des morceaux "consommés" par tous les rounds précédents
      let consumed = 0;
      for (let i = 0; i < gameSession.currentRoundIndex; i++) {
        const round = gameSession.rounds[i];
        consumed += round.type === "double" ? 2 : 1;
      }
      // L'index affiché commence à 1
      return consumed + 1;
    }

    // Fallback historique : index basé sur currentSongIndex
    return (gameSession?.currentSongIndex ?? 0) + 1;
  }, [gameSession]);

  const handleDoubleSelection = useCallback(
    (slotIndex: 0 | 1, workId: string) => {
      if (showAnswer || !gameSession) return;

      const currentRoundForSelection =
        gameSession.rounds && gameSession.currentRoundIndex !== undefined
          ? getCurrentRound(gameSession.rounds, gameSession.currentRoundIndex)
          : undefined;

      if (!currentRoundForSelection || currentRoundForSelection.type !== "double") {
        return;
      }

      const songId = currentRoundForSelection.songIds[slotIndex];
      if (!songId) return;

      // Ne pas modifier si une réponse est déjà enregistrée pour cette chanson
      if (gameSession.answers.some((answer) => answer.songId === songId)) {
        return;
      }

      setDoubleSelections((prev) => ({
        ...prev,
        [songId]: workId,
      }));
    },
    [gameSession, showAnswer]
  );

  /**
   * Retirer une sélection pour une œuvre en mode double (un slot à la fois)
   */
  const clearDoubleSelectionForWork = useCallback(
    (workId: string) => {
      if (!gameSession || showAnswer) return;

      const currentRoundForSelection =
        gameSession.rounds && gameSession.currentRoundIndex !== undefined
          ? getCurrentRound(gameSession.rounds, gameSession.currentRoundIndex)
          : undefined;

      if (!currentRoundForSelection || currentRoundForSelection.type !== "double") {
        return;
      }

      setDoubleSelections((prev) => {
        const songIds = currentRoundForSelection.songIds;
        const newSelections = { ...prev };

        // Trouver un songId du round actuel qui pointe sur cette œuvre
        const targetSongId = songIds.find((id) => newSelections[id] === workId);
        if (!targetSongId) {
          return prev;
        }

        newSelections[targetSongId] = null;
        return newSelections;
      });
    },
    [gameSession, showAnswer]
  );

  // Mode aléatoire solo : X œuvres par manche (dont la bonne), ordre déterministe par chanson
  const currentSongIndex = gameSession?.currentSongIndex ?? 0;
  const displayWorks = useMemo(() => {
    if (!worksPerRound || !currentSong || works.length === 0) {
      if (process.env.NODE_ENV === "development" && universeId === RANDOM_UNIVERSE_ID && works.length > 0 && !worksPerRound) {
        console.warn("[SOLO-GAME] worksPerRound non passé en mode aléatoire → affichage des", works.length, "œuvres (pas d'échantillonnage)");
      }
      return works;
    }
    const correctId = currentSong.workId;
    const wrongWorks = works.filter((w) => w.id !== correctId);
    const count = Math.min(worksPerRound - 1, wrongWorks.length);
    const seed = `${currentSongIndex}-${currentSong.id}`;
    const shuffledWrong = shuffleWithSeed([...wrongWorks], seed);
    const selectedWrong = shuffledWrong.slice(0, count);
    const correctWork = works.find((w) => w.id === correctId);
    const pool = correctWork ? [correctWork, ...selectedWrong] : selectedWrong;
    const result = shuffleWithSeed(pool, `${seed}-final`);
    if (process.env.NODE_ENV === "development") {
      console.info("[SOLO-GAME] worksPerRound actif", { worksPerRound, currentSongIndex, displayCount: result.length, totalWorks: works.length });
    }
    return result;
  }, [works, worksPerRound, currentSong, currentSongIndex, universeId]);

  // ========================================
  // RETURN
  // ========================================

  return {
    // État
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

    // Computed
    correctWork,
    canGoNext,
    canGoPrev,
    isCurrentSongAnswered,
    currentSongAnswer,
    currentSongIndex: gameSession?.currentSongIndex ?? 0,
    totalSongs: gameSession?.songs.length ?? 0,
    displayedSongIndex,
    displayedTotalSongs,
    score: gameSession?.score ?? { correct: 0, incorrect: 0 },

    // Effets mystères (solo)
    currentRound,
    isDoubleMode,
    isReverseMode,
    currentRoundSongs,
    doubleSelectedWorkSlot1,
    doubleSelectedWorkSlot2,

    // Actions
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
