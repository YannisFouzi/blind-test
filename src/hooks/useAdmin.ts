import { User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Song, Universe, Work } from "../../types";
import { FirebaseService } from "../services/firebaseService";
import { YouTubeService } from "../services/youtubeService";

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
  const isAdmin = user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;

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

    const result = await FirebaseService.getUniverses();
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

    const result = await FirebaseService.addUniverse(universeData);
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

    const result = await FirebaseService.updateUniverse(id, updates);
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

    const result = await FirebaseService.deleteUniverse(id);
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

    const result = await FirebaseService.getWorksByUniverse(universeId);
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

    const result = await FirebaseService.addWork(workData);
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

    const result = await FirebaseService.updateWork(id, updates);
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

    const result = await FirebaseService.deleteWork(id);
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

    const result = await FirebaseService.reorderWorks(works);
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

    const result = await FirebaseService.getSongsByWork(workId);
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

    const result = await FirebaseService.addSong(songData);
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

    const result = await FirebaseService.updateSong(id, updates);
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

    const result = await FirebaseService.deleteSong(id);
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
    setLoading(true);
    clearMessages();

    try {
      // 1. Récupérer les chansons de la playlist YouTube
      const playlistResult = await YouTubeService.importPlaylistSongs(
        playlistId
      );

      if (!playlistResult.success || !playlistResult.songs) {
        setError(
          "Erreur lors de la récupération de la playlist : " +
            playlistResult.error
        );
        setLoading(false);
        return { success: false, error: playlistResult.error };
      }

      // 2. Importer les chansons dans Firebase
      const importResult = await FirebaseService.importSongsFromPlaylist(
        workId,
        playlistResult.songs
      );

      if (importResult.success) {
        const message = `Import terminé ! ${
          importResult.imported || 0
        } chanson(s) ajoutée(s)${
          importResult.skipped
            ? `, ${importResult.skipped} ignorée(s) (déjà existante(s))`
            : ""
        }.`;

        setSuccess(message);

        // Recharger les chansons
        loadSongs(workId);

        return {
          success: true,
          imported: importResult.imported,
          skipped: importResult.skipped,
          errors: importResult.errors,
        };
      } else {
        setError("Erreur lors de l'import : " + importResult.error);
        return { success: false, error: importResult.error };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erreur inconnue";
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
