"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import {
  Check,
  Home as HomeIcon,
  Pause,
  Play as PlayIcon,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { useMultiplayerGame } from "../hooks/useMultiplayerGame";
import { PlayersScoreboard } from "./PlayersScoreboard";
import { useAudioPlayer } from "@/features/audio-player";
import { WorkSelector } from "@/components/game/WorkSelector";
import { PointsCelebration } from "@/components/game/PointsCelebration";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { cn } from "@/lib/utils";
import { pressable } from "@/styles/ui";

export interface MultiGameClientProps {
  universeId: string;
  roomId: string;
  playerId: string;
  displayName: string;
  noSeek?: boolean;
}

export const MultiGameClient = ({
  universeId,
  roomId,
  playerId,
  displayName,
  noSeek = false,
}: MultiGameClientProps) => {
  const router = useRouter();

  const particlePositions = useMemo(
    () => [
      { top: 15, left: 20 },
      { top: 35, left: 75 },
      { top: 55, left: 25 },
      { top: 70, left: 85 },
      { top: 85, left: 15 },
      { top: 20, left: 60 },
      { top: 45, left: 90 },
      { top: 65, left: 40 },
      { top: 90, left: 70 },
      { top: 25, left: 35 },
      { top: 50, left: 80 },
      { top: 75, left: 10 },
      { top: 30, left: 55 },
      { top: 60, left: 30 },
      { top: 80, left: 65 },
      { top: 40, left: 45 },
      { top: 12, left: 85 },
      { top: 67, left: 12 },
      { top: 82, left: 92 },
      { top: 38, left: 68 },
    ],
    []
  );
  const [passwordInput, setPasswordInput] = useState("");

  const {
    isPlaying: audioIsPlaying,
    volume: audioVolume,
    currentTime: audioCurrentTime,
    duration: audioDuration,
    isMuted: audioIsMuted,
    error: audioError,
    togglePlay: audioTogglePlay,
    setVolume: audioSetVolume,
    toggleMute: audioToggleMute,
    seek: audioSeek,
    loadTrack: audioLoadTrack,
    preloadTrack: audioPreloadTrack,
    reset: audioReset,
  } = useAudioPlayer({
    noSeek,
    autoPlay: true,
  });

  const game = useMultiplayerGame({
    universeId,
    roomId,
    playerId,
    displayName,
    preloadNextTrack: (song) => {
      if (song.audioUrl) {
        audioPreloadTrack(song.audioUrl);
      }
    },
  });

  const {
    works,
    currentSong,
    selectedWork,
    showAnswer,
    canGoNext,
    isCurrentSongAnswered,
    handleAnswer,
    validateAnswer,
    nextSong,
    room,
    players,
    state,
    isConnected,
    lastGain,
    authRequired,
    authError,
    submitPassword,
  } = game;

  useEffect(() => {
    if (authRequired) {
      setPasswordInput("");
    }
  }, [authRequired]);

  useEffect(() => {
    if (currentSong?.audioUrl) {
      void audioLoadTrack(currentSong.audioUrl);
    } else {
      audioReset();
    }
  }, [currentSong?.audioUrl, audioLoadTrack, audioReset]);

  const handlePlayToggle = useCallback(() => {
    if (!currentSong?.audioUrl) return;
    audioTogglePlay();
  }, [currentSong?.audioUrl, audioTogglePlay]);

  const handleVolumeChange = useCallback(
    (value: number) => {
      audioSetVolume(value);
    },
    [audioSetVolume]
  );

  const handleTimelineClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (noSeek) return;

      const rect = event.currentTarget.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const percentage = (clickX / rect.width) * 100;
      const newProgress = Math.max(0, Math.min(100, percentage));
      audioSeek(newProgress);
    },
    [audioSeek, noSeek]
  );

  const handleWorkSelection = useCallback(
    (workId: string) => {
      handleAnswer(workId);
    },
    [handleAnswer]
  );

  const handleValidateAnswer = useCallback(() => {
    validateAnswer();
  }, [validateAnswer]);

  const handleNextSong = useCallback(() => {
    nextSong();
  }, [nextSong]);

  const handleGoHome = useCallback(() => {
    router.push("/");
  }, [router]);

  const formatTime = useCallback((seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const playbackUnavailable = !currentSong?.audioUrl;
  const progress = useMemo(
    () => (audioDuration ? (audioCurrentTime / audioDuration) * 100 : 0),
    [audioDuration, audioCurrentTime]
  );
  const currentPlayer = useMemo(
    () => players.find((player) => player.id === playerId),
    [players, playerId]
  );
  const currentPlayerScore = useMemo(
    () => ({
      correct: currentPlayer?.score ?? 0,
      incorrect: currentPlayer?.incorrect ?? 0,
    }),
    [currentPlayer]
  );
  const answerFooter =
    game.showAnswer &&
    game.currentSongAnswer &&
    game.currentSong?.artist &&
    game.currentSong?.title ? (
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="px-5 py-3 rounded-2xl bg-white border-[3px] border-[#1B1B1B] text-center shadow-[4px_4px_0_#1B1B1B]">
          <p className="text-sm md:text-base text-[var(--color-text-primary)] font-semibold tracking-wide">
            {game.currentSong.artist} &mdash;{" "}
            <span className="text-[#B45309]">{game.currentSong.title}</span>
          </p>
        </div>
        {canGoNext && game.isHost && (
          <button
            onClick={handleNextSong}
            className="magic-button px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-bold"
          >
            <span className="relative z-10 flex items-center gap-2">
              Morceau suivant
            </span>
          </button>
        )}
      </div>
    ) : null;

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[var(--color-surface-base)] flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-[var(--color-text-primary)] mt-4 font-semibold">
            Connexion au serveur...
          </p>
        </div>
      </div>
    );
  }

  if (!currentSong) {
    return (
      <div className="min-h-screen bg-[var(--color-surface-base)] flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-[var(--color-text-primary)] mt-4 font-semibold">
            En attente de la playlist de la room...
          </p>
          {room?.hostId && playerId !== room.hostId && (
            <p className="text-sm text-[var(--color-text-secondary)] mt-2">
              L&apos;hote doit demarrer la partie. (Hote: {room.hostId.slice(0, 8)})
            </p>
          )}
        </div>
      </div>
    );
  }

  if (works.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--color-surface-base)] flex items-center justify-center p-6">
        <div className="text-center">
          <ErrorMessage message="Aucune oeuvre trouvee pour cet univers" />
          <button onClick={handleGoHome} className="magic-button mt-6 px-6 py-3">
            <HomeIcon className="inline mr-2" />
            Retour a l&apos;accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface-base)] relative overflow-hidden">
      <PointsCelebration points={lastGain?.points ?? null} triggerKey={lastGain?.key} />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particlePositions.map((position) => (
          <div
            key={`${position.top}-${position.left}`}
            className="particle"
            style={{
              top: `${position.top}%`,
              left: `${position.left}%`,
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-yellow-200/40 via-transparent to-blue-200/40 pointer-events-none" />

      <div className="fixed top-3 left-2 sm:top-6 sm:left-6 z-50">
        <button
          onClick={handleGoHome}
          className="magic-button px-3 py-2 sm:px-6 sm:py-3 flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
        >
          <HomeIcon className="text-base sm:text-lg" />
          <span className="hidden sm:inline">Accueil</span>
        </button>
      </div>

      <div className="fixed top-6 right-6 z-40 hidden lg:block">
        <PlayersScoreboard players={players} currentPlayerId={playerId} />
      </div>

      <div className="container mx-auto px-4 py-8 pb-24 relative z-10">
        <div className="lg:hidden flex justify-center mb-6">
          <PlayersScoreboard players={players} currentPlayerId={playerId} />
        </div>

        <div className="flex flex-col items-center justify-center gap-5 min-h-[60vh] md:min-h-[65vh]">
          <div className="w-full flex justify-center">
            <WorkSelector
              works={works}
              currentSongWorkId={currentSong?.workId}
              selectedWork={selectedWork}
              showAnswer={showAnswer}
              canValidate={!!selectedWork && !showAnswer && state === "playing"}
              isCurrentSongAnswered={isCurrentSongAnswered}
              onWorkSelection={handleWorkSelection}
              onValidateAnswer={handleValidateAnswer}
              footer={answerFooter}
            />
          </div>
          {game.submitError && (
            <div className="px-4 py-2 rounded-xl bg-[#FFE5E5] border-2 border-[#1B1B1B] text-center text-xs text-red-700 shadow-[2px_2px_0_#1B1B1B]">
              {game.submitError}
            </div>
          )}
        </div>

      </div>


      <div className="fixed top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FDE68A]/40 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#BFDBFE]/40 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#FBCFE8]/40 rounded-full blur-3xl" />
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        <div className="player-dome mx-auto w-[calc(100%-1.5rem)] sm:w-[calc(100%-3rem)] max-w-6xl bg-white border-[3px] border-b-0 border-[#1B1B1B] shadow-[0_-6px_0_#1B1B1B] pointer-events-auto overflow-hidden">
          <div className="px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex flex-col items-center gap-2 sm:gap-3">
              <div className="flex items-center justify-center gap-4 sm:gap-5">
                <button
                  onClick={handlePlayToggle}
                  disabled={playbackUnavailable}
                  className={`magic-button rounded-full p-4 ${playbackUnavailable ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  {audioIsPlaying ? (
                    <Pause className="w-5 h-5 text-[#1B1B1B]" />
                  ) : (
                    <PlayIcon className="w-5 h-5 text-[#1B1B1B]" />
                  )}
                </button>

                {game.isHost && (
                  <button
                    onClick={handleNextSong}
                    disabled={!game.canGoNext}
                    className={cn(
                      "magic-button p-2 rounded-full bg-white hover:bg-[var(--color-surface-overlay)]",
                      !game.canGoNext && "opacity-60"
                    )}
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="w-full max-w-4xl flex flex-col items-center gap-2 sm:gap-3">
                <div className="flex items-center justify-between w-full text-[var(--color-text-primary)] text-xs font-semibold">
                  <span>{formatTime(audioCurrentTime)}</span>
                  <span>{formatTime(audioDuration)}</span>
                </div>

                <div
                  className="w-full magic-progress-bar h-3 cursor-pointer"
                  onClick={handleTimelineClick}
                >
                  <div className="magic-progress-fill h-full" style={{ width: `${progress}%` }} />
                </div>

                <div className="w-full grid grid-cols-[1fr_auto_1fr] items-center text-sm gap-3 pt-1">
                  <span className="text-[#B45309] font-semibold">
                    Morceau {game.currentSongIndex + 1} / {game.totalSongs}
                  </span>

                  <div className="flex items-center justify-center gap-3 text-xs">
                    <span className="px-3 py-1 rounded-full bg-[#86efac] text-[#1B1B1B] font-bold border-2 border-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B] inline-flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      {currentPlayerScore.correct}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-[#fca5a5] text-[#1B1B1B] font-bold border-2 border-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B] inline-flex items-center gap-1">
                      <X className="w-3 h-3" />
                      {currentPlayerScore.incorrect}
                    </span>
                  </div>

                  <div className="hidden md:flex items-center justify-end gap-3 text-[var(--color-text-primary)] text-xs">
                    <button
                      onClick={audioToggleMute}
                      className={cn(
                        "p-2 rounded-full bg-white hover:bg-[var(--color-surface-overlay)]",
                        pressable
                      )}
                    >
                      {audioIsMuted ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-28 magic-progress-bar h-2 cursor-pointer"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickX = e.clientX - rect.left;
                          const percentage = (clickX / rect.width) * 100;
                          const newVolume = Math.max(0, Math.min(100, percentage));
                          handleVolumeChange(newVolume);
                        }}
                      >
                        <div className="magic-progress-fill h-full" style={{ width: `${audioVolume}%` }} />
                      </div>
                      <span className="text-[var(--color-text-primary)] text-xs w-10 text-center">
                        {Math.round(audioVolume)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {audioError && (
        <div className="mt-4 text-center text-sm text-red-600">{audioError}</div>
      )}

      {playbackUnavailable && (
        <div className="mt-4 text-center text-sm text-[var(--color-text-secondary)]">
          Aucun extrait audio n&apos;est disponible pour ce morceau.
        </div>
      )}

      {authRequired && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm magic-card p-6 space-y-4">
            <div className="text-center">
              <p className="text-lg font-bold text-[var(--color-text-primary)]">
              Room protegée
              </p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Entrez le mot de passe pour rejoindre la room.
              </p>
            </div>
            <input
              type="password"
              value={passwordInput}
              onChange={(event) => setPasswordInput(event.target.value)}
              placeholder="Mot de passe"
              className="w-full bg-[var(--color-surface-overlay)] text-[var(--color-text-primary)] text-sm px-4 py-3 rounded-xl border-2 border-black focus:outline-none focus:border-black shadow-[3px_3px_0_#1B1B1B]"
            />
            {authError && (
              <div className="text-xs text-red-600 text-center">{authError}</div>
            )}
            <button
              onClick={() => submitPassword(passwordInput)}
              disabled={!passwordInput.trim()}
              className="magic-button w-full px-4 py-2 text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Valider
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
