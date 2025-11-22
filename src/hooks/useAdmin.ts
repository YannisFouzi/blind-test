import { User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ADMIN_EMAIL } from "@/lib/firebase";
import { Song, Universe, Work } from "@/types";
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
  importSongsFromPlaylist as importSongsIntoFirestore,
  reorderWorks as reorderWorksMutation,
  updateSong as patchSong,
  updateUniverse as patchUniverse,
  updateWork as patchWork,
} from "@/services/firebase";
import { YouTubeService } from "@/services/youtubeService";
import { AudioIngestionService } from "@/services/audioIngestion";

interface AdminState {
  universes: Universe[];
  works: Work[];
  songs: Song[];
  loading: boolean;
  error: string | null;
  success: string | null;
}

export const useAdmin = (user: User | null) => {
  const router = useRouter();
  const [state, setState] = useState<AdminState>({
    universes: [],
    works: [],
    songs: [],
    loading: false,
    error: null,
    success: null,
  });

  // Vérification des droits admin
  const isAdmin = user?.email === ADMIN_EMAIL;

  // Redirection si non admin
  useEffect(() => {
    if (user && !isAdmin) {
      router.push("/");
    }
  }, [user, isAdmin, router]);

  // Utilitaires pour gérer l'état
  const setLoading = (loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  };

  const setError = (error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  };

  const setSuccess = (success: string | null) => {
    setState((prev) => ({ ...prev, success }));
  };

  const clearMessages = () => {
    setState((prev) => ({ ...prev, error: null, success: null }));
  };

  // Gestion des univers
  const loadUniverses = useCallback(async () => {
    setLoading(true);
    clearMessages();

    const result = await getUniverses();
    if (result.success && result.data) {
      setState((prev) => ({ ...prev, universes: result.data! }));
    } else {
      setError(result.error || "Erreur lors du chargement des univers");
    }

    setLoading(false);
  }, []);

  // Chargement initial des données
  useEffect(() => {
    if (isAdmin) {
      loadUniverses();
    }
  }, [isAdmin, loadUniverses]);

  const addUniverse = async (
    universeData: Omit<Universe, "id" | "createdAt">
  ) => {
    setLoading(true);
    clearMessages();

    const result = await createUniverse(universeData);
    if (result.success) {
      setSuccess("Univers créé avec succès !");
      loadUniverses(); // Rechargement des données
    } else {
      setError(result.error || "Erreur lors de la création de l'univers");
    }

    setLoading(false);
    return result;
  };

  const updateUniverse = async (id: string, updates: Partial<Universe>) => {
    setLoading(true);
    clearMessages();

    const result = await patchUniverse(id, updates);
    if (result.success) {
      setSuccess("Univers mis à jour avec succès !");
      loadUniverses(); // Rechargement des données
    } else {
      setError(result.error || "Erreur lors de la mise à jour de l'univers");
    }

    setLoading(false);
    return result;
  };

  const deleteUniverse = async (id: string) => {
    setLoading(true);
    clearMessages();

    const result = await removeUniverse(id);
    if (result.success) {
      setSuccess("Univers supprimé avec succès !");
      loadUniverses(); // Rechargement des données
    } else {
      setError(result.error || "Erreur lors de la suppression de l'univers");
    }

    setLoading(false);
    return result;
  };

  // Gestion des œuvres
  const loadWorks = async (universeId: string) => {
    setLoading(true);
    clearMessages();

    const result = await getWorksByUniverse(universeId);
    if (result.success && result.data) {
      setState((prev) => ({ ...prev, works: result.data! }));
    } else {
      setError(result.error || "Erreur lors du chargement des œuvres");
    }

    setLoading(false);
  };

  const addWork = async (workData: Omit<Work, "id" | "createdAt">) => {
    setLoading(true);
    clearMessages();

    // Validation de la playlist YouTube si fournie
    if (workData.playlistId) {
      const validation = await YouTubeService.getPlaylistInfo(
        workData.playlistId
      );
      if (!validation.success) {
        setError("Playlist YouTube invalide : " + validation.error);
        setLoading(false);
        return { success: false, error: validation.error };
      }
    }

    const result = await createWork(workData);
    if (result.success) {
      setSuccess("Œuvre créée avec succès !");
      loadWorks(workData.universeId); // Rechargement des données
    } else {
      setError(result.error || "Erreur lors de la création de l'œuvre");
    }

    setLoading(false);
    return result;
  };

  const updateWork = async (id: string, updates: Partial<Work>) => {
    setLoading(true);
    clearMessages();

    const result = await patchWork(id, updates);
    if (result.success) {
      setSuccess("Œuvre mise à jour avec succès !");
      // Rechargement des œuvres pour l'univers concerné
      const currentWork = state.works.find((w) => w.id === id);
      if (currentWork) {
        loadWorks(currentWork.universeId);
      }
    } else {
      setError(result.error || "Erreur lors de la mise à jour de l'œuvre");
    }

    setLoading(false);
    return result;
  };

  const deleteWork = async (id: string) => {
    setLoading(true);
    clearMessages();

    const result = await removeWork(id);
    if (result.success) {
      setSuccess("Œuvre supprimée avec succès !");
      // Rechargement des œuvres pour l'univers concerné
      const currentWork = state.works.find((w) => w.id === id);
      if (currentWork) {
        loadWorks(currentWork.universeId);
      }
    } else {
      setError(result.error || "Erreur lors de la suppression de l'œuvre");
    }

    setLoading(false);
    return result;
  };

  const reorderWorks = async (works: Array<{ id: string; order: number }>) => {
    setLoading(true);
    clearMessages();

    const result = await reorderWorksMutation(works);
    if (result.success) {
      setSuccess("Ordre des œuvres mis à jour avec succès !");
      // Rechargement des œuvres
      const firstWork = state.works[0];
      if (firstWork) {
        loadWorks(firstWork.universeId);
      }
    } else {
      setError(result.error || "Erreur lors de la réorganisation des œuvres");
    }

    setLoading(false);
    return result;
  };

  // Gestion des chansons
  const loadSongs = async (workId: string) => {
    setLoading(true);
    clearMessages();

    const result = await getSongsByWork(workId);
    if (result.success && result.data) {
      setState((prev) => ({ ...prev, songs: result.data! }));
    } else {
      setError(result.error || "Erreur lors du chargement des chansons");
    }

    setLoading(false);
  };

  const addSong = async (songData: Omit<Song, "id" | "createdAt">) => {
    setLoading(true);
    clearMessages();

    // Validation de la vidéo YouTube
    const validation = await YouTubeService.validateVideo(
      `https://www.youtube.com/watch?v=${songData.youtubeId}`
    );
    if (!validation.isValid) {
      setError("Vidéo YouTube invalide : " + validation.error);
      setLoading(false);
      return { success: false, error: validation.error };
    }

    const result = await createSong(songData);
    if (result.success) {
      setSuccess("Chanson ajoutée avec succès !");
      loadSongs(songData.workId); // Rechargement des données
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
      setSuccess("Chanson mise à jour avec succès !");
      // Rechargement des chansons pour l'œuvre concernée
      const currentSong = state.songs.find((s) => s.id === id);
      if (currentSong) {
        loadSongs(currentSong.workId);
      }
    } else {
      setError(result.error || "Erreur lors de la mise à jour de la chanson");
    }

    setLoading(false);
    return result;
  };

  const deleteSong = async (id: string) => {
    setLoading(true);
    clearMessages();

    const result = await removeSong(id);
    if (result.success) {
      setSuccess("Chanson supprimée avec succès !");
      // Rechargement des chansons pour l'œuvre concernée
      const currentSong = state.songs.find((s) => s.id === id);
      if (currentSong) {
        loadSongs(currentSong.workId);
      }
    } else {
      setError(result.error || "Erreur lors de la suppression de la chanson");
    }

    setLoading(false);
    return result;
  };

  // Utilitaires YouTube
  const validateYouTubeUrl = async (
    url: string,
    type: "video" | "playlist"
  ) => {
    if (type === "video") {
      return await YouTubeService.validateVideo(url);
    } else {
      return await YouTubeService.validatePlaylist(url);
    }
  };

  const extractYouTubeId = (url: string, type: "video" | "playlist") => {
    if (type === "video") {
      return YouTubeService.extractVideoId(url);
    } else {
      return YouTubeService.extractPlaylistId(url);
    }
  };

  // Import automatique des chansons depuis une playlist
  const importSongsFromPlaylist = async (
    workId: string,
    playlistId: string
  ) => {
    console.log("🎬 [useAdmin] importSongsFromPlaylist appelé");
    console.log("📋 [useAdmin] workId:", workId, "playlistId:", playlistId);

    setLoading(true);
    clearMessages();

    try {
      console.log("🔄 [useAdmin] Appel AudioIngestionService.importPlaylist");
      const ingestionResult = await AudioIngestionService.importPlaylist(
        workId,
        playlistId
      );

      console.log("📦 [useAdmin] Résultat ingestion:", ingestionResult);

      if (!ingestionResult.success || !ingestionResult.songs) {
        console.error("❌ [useAdmin] Échec de l'ingestion:", ingestionResult.error);
        setError(
          ingestionResult.error ||
            "Erreur lors du traitement audio de la playlist"
        );
        setLoading(false);
        return { success: false, error: ingestionResult.error };
      }

      console.log("🔄 [useAdmin] Import dans Firestore...");
      const importResult = await importSongsIntoFirestore(
        workId,
        ingestionResult.songs
      );

      console.log("📦 [useAdmin] Résultat Firestore:", importResult);

      if (importResult.success) {
        const stats = importResult.data;
        const message = `Import terminé ! ${
          stats?.imported ?? 0
        } chanson(s) ajoutée(s)${
          stats?.skipped
            ? `, ${stats.skipped} ignorée(s) (déjà existante(s))`
            : ""
        }.`;

        console.log("✅ [useAdmin] Import réussi:", message);
        setSuccess(message);
        loadSongs(workId);

        return {
          success: true,
          imported: stats?.imported,
          skipped: stats?.skipped,
          errors: stats?.errors,
        };
      } else {
        console.error("❌ [useAdmin] Échec import Firestore:", importResult.error);
        setError("Erreur lors de l'import : " + importResult.error);
        return { success: false, error: importResult.error };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erreur inconnue";
      console.error("❌ [useAdmin] Exception:", error);
      setError("Erreur lors de l'import des chansons : " + errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return {
    // État
    ...state,
    isAdmin,

    // Actions générales
    clearMessages,

    // Actions univers
    loadUniverses,
    addUniverse,
    updateUniverse,
    deleteUniverse,

    // Actions œuvres
    loadWorks,
    addWork,
    updateWork,
    deleteWork,
    reorderWorks,

    // Actions chansons
    loadSongs,
    addSong,
    updateSong,
    deleteSong,

    // Utilitaires YouTube
    validateYouTubeUrl,
    extractYouTubeId,

    // Import automatique
    importSongsFromPlaylist,
  };
};
