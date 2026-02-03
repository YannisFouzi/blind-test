import type { User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ADMIN_EMAIL } from "@/lib/firebase";
import type { Song, Universe, Work } from "@/types";
import {
  addSong as createSong,
  addUniverse as createUniverse,
  addWork as createWork,
  deleteSong as removeSong,
  deleteUniverse as removeUniverse,
  deleteWork as removeWork,
  getSongsByWork,
  getUniverses,
  getWorksByUniverse,
  reorderWorks as reorderWorksMutation,
  updateSong as patchSong,
  updateUniverse as patchUniverse,
  updateWork as patchWork,
} from "@/services/firebase";
import { AudioIngestionService } from "@/services/audio/audioIngestion.service";
import { YouTubeService } from "@/services/youtube/youtube.service";

const PENDING_IMPORT_STORAGE_KEY = "bt_pending_import_job";

type PendingImportJob = { workId: string; jobId: string };

type ImportSummary = {
  imported: number;
  skipped: number;
  message: string;
};

interface AdminState {
  universes: Universe[];
  works: Work[];
  songs: Song[];
  loading: boolean;
  error: string | null;
  success: string | null;
  pendingImportJob: PendingImportJob | null;
}

const getImportSummary = (ingestionResult: {
  songs?: Array<unknown>;
  firestoreWrites?: number;
}): ImportSummary => {
  const importedCount = ingestionResult.songs?.length ?? 0;
  const firestoreWrites = ingestionResult.firestoreWrites ?? importedCount;
  const skipped = importedCount - firestoreWrites;
  const message =
    `Import termine ! ${firestoreWrites} chanson(s) ajoutee(s) en base de donnees.`;

  return { imported: firestoreWrites, skipped, message };
};

