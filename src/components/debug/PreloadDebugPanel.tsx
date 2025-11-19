"use client";

import { useEffect, useState } from "react";

interface PreloadDebugPanelProps {
  currentVideoId?: string;
  preloadedVideoId: string | null;
  isPreloading: boolean;
  isPlaying: boolean;
  gameSession: {
    currentSongIndex: number;
    songs: Array<{ youtubeId: string; title: string; workId: string }>;
  } | null;
  onClose: () => void;
}

export const PreloadDebugPanel = ({
  currentVideoId,
  preloadedVideoId,
  isPreloading,
  isPlaying,
  gameSession,
  onClose,
}: PreloadDebugPanelProps) => {
  const [lastPlayTime, setLastPlayTime] = useState<number | null>(null);
  const [playPerformance, setPlayPerformance] = useState<{
    time: number;
    type: "instant" | "loading";
  } | null>(null);

  // Status du préchargement
  const getPreloadStatus = () => {
    if (!currentVideoId)
      return { status: "no-video", color: "gray", emoji: "⚪" };
    if (isPreloading)
      return { status: "loading", color: "orange", emoji: "⏳" };
    if (preloadedVideoId === currentVideoId) {
      return { status: "ready", color: "green", emoji: "✅" };
    }
    if (preloadedVideoId && preloadedVideoId !== currentVideoId) {
      return { status: "different", color: "blue", emoji: "🔄" };
    }
    return { status: "not-loaded", color: "red", emoji: "❌" };
  };

  // Prochaine chanson
  const getNextSong = () => {
    if (!gameSession?.songs || !gameSession?.currentSongIndex) return null;
    const nextIndex = gameSession.currentSongIndex + 1;
    return gameSession.songs[nextIndex] || null;
  };

  const status = getPreloadStatus();
  const nextSong = getNextSong();

  // Messages descriptifs
  const getStatusMessage = () => {
    switch (status.status) {
      case "ready":
        return "🚀 Lecture instantanée disponible !";
      case "loading":
        return "⏳ Préchargement en cours...";
      case "different":
        return `🔄 Autre vidéo prête: ${preloadedVideoId?.slice(-8)}`;
      case "not-loaded":
        return "❌ Pas de préchargement";
      default:
        return "⚪ Aucune vidéo";
    }
  };

  useEffect(() => {
    if (isPlaying && lastPlayTime) {
      const responseTime = Date.now() - lastPlayTime;
      const type = preloadedVideoId === currentVideoId ? "instant" : "loading";
      setPlayPerformance({ time: responseTime, type });
      setLastPlayTime(null);
    }
  }, [isPlaying, currentVideoId, preloadedVideoId, lastPlayTime]);

  const handlePlayClick = () => {
    setLastPlayTime(Date.now());
  };

  return (
    <div className="fixed top-4 right-4 z-50 bg-black/90 backdrop-blur-sm text-white p-4 rounded-lg border border-gray-600 font-mono text-xs max-w-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-yellow-400">🎵 Preload Debug</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* Status principal */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{status.emoji}</span>
          <span className={`text-${status.color}-400 font-semibold`}>
            {getStatusMessage()}
          </span>
        </div>

        {/* Détails de la vidéo actuelle */}
        <div className="bg-gray-800 p-2 rounded">
          <div className="text-gray-300">Vidéo actuelle:</div>
          <div className="text-blue-300 break-all">
            {currentVideoId ? `...${currentVideoId.slice(-8)}` : "Aucune"}
          </div>
        </div>

        {/* Détails du préchargement */}
        <div className="bg-gray-800 p-2 rounded">
          <div className="text-gray-300">Préchargée:</div>
          <div className="text-green-300 break-all">
            {preloadedVideoId ? `...${preloadedVideoId.slice(-8)}` : "Aucune"}
          </div>
        </div>

        {/* Prochaine chanson */}
        {nextSong && (
          <div className="bg-gray-800 p-2 rounded">
            <div className="text-gray-300">Prochaine:</div>
            <div className="text-purple-300 break-all">
              ...{nextSong.youtubeId.slice(-8)}
            </div>
            <div className="text-xs text-gray-400 truncate">
              {nextSong.title}
            </div>
          </div>
        )}

        {/* Performance de lecture */}
        {playPerformance && (
          <div className="bg-gray-800 p-2 rounded">
            <div className="text-gray-300">Dernière lecture:</div>
            <div
              className={`${
                playPerformance.type === "instant"
                  ? "text-green-400"
                  : "text-orange-400"
              } font-bold`}
            >
              {playPerformance.type === "instant" ? "⚡" : "⏱️"}{" "}
              {playPerformance.time}ms
            </div>
          </div>
        )}

        {/* Info jeu */}
        {gameSession && (
          <div className="bg-gray-800 p-2 rounded text-xs">
            <div className="text-gray-300">
              Question {gameSession.currentSongIndex + 1} /{" "}
              {gameSession.songs?.length || 0}
            </div>
          </div>
        )}
      </div>

      {/* Actions de test */}
      <div className="mt-3 pt-2 border-t border-gray-600">
        <button
          onClick={handlePlayClick}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white py-1 px-2 rounded text-xs"
        >
          🧪 Test Play Response
        </button>
      </div>
    </div>
  );
};
