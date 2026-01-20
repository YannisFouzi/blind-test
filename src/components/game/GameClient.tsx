"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {
  Home as HomeIcon,
  Pause,
  Play as PlayIcon,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Song } from "@/types";

import { WorkSelector } from "@/components/game/WorkSelector";
import { PointsCelebration } from "@/components/game/PointsCelebration";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useGame } from "@/hooks/useGame";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";
import { useIdentity } from "@/hooks/useIdentity";

interface GameClientProps {
  universeId: string;
}

type Mode = "solo" | "multi";

export function GameClient({ universeId }: GameClientProps) {
  console.log("[GameClient] RENDER START", { universeId, timestamp: Date.now() });
  const router = useRouter();
  const searchParams = useSearchParams();

  // Player identity (persist per session) via useIdentity
  const { playerId, displayName: storedDisplayName, ready: identityReady, setIdentity } = useIdentity();
  const queryPlayer = searchParams?.get("player");
  const queryName = searchParams?.get("name") || "";

  useEffect(() => {
    if (queryPlayer) {
      setIdentity({ playerId: queryPlayer });
    }
  }, [queryPlayer, setIdentity]);

  useEffect(() => {
    if (queryName) {
      setIdentity({ displayName: queryName });
    }
  }, [queryName, setIdentity]);

  const playerIdRef = useRef<string>("");
  const hasLoggedMountRef = useRef<boolean>(false);

  useEffect(() => {
    if (!hasLoggedMountRef.current) {
      hasLoggedMountRef.current = true;
      console.info("[GameClient] mount", {
        roomId,
        universeId,
        mode,
        queryPlayer,
        queryName,
        queryNoSeek,
        queryWorks,
      });
    }
    if (!identityReady || !playerId) return;
    if (!playerIdRef.current) {
      playerIdRef.current = playerId;
    }
  }, [
    identityReady,
    playerId,
    roomId,
    universeId,
    mode,
    queryPlayer,
    queryName,
    queryNoSeek,
    queryWorks,
  ]);

  const displayName = useMemo(() => {
    if (queryName) return queryName;
    if (storedDisplayName) return storedDisplayName;
    if (playerId) return `Joueur-${playerId.slice(0, 4)}`;
    return "Joueur";
  }, [queryName, storedDisplayName, playerId]);
  const queryNoSeek = searchParams?.get("noseek") === "1";
  const queryWorks = searchParams?.get("works") || "";
  const allowedWorksFromQuery = useMemo(
    () => (queryWorks ? queryWorks.split(",").filter(Boolean) : undefined),
    [queryWorks]
  );

  const queryMode = (searchParams?.get("mode") as Mode | null) || "solo";
  const mode = queryMode;

  const roomId = searchParams?.get("room") || "";
  const isHostParam = searchParams?.get("host") === "1";

  // S'assurer que la ref contient l'ID stable avant d'initialiser les hooks multi
  if (identityReady && playerId && !playerIdRef.current) {
    playerIdRef.current = playerId;
  }

  const effectivePlayerId = identityReady ? (playerId ?? undefined) : undefined;
  const effectiveDisplayName = identityReady ? displayName : storedDisplayName || "Joueur";

  const {
    isPlaying: audioIsPlaying,
    volume: audioVolume,
    currentTime: audioCurrentTime,
    duration: audioDuration,
    isMuted: audioIsMuted,
    audioError,
    handlePlayPause: handleAudioPlayPause,
    handleVolumeChange: handleAudioVolumeChange,
    toggleMute: toggleAudioMute,
    handleProgressClick: handleAudioProgressClick,
    resetPlayer: resetAudioPlayer,
    preloadTrack,
    prepareTrack,
    formatTime: formatAudioTime,
  } = useAudioPlayer();

  const preloadNextMedia = useCallback(
    (song: Song) => {
      if (song.audioUrl) {
        preloadTrack(song.audioUrl);
      }
    },
    [preloadTrack]
  );

  const soloGame = useGame(universeId, preloadNextMedia, allowedWorksFromQuery);

  const multiplayerGame = useMultiplayerGame({
    universeId,
    roomId,
    playerId: effectivePlayerId,
    displayName: effectiveDisplayName,
    preloadNextTrack: preloadNextMedia,
  });

  const isMultiActive = mode === "multi" && !!roomId;
  const isHost = isMultiActive ? multiplayerGame.isHost : isHostParam;
  const activeWorks = isMultiActive ? multiplayerGame.works : soloGame.works;
  const activeCurrentSong = isMultiActive ? multiplayerGame.currentSong : soloGame.currentSong;
  const activeShowAnswer = isMultiActive ? multiplayerGame.showAnswer : soloGame.showAnswer;
  const activeSelectedWork = isMultiActive ? multiplayerGame.selectedWork : soloGame.selectedWork;
  const activeIsCurrentSongAnswered = isMultiActive
    ? multiplayerGame.isCurrentSongAnswered
    : soloGame.isCurrentSongAnswered;
  const activeCurrentSongAnswer = isMultiActive ? multiplayerGame.currentSongAnswer : soloGame.currentSongAnswer;
  const activeOptions = isMultiActive ? multiplayerGame.options : { noSeek: queryNoSeek };
  const activeSubmitError = isMultiActive ? multiplayerGame.submitError : null;

  const activeHandleWorkSelection = isMultiActive
    ? multiplayerGame.handleWorkSelection
    : soloGame.handleWorkSelection;
  const activeHandleValidateAnswer = isMultiActive
    ? multiplayerGame.handleValidateAnswer
    : soloGame.handleValidateAnswer;
  const activeHandleNextSong = isMultiActive ? multiplayerGame.handleNextSong : soloGame.handleNextSong;
  const activeHandlePrevSong = isMultiActive ? () => {} : soloGame.handlePrevSong;

  const activeCanGoNext = isMultiActive ? multiplayerGame.isHost && multiplayerGame.canGoNext : soloGame.canGoNext;
  const activeCanGoPrev = isMultiActive ? false : soloGame.canGoPrev;
  const activeState = isMultiActive ? multiplayerGame.state : "playing";

  useEffect(() => {
    // Controls state tracking (logs retirés)
  }, [mode, roomId, isHost, activeCanGoNext, activeCanGoPrev, isMultiActive, multiplayerGame.players.length]);

  const activeSongIndex = isMultiActive
    ? multiplayerGame.currentSongIndex
    : soloGame.gameSession?.currentSongIndex ?? 0;
  const activeSongCount = isMultiActive
    ? multiplayerGame.room?.songs.length ?? 0
    : soloGame.gameSession?.songs.length ?? 0;

  const activeScore = useMemo(() => {
    if (isMultiActive) {
      const me = multiplayerGame.players.find((p) => p.id === playerIdRef.current);
      return { correct: me?.score ?? 0, incorrect: me?.incorrect ?? 0 };
    }
    return soloGame.gameSession?.score ?? { correct: 0, incorrect: 0 };
  }, [isMultiActive, multiplayerGame.players, soloGame.gameSession?.score]);

  const activeLastGain = isMultiActive ? multiplayerGame.lastGain : soloGame.lastGain;
  const [isLoaded, setIsLoaded] = useState(false);
  const [pointsFlash, setPointsFlash] = useState<{ points: number; key: number } | null>(null);

  useEffect(() => {
    // Score snapshot tracking (logs retirés)
  }, [mode, roomId, isHost, activeScore]);

  useEffect(() => {
    if (!activeLastGain) {
      setPointsFlash(null);
      return;
    }

    setPointsFlash(activeLastGain);
    const timer = setTimeout(() => setPointsFlash(null), 1500);
    return () => clearTimeout(timer);
  }, [activeLastGain]);

  const playbackIsPlaying = audioIsPlaying;
  const playbackCurrentTime = audioCurrentTime;
  const playbackDuration = audioDuration;
  const playbackVolume = audioVolume;
  const playbackMuted = audioIsMuted;
  const playerError = audioError;
  const formatTimeFn = formatAudioTime;
  const playbackUnavailable = !activeCurrentSong?.audioUrl;

  // AUTO-CONFIG DÉSACTIVÉ : La configuration se fait maintenant dans /room/[roomId]
  // où le HOST sélectionne l'univers avant d'arriver sur /game
  // const [hasConfiguredRoom, setHasConfiguredRoom] = useState(false);

  // AUTO-CONFIG EFFECT DÉSACTIVÉ
  // La configuration de la room se fait maintenant dans /room/[roomId] par le HOST
  // avant qu'il n'arrive sur /game
  /*
  useEffect(() => {
    ... code commenté ...
  }, [dependencies]);
  */

  useEffect(() => {
    if (activeCurrentSong?.audioUrl) {
      void prepareTrack(activeCurrentSong.audioUrl);
    } else {
      resetAudioPlayer();
    }
  }, [activeCurrentSong?.audioUrl, prepareTrack, resetAudioPlayer]);

  const handlePlayToggle = () => {
    if (playbackUnavailable) {
      return;
    }
    if (activeCurrentSong?.audioUrl) {
      handleAudioPlayPause(activeCurrentSong.audioUrl);
    }
  };

  const handleVolumeChangeValue = (value: number) => {
    handleAudioVolumeChange(value);
  };

  const handleMuteToggle = () => {
    toggleAudioMute();
  };

  const handleTimelineClick = (event: MouseEvent<HTMLDivElement>) => {
    if (activeOptions?.noSeek) return;
    handleAudioProgressClick(event);
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Log multi snapshots only when key fields change to reduce spam
  useEffect(() => {
    if (!isMultiActive) return;
    const snapshot = {
      roomId,
      state: multiplayerGame.state,
      songs: multiplayerGame.room?.songs?.length ?? 0,
      currentSongId: multiplayerGame.currentSong?.id,
      players: multiplayerGame.players.length,
      isHost,
      isConnected: multiplayerGame.isConnected,
    };
    console.info("[GameClient] multi snapshot", snapshot);
  }, [
    isMultiActive,
    roomId,
    multiplayerGame.state,
    multiplayerGame.room?.songs?.length,
    multiplayerGame.currentSong?.id,
    multiplayerGame.players.length,
    multiplayerGame.isConnected,
    isHost,
  ]);

  const handleNextSongWithReset = () => {
    activeHandleNextSong();
  };

  const handlePrevSongWithReset = () => {
    activeHandlePrevSong();
  };

  const handleWorkSelectionWithSound = (workId: string) => {
    activeHandleWorkSelection(workId);
  };

  const handleValidateAnswerWithSound = () => {
    activeHandleValidateAnswer();
  };

  if (!identityReady || !playerId || !playerIdRef.current) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isMultiActive && (!soloGame.gameSession || !soloGame.currentSong)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-white mt-4 font-medium">
            Chargement de l&apos;univers magique...
          </p>
        </div>
      </div>
    );
  }

  if (mode === "multi" && !roomId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <ErrorMessage message={"Room introuvable ou non initialisée"} />
        </div>
      </div>
    );
  }

  if (!isMultiActive && activeWorks.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 flex items-center justify-center p-6">
        <div className="text-center">
          <ErrorMessage message="Aucune oeuvre trouvee pour cet univers" />
        </div>
      </div>
    );
  }

  if (isMultiActive && !multiplayerGame.currentSong) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-white mt-4 font-medium">En attente de la playlist de la room...</p>
          {multiplayerGame.room?.hostId && playerIdRef.current !== multiplayerGame.room.hostId && (
            <p className="text-sm text-gray-400 mt-2">
              L&apos;hôte actuel doit démarrer la partie. (Hôte: {multiplayerGame.room.hostId.slice(0, 8)})
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 relative overflow-hidden">
      <PointsCelebration points={pointsFlash?.points ?? null} triggerKey={pointsFlash?.key} />
      {/* Particules */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[
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
        ].map((position, i) => (
          <div
            key={i}
            className="particle"
            style={{
              top: `${position.top}%`,
              left: `${position.left}%`,
            }}
          />
        ))}
      </div>

      {/* Effet de brume */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-800/20 via-transparent to-blue-800/20 pointer-events-none" />

      {/* Navigation */}
      <div
        className={`fixed top-6 left-6 z-50 ${
          isLoaded ? "slide-in-left" : "opacity-0"
        }`}
      >
        <button
          onClick={() => {
            router.push("/");
          }}
          className="magic-button px-6 py-3 flex items-center gap-2 text-white font-semibold"
        >
          <HomeIcon className="text-lg" />
          <span className="hidden sm:inline">Accueil</span>
        </button>
      </div>

      {/* Conteneur principal */}
      <div className="container mx-auto px-4 py-8 pb-24 relative z-10">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 max-w-7xl mx-auto justify-items-center">
          <div
            className={`xl:col-span-2 w-full flex justify-center ${
              isLoaded ? "slide-in-right" : "opacity-0"
            }`}
            style={{ animationDelay: "0.6s" }}
          >
            <WorkSelector
              works={activeWorks}
              currentSongWorkId={activeCurrentSong?.workId}
              selectedWork={activeSelectedWork}
              showAnswer={activeShowAnswer}
              canValidate={!!activeSelectedWork && !activeShowAnswer && activeState === "playing"}
              canGoNext={activeCanGoNext}
              isCurrentSongAnswered={activeIsCurrentSongAnswered}
              onWorkSelection={handleWorkSelectionWithSound}
              onValidateAnswer={handleValidateAnswerWithSound}
              onNextSong={handleNextSongWithReset}
            />
          </div>
        </div>

        {/* Détails du morceau une fois la réponse validée */}
        {activeShowAnswer && activeCurrentSongAnswer && activeCurrentSong?.artist && activeCurrentSong?.title && (
          <div className="flex justify-center mt-6">
            <div className="px-5 py-3 rounded-2xl bg-slate-900/80 border border-purple-500/40 text-center shadow-lg backdrop-blur">
              <p className="text-sm md:text-base text-white font-semibold tracking-wide">
                {activeCurrentSong.artist} &mdash; <span className="text-yellow-300">{activeCurrentSong.title}</span>
              </p>
            </div>
          </div>
        )}

        {activeSubmitError && (
          <div className="flex justify-center mt-3">
            <div className="px-4 py-2 rounded-xl bg-red-900/60 border border-red-400/40 text-center text-xs text-red-100">
              {activeSubmitError}
            </div>
          </div>
        )}

        {mode === "multi" && roomId && null}
      </div>

      {/* Effets de lumière */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl" />
      </div>

      {/* Barre de lecteur */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 border-t border-purple-500/30 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-center gap-5">
              <button
                onClick={handlePrevSongWithReset}
                disabled={!activeCanGoPrev}
                className={`p-2 rounded-full transition-all duration-300 ${
                  activeCanGoPrev
                    ? "bg-slate-800/70 hover:bg-slate-700 text-white shadow-md hover:shadow-purple-500/30 hover:scale-105"
                    : "bg-slate-800/40 text-gray-500 cursor-not-allowed"
                }`}
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <div className="relative">
                <button
                  onClick={handlePlayToggle}
                  disabled={playbackUnavailable}
                  className={`relative p-4 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 rounded-full text-white shadow-xl hover:shadow-yellow-500/50 transition-all duration-300 transform hover:scale-105 ${
                    playbackUnavailable ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 blur-md opacity-50" />
                  <div className="relative z-10">
                    {playbackIsPlaying ? <Pause className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                  </div>
                </button>
              </div>

              <button
                onClick={handleNextSongWithReset}
                disabled={!activeCanGoNext}
                className={`p-2 rounded-full transition-all duration-300 ${
                  activeCanGoNext
                    ? "bg-slate-800/70 hover:bg-slate-700 text-white shadow-md hover:shadow-blue-500/30 hover:scale-105"
                    : "bg-slate-800/40 text-gray-500 cursor-not-allowed"
                }`}
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            <div className="w-full max-w-4xl flex flex-col items-center gap-3">
              <div className="flex items-center justify-between w-full text-white text-xs">
                <span>{formatTimeFn(playbackCurrentTime)}</span>
                <span>{formatTimeFn(playbackDuration)}</span>
              </div>
              <div
                className="w-full magic-progress-bar h-2 cursor-pointer hover:h-3 transition-all duration-300"
                onClick={handleTimelineClick}
              >
                <div
                  className="magic-progress-fill h-full"
                  style={{
                    width: `${
                      playbackDuration ? (playbackCurrentTime / playbackDuration) * 100 : 0
                    }%`,
                  }}
                />
              </div>
              <div className="w-full grid grid-cols-[1fr_auto_1fr] items-center text-sm gap-3 pt-1">
                <span className="text-yellow-400 font-semibold">
                  Morceau {activeSongIndex + 1} / {activeSongCount}
                </span>
                <div className="flex items-center justify-center gap-3 text-xs text-white">
                  <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-200 font-semibold">
                    + {activeScore.correct}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-200 font-semibold">
                    - {activeScore.incorrect}
                  </span>
                </div>
                <div className="hidden md:flex items-center justify-end gap-3 text-white text-xs">
                  <button
                    onClick={handleMuteToggle}
                    className="p-2 rounded-full bg-slate-800/60 hover:bg-slate-700/60 transition-all duration-300 hover:scale-105"
                  >
                    {playbackMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-28 magic-progress-bar h-2 cursor-pointer hover:h-3 transition-all duration-300"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const percentage = (clickX / rect.width) * 100;
                        const newVolume = Math.max(0, Math.min(100, percentage));
                        handleVolumeChangeValue(newVolume);
                      }}
                    >
                      <div
                        className="magic-progress-fill h-full"
                        style={{ width: `${playbackVolume}%` }}
                      />
                    </div>
                    <span className="text-white text-xs w-10 text-center">{Math.round(playbackVolume)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {playerError && (
        <div className="mt-4 text-center text-sm text-yellow-300">
          {playerError}
        </div>
      )}
      {playbackUnavailable && (
        <div className="mt-4 text-center text-sm text-yellow-300">
          Aucun extrait audio n&apos;est disponible pour ce morceau. Ajoutez un MP3 Cloudflare
          pour activer la lecture.
        </div>
      )}
    </div>
  );
}

export default GameClient;
