import { useCallback, useState } from "react";
import { ToastMessage } from "../components/debug/PreloadToast";

const isPreloadDebugEnabled =
  process.env.NEXT_PUBLIC_PRELOAD_DEBUG === "true" ||
  process.env.NODE_ENV === "development";

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

  const addToast = useCallback(
    (
      type: ToastMessage["type"],
      title: string,
      message: string,
      duration?: number
    ) => {
      if (!isPreloadDebugEnabled) return;

      const id = `toast-${Date.now()}-${Math.random()}`;
      const newToast: ToastMessage = {
        id,
        type,
        title,
        message,
        duration,
      };

      setToasts((prev) => [...prev, newToast]);

      const emoji = {
        success: "✅",
        info: "ℹ️",
        warning: "⚠️",
        error: "❌",
      }[type];

      console.log(`[Preload] ${emoji} ${title}:`, message);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    if (!isPreloadDebugEnabled) return;
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const logAction = useCallback(
    (action: string, data: unknown, startTime?: number) => {
      if (!isPreloadDebugEnabled) return;

      const timestamp = Date.now();
      const performance = startTime ? timestamp - startTime : undefined;

      setPerformanceLog((prev) => [
        ...prev.slice(-19),
        { timestamp, action, data, performance },
      ]);

      if (performance !== undefined) {
        console.log(`[Preload] ${action} (${performance}ms):`, data);
      } else {
        console.log(`[Preload] ${action}:`, data);
      }
    },
    []
  );

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

      if (isPreloadDebugEnabled) {
        addToast(
          isPreloaded ? "success" : "warning",
          isPreloaded ? "Lecture instantanée" : "Chargement nécessaire",
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

      addToast(
        performance < 500 ? "success" : "warning",
        wasPreloaded ? "Lecture instantanée" : "Lecture démarrée",
        `Temps de réponse: ${performance}ms`,
        2000
      );
    },
    [addToast, logAction]
  );

  const logSongChange = useCallback(
    (fromVideoId: string | null, toVideoId: string, isPreloaded: boolean) => {
      logAction("SONG_CHANGE", { fromVideoId, toVideoId, isPreloaded });

      addToast(
        isPreloaded ? "info" : "warning",
        "Changement de musique",
        isPreloaded ? "Vidéo déjà préchargée" : "Préchargement nécessaire",
        2000
      );
    },
    [addToast, logAction]
  );

  return {
    toasts: isPreloadDebugEnabled ? toasts : [],
    performanceLog: isPreloadDebugEnabled ? performanceLog : [],
    addToast,
    removeToast,
    logAction,
    logPreloadStart,
    logPreloadSuccess,
    logPreloadError,
    logPlayStart,
    logPlaySuccess,
    logSongChange,
  };
};
