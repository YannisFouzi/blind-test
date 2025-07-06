"use client";

import { useParams, useRouter } from "next/navigation";
import { FaHome } from "react-icons/fa";
import { GameControls } from "../../../components/game/GameControls";
import { GamePlayer } from "../../../components/game/GamePlayer";
import { GameScore } from "../../../components/game/GameScore";
import { WorkSelector } from "../../../components/game/WorkSelector";
import { LoadingSpinner } from "../../../components/ui/LoadingSpinner";
import { useGame } from "../../../hooks/useGame";
import { useYouTube } from "../../../hooks/useYouTube";

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const universeId = params.universeId as string;

  // Hooks personnalisés
  const {
    gameSession,
    works,
    currentSong,
    selectedWork,
    showAnswer,
    usingDemoData,
    handleWorkSelection,
    handleValidateAnswer,
    handleNextSong,
    handlePrevSong,
    correctWork,
    canGoNext,
    canGoPrev,
  } = useGame(universeId);

  const {
    isPlaying,
    volume,
    currentTime,
    duration,
    isMuted,
    youtubeError,
    handlePlayPause,
    handleVolumeChange,
    toggleMute,
    handleProgressClick,
    handleYoutubeError,
    handleYoutubeReady,
    handleYoutubeStateChange,
    resetPlayer,
    formatTime,
  } = useYouTube();

  // Gestion de la navigation entre les chansons
  const handleNextSongWithReset = () => {
    handleNextSong();
    resetPlayer();
  };

  const handlePrevSongWithReset = () => {
    handlePrevSong();
    resetPlayer();
  };

  // État de chargement
  if (!gameSession || !currentSong) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <LoadingSpinner message="Chargement du jeu..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8 select-none cursor-default">
      {/* Header avec bouton retour */}
      <div className="flex justify-between items-center mb-8">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-white hover:text-yellow-400 transition-colors cursor-pointer"
        >
          <FaHome size={20} />
          <span>Retour aux univers</span>
        </button>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Lecteur audio */}
        <div className="space-y-6">
          {/* Composant lecteur */}
          <GamePlayer
            currentSong={currentSong}
            showAnswer={showAnswer}
            correctWorkTitle={correctWork?.title}
            usingDemoData={usingDemoData}
            youtubeError={youtubeError}
            onError={handleYoutubeError}
            onReady={handleYoutubeReady}
            onStateChange={handleYoutubeStateChange}
          />

          {/* Composant contrôles */}
          <div className="bg-slate-800/50 rounded-2xl p-8 text-center border border-gray-700/50">
            <GameControls
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              volume={volume}
              isMuted={isMuted}
              canGoPrev={canGoPrev}
              canGoNext={canGoNext}
              onPlayPause={handlePlayPause}
              onPrevSong={handlePrevSongWithReset}
              onNextSong={handleNextSongWithReset}
              onVolumeChange={handleVolumeChange}
              onToggleMute={toggleMute}
              onProgressClick={handleProgressClick}
              formatTime={formatTime}
            />
          </div>

          {/* Composant score */}
          <GameScore gameSession={gameSession} />
        </div>

        {/* Sélection des films */}
        <WorkSelector
          works={works}
          currentSongWorkId={currentSong.workId}
          selectedWork={selectedWork}
          showAnswer={showAnswer}
          canValidate={!!selectedWork && !showAnswer}
          canGoNext={canGoNext}
          onWorkSelection={handleWorkSelection}
          onValidateAnswer={handleValidateAnswer}
          onNextSong={handleNextSongWithReset}
        />
      </div>
    </div>
  );
}
