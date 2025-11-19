import { useCallback, useState } from "react";
import { ToastMessage } from "../components/debug/PreloadToast";

export const usePreloadDebug = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [performanceLog, setPerformanceLog] = useState<
    Array<{
      timestamp: number;
      action: string;
      data: unknown;
      performance?: number;
    }>
  >([]);

  // Ajouter un toast
  const addToast = useCallback(
    (
      type: ToastMessage["type"],
      title: string,
      message: string,
      duration?: number
    ) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const newToast: ToastMessage = {
        id,
        type,
        title,
        message,
        duration,
      };

      setToasts((prev) => [...prev, newToast]);

      // Log console avec emoji
      const emoji = {
        success: "✅",
        info: "ℹ️",
        warning: "⚠️",
        error: "❌",
      }[type];

      console.log(`🎵 ${emoji} ${title}:`, message);
    },
    []
  );

  // Supprimer un toast
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Logger une action avec performance
  const logAction = useCallback(
    (action: string, data: unknown, startTime?: number) => {
      const timestamp = Date.now();
      const performance = startTime ? timestamp - startTime : undefined;

      setPerformanceLog((prev) => [
        ...prev.slice(-19), // Garder seulement les 20 derniers logs
        {
          timestamp,
          action,
          data,
          performance,
        },
      ]);

      // Console log détaillé
      if (performance !== undefined) {
        console.log(`🎵 ⚡ ${action} (${performance}ms):`, data);
      } else {
        console.log(`🎵 📝 ${action}:`, data);
      }
    },
    []
  );

  // Méthodes spécifiques pour le préchargement
  const logPreloadStart = useCallback(
    (videoId: string) => {
      logAction("PRELOAD_START", { videoId });
      addToast(
        "info",
        "Préchargement démarré",
        `Vidéo: ...${videoId.slice(-8)}`,
        2000
      );
    },
    [addToast, logAction]
  );

  const logPreloadSuccess = useCallback(
    (videoId: string, startTime: number) => {
      const performance = Date.now() - startTime;
      logAction("PRELOAD_SUCCESS", { videoId }, startTime);
      addToast(
        "success",
        "Préchargement réussi",
        `Vidéo: ...${videoId.slice(-8)} (${performance}ms)`,
        2000
      );
    },
    [addToast, logAction]
  );

  const logPreloadError = useCallback(
    (videoId: string, error: unknown) => {
      logAction("PRELOAD_ERROR", { videoId, error });
      addToast(
        "error",
        "Échec du préchargement",
        `Vidéo: ...${videoId.slice(-8)}`,
        3000
      );
    },
    [addToast, logAction]
  );

  const logPlayStart = useCallback(
    (videoId: string, isPreloaded: boolean) => {
      const startTime = Date.now();
      logAction("PLAY_START", { videoId, isPreloaded });

      if (isPreloaded) {
        addToast(
          "success",
          "Lecture instantanée !",
          `Vidéo préchargée: ...${videoId.slice(-8)}`,
          1500
        );
      } else {
        addToast(
          "warning",
          "Chargement nécessaire",
          `Vidéo: ...${videoId.slice(-8)}`,
          2000
        );
      }

      return startTime;
    },
    [addToast, logAction]
  );

  const logPlaySuccess = useCallback(
    (videoId: string, startTime: number, wasPreloaded: boolean) => {
      const performance = Date.now() - startTime;
      logAction("PLAY_SUCCESS", { videoId, wasPreloaded }, startTime);

      const emoji = wasPreloaded ? "⚡" : "⏱️";
      const type = performance < 500 ? "success" : "warning";

      addToast(
        type,
        `${emoji} Lecture démarrée`,
        `Temps de réponse: ${performance}ms`,
        2000
      );
    },
    [addToast, logAction]
  );

  const logSongChange = useCallback(
    (fromVideoId: string | null, toVideoId: string, isPreloaded: boolean) => {
      logAction("SONG_CHANGE", { fromVideoId, toVideoId, isPreloaded });

      if (isPreloaded) {
        addToast(
          "info",
          "🎵 Changement de musique",
          "Vidéo déjà préchargée !",
          1500
        );
      } else {
        addToast(
          "warning",
          "🎵 Changement de musique",
          "Préchargement nécessaire",
          2000
        );
      }
    },
    [addToast, logAction]
  );

  return {
    // État
    toasts,
    performanceLog,

    // Actions génériques
    addToast,
    removeToast,
    logAction,

    // Actions spécifiques
    logPreloadStart,
    logPreloadSuccess,
    logPreloadError,
    logPlayStart,
    logPlaySuccess,
    logSongChange,
  };
};