export const useAdmin = (user: User | null) => {
  const router = useRouter();
  const [state, setState] = useState<AdminState>({
    universes: [],
    works: [],
    songs: [],
    loading: false,
    error: null,
    success: null,
    pendingImportJob: null,
  });

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (user && !isAdmin) {
      router.push("/");
    }
  }, [user, isAdmin, router]);

  const setLoading = (loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  };

  const setError = (error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  };

  const setSuccess = (success: string | null) => {
    setState((prev) => ({ ...prev, success }));
  };

  const setPendingImportJob = (job: PendingImportJob | null) => {
    setState((prev) => ({ ...prev, pendingImportJob: job }));

    if (typeof window === "undefined") {
      return;
    }

    if (job) {
      localStorage.setItem(PENDING_IMPORT_STORAGE_KEY, JSON.stringify(job));
    } else {
      localStorage.removeItem(PENDING_IMPORT_STORAGE_KEY);
    }
  };

  const clearMessages = () => {
    setState((prev) => ({ ...prev, error: null, success: null }));
  };

  const loadUniverses = useCallback(async () => {
    setLoading(true);
    clearMessages();

    const result = await getUniverses();
    if (result.success) {
      setState((prev) => ({ ...prev, universes: result.data ?? [] }));
    } else {
      setError(result.error || "Erreur lors du chargement des univers");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadUniverses();
    }
  }, [isAdmin, loadUniverses]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem(PENDING_IMPORT_STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as PendingImportJob;
      if (parsed?.workId && parsed?.jobId) {
        setState((prev) => ({ ...prev, pendingImportJob: parsed }));
      }
    } catch {
      localStorage.removeItem(PENDING_IMPORT_STORAGE_KEY);
    }
  }, []);

  const addUniverse = async (universeData: Omit<Universe, "id" | "createdAt">) => {
    setLoading(true);
    clearMessages();

    const result = await createUniverse(universeData);
    if (result.success) {
      setSuccess("Univers cree avec succes !");
      loadUniverses();
    } else {
      setError(result.error || "Erreur lors de la creation de l'univers");
    }

    setLoading(false);
    return result;
  };

  const updateUniverse = async (id: string, updates: Partial<Universe>) => {
    setLoading(true);
    clearMessages();

    const result = await patchUniverse(id, updates);
    if (result.success) {
      setSuccess("Univers mis a jour avec succes !");
      loadUniverses();
    } else {
      setError(result.error || "Erreur lors de la mise a jour de l'univers");
    }

    setLoading(false);
    return result;
  };

  const deleteUniverse = async (id: string) => {
    setLoading(true);
    clearMessages();

    const result = await removeUniverse(id);
    if (result.success) {
      setSuccess("Univers supprime avec succes !");
      loadUniverses();
    } else {
      setError(result.error || "Erreur lors de la suppression de l'univers");
    }

    setLoading(false);
    return result;
  };

  const loadWorks = async (universeId: string) => {
    setLoading(true);
    clearMessages();

    const result = await getWorksByUniverse(universeId);
    if (result.success) {
      setState((prev) => ({ ...prev, works: result.data ?? [] }));
    } else {
      setError(result.error || "Erreur lors du chargement des oeuvres");
    }

    setLoading(false);
  };

  const addWork = async (workData: Omit<Work, "id" | "createdAt">) => {
    setLoading(true);
    clearMessages();

    if (workData.playlistId) {
      const validation = await YouTubeService.getPlaylistInfo(workData.playlistId);
      if (!validation.success) {
        setError("Playlist YouTube invalide : " + validation.error);
        setLoading(false);
        return { success: false, error: validation.error };
      }
    }

    const result = await createWork(workData);
    if (result.success) {
      setSuccess("Oeuvre creee avec succes !");
      loadWorks(workData.universeId);
    } else {
      setError(result.error || "Erreur lors de la creation de l'oeuvre");
    }

    setLoading(false);
    return result;
  };

  const updateWork = async (id: string, updates: Partial<Work>) => {
    setLoading(true);
    clearMessages();

    const result = await patchWork(id, updates);
    if (result.success) {
      setSuccess("Oeuvre mise a jour avec succes !");
      const currentWork = state.works.find((work) => work.id === id);
      if (currentWork) {
        loadWorks(currentWork.universeId);
      }
    } else {
      setError(result.error || "Erreur lors de la mise a jour de l'oeuvre");
    }

    setLoading(false);
    return result;
  };

  const deleteWork = async (id: string) => {
    setLoading(true);
    clearMessages();

    const result = await removeWork(id);
    if (result.success) {
      setSuccess("Oeuvre supprimee avec succes !");
      const currentWork = state.works.find((work) => work.id === id);
      if (currentWork) {
        loadWorks(currentWork.universeId);
      }
    } else {
      setError(result.error || "Erreur lors de la suppression de l'oeuvre");
    }

    setLoading(false);
    return result;
  };

  const reorderWorks = async (works: Array<{ id: string; order: number }>) => {
    setLoading(true);
    clearMessages();

    const result = await reorderWorksMutation(works);
    if (result.success) {
      setSuccess("Ordre des oeuvres mis a jour avec succes !");
      const firstWork = state.works[0];
      if (firstWork) {
        loadWorks(firstWork.universeId);
      }
    } else {
      setError(result.error || "Erreur lors de la reorganisation des oeuvres");
    }

    setLoading(false);
    return result;
  };

  const loadSongs = async (workId: string) => {
    setLoading(true);
    clearMessages();

    const result = await getSongsByWork(workId);
    if (result.success) {
      setState((prev) => ({ ...prev, songs: result.data ?? [] }));
    } else {
      setError(result.error || "Erreur lors du chargement des chansons");
    }

    setLoading(false);
  };

  const addSong = async (songData: Omit<Song, "id" | "createdAt">) => {
    setLoading(true);
    clearMessages();

    const validation = await YouTubeService.validateVideo(
      `https://www.youtube.com/watch?v=${songData.youtubeId}`
    );
    if (!validation.isValid) {
      setError("Video YouTube invalide : " + validation.error);
      setLoading(false);
      return { success: false, error: validation.error };
    }

    const result = await createSong(songData);
    if (result.success) {
      setSuccess("Chanson ajoutee avec succes !");
      loadSongs(songData.workId);
    } else {
      setError(result.error || "Erreur lors de l'ajout de la chanson");
    }

    setLoading(false);
    return result;
  };

  const updateSong = async (id: string, updates: Partial<Song>) => {
    setLoading(true);
    clearMessages();

    const result = await patchSong(id, updates);
    if (result.success) {
      setSuccess("Chanson mise a jour avec succes !");
      const currentSong = state.songs.find((song) => song.id === id);
      if (currentSong) {
        loadSongs(currentSong.workId);
      }
    } else {
      setError(result.error || "Erreur lors de la mise a jour de la chanson");
    }

    setLoading(false);
    return result;
  };

  const deleteSong = async (id: string) => {
    setLoading(true);
    clearMessages();

    const result = await removeSong(id);
    if (result.success) {
      setSuccess("Chanson supprimee avec succes !");
      const currentSong = state.songs.find((song) => song.id === id);
      if (currentSong) {
        loadSongs(currentSong.workId);
      }
    } else {
      setError(result.error || "Erreur lors de la suppression de la chanson");
    }

    setLoading(false);
    return result;
  };

  const validateYouTubeUrl = async (url: string, type: "video" | "playlist") => {
    if (type === "video") {
      return await YouTubeService.validateVideo(url);
    }
    return await YouTubeService.validatePlaylist(url);
  };

  const extractYouTubeId = (url: string, type: "video" | "playlist") => {
    if (type === "video") {
      return YouTubeService.extractVideoId(url);
    }
    return YouTubeService.extractPlaylistId(url);
  };

  const importSongsFromPlaylist = async (workId: string, playlistId: string) => {
    console.log("[useAdmin] importSongsFromPlaylist appele");
    console.log("[useAdmin] workId:", workId, "playlistId:", playlistId);

    setLoading(true);
    clearMessages();

    try {
      console.log("[useAdmin] Appel AudioIngestionService.importPlaylist");
      const ingestionResult = await AudioIngestionService.importPlaylist(
        workId,
        playlistId
      );

      console.log("[useAdmin] Resultat ingestion:", ingestionResult);

      if (!ingestionResult.success) {
        console.error("[useAdmin] Echec de l'ingestion:", ingestionResult.error);

        const jobStatus = "status" in ingestionResult ? ingestionResult.status : undefined;
        const jobId = "jobId" in ingestionResult ? ingestionResult.jobId : undefined;

        if (jobStatus === "timeout" && jobId) {
          setPendingImportJob({ workId, jobId });
          setError(
            `Import en cours cote serveur (jobId: ${jobId}). ` +
              "Reessayez dans quelques minutes pour voir les resultats."
          );
        } else {
          setError(
            ingestionResult.error ||
              "Erreur lors du traitement audio de la playlist"
          );
        }

        setLoading(false);
        return { success: false, error: ingestionResult.error };
      }

      if (state.pendingImportJob?.workId === workId) {
        setPendingImportJob(null);
      }

      const { imported, skipped, message } = getImportSummary(ingestionResult);

      console.log("[useAdmin] Import reussi:", message);
      setSuccess(message);
      loadSongs(workId);

      return {
        success: true,
        imported,
        skipped,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erreur inconnue";
      console.error("[useAdmin] Exception:", error);
      setError("Erreur lors de l'import des chansons : " + errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const resumeImportFromJob = async (workId: string, jobId: string) => {
    console.log("[useAdmin] resumeImportFromJob:", jobId);
    setLoading(true);
    clearMessages();

    try {
      const ingestionResult = await AudioIngestionService.resumeImport(jobId);
      console.log("[useAdmin] Resultat reprise ingestion:", ingestionResult);

      if (!ingestionResult.success) {
        const jobStatus = "status" in ingestionResult ? ingestionResult.status : undefined;

        if (jobStatus === "timeout") {
          setError(
            "Import toujours en cours cote serveur. Reessayez dans quelques minutes."
          );
        } else {
          setError(
            ingestionResult.error || "Erreur lors de la reprise de l'import audio."
          );
        }
        return { success: false, error: ingestionResult.error };
      }

      setPendingImportJob(null);

      const { imported, skipped, message } = getImportSummary(ingestionResult);

      setSuccess(message);
      loadSongs(workId);

      return {
        success: true,
        imported,
        skipped,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erreur inconnue";
      setError("Erreur lors de la reprise : " + errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return {
    ...state,
    isAdmin,
    clearMessages,
    loadUniverses,
    addUniverse,
    updateUniverse,
    deleteUniverse,
    loadWorks,
    addWork,
    updateWork,
    deleteWork,
    reorderWorks,
    loadSongs,
    addSong,
    updateSong,
    deleteSong,
    validateYouTubeUrl,
    extractYouTubeId,
    importSongsFromPlaylist,
    resumeImportFromJob,
  };
};
