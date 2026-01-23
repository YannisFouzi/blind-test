import { useCallback, useMemo, useState } from "react";
import { getWorksByUniverse, getSongsByWork, getAllWorks } from "@/services/firebase";
import type { Universe, Work } from "@/types";

// Univers virtuel pour le mode custom
export const CUSTOM_UNIVERSE: Universe = {
  id: "__custom__",
  name: "Mode Custom",
  description: "Sélectionnez jusqu'à 8 œuvres parmi tous les univers",
  color: "#8B5CF6",
  icon: "shuffle",
  createdAt: new Date(),
};

export const MAX_WORKS_CUSTOM_MODE = 8;

export interface UniverseCustomizationState {
  customizingUniverse: Universe | null;
  works: Work[];
  allowedWorks: string[];
  noSeek: boolean;
  maxSongs: number | null; // null = toutes les musiques
  songCountByWork: Record<string, number>; // workId -> nombre de songs
  loading: boolean;
  error: string | null;
  isCustomMode: boolean; // true si mode custom (toutes les œuvres)
}

export interface UseUniverseCustomizationReturn extends UniverseCustomizationState {
  totalSongsAvailable: number; // calculé à partir des allowedWorks
  maxWorksAllowed: number | null; // null = pas de limite, sinon limite en mode custom
  openCustomize: (universe: Universe) => Promise<void>;
  openCustomMode: () => Promise<void>; // Ouvre le mode custom avec toutes les œuvres
  closeCustomize: () => void;
  toggleWork: (workId: string) => void;
  setNoSeek: (value: boolean) => void;
  setMaxSongs: (value: number | null) => void;
  reset: () => void;
}

const initialState: UniverseCustomizationState = {
  customizingUniverse: null,
  works: [],
  allowedWorks: [],
  noSeek: false,
  maxSongs: null,
  songCountByWork: {},
  loading: false,
  error: null,
  isCustomMode: false,
};

export const useUniverseCustomization = (): UseUniverseCustomizationReturn => {
  const [state, setState] = useState<UniverseCustomizationState>(initialState);

  // Calcul du total de musiques disponibles basé sur les œuvres sélectionnées
  const totalSongsAvailable = useMemo(() => {
    return state.allowedWorks.reduce((total, workId) => {
      return total + (state.songCountByWork[workId] || 0);
    }, 0);
  }, [state.allowedWorks, state.songCountByWork]);

  // Limite d'œuvres : null en mode normal, MAX_WORKS_CUSTOM_MODE en mode custom
  const maxWorksAllowed = useMemo(() => {
    return state.isCustomMode ? MAX_WORKS_CUSTOM_MODE : null;
  }, [state.isCustomMode]);

  // Helper pour charger les counts de songs
  const loadSongCounts = useCallback(async (works: Work[]) => {
    const songCounts = await Promise.all(
      works.map(async (work) => {
        const songsResult = await getSongsByWork(work.id);
        const count = songsResult.success && songsResult.data ? songsResult.data.length : 0;
        return { workId: work.id, count };
      })
    );

    const songCountByWork: Record<string, number> = {};
    for (const { workId, count } of songCounts) {
      songCountByWork[workId] = count;
    }
    return songCountByWork;
  }, []);

  const openCustomize = useCallback(async (universe: Universe) => {
    setState({
      customizingUniverse: universe,
      works: [],
      allowedWorks: [],
      noSeek: false,
      maxSongs: null,
      songCountByWork: {},
      loading: true,
      error: null,
      isCustomMode: false,
    });

    try {
      const worksResult = await getWorksByUniverse(universe.id);
      if (worksResult.success && worksResult.data) {
        const works = worksResult.data;
        const songCountByWork = await loadSongCounts(works);

        setState((prev) => ({
          ...prev,
          works,
          allowedWorks: works.map((w) => w.id),
          songCountByWork,
          loading: false,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          works: [],
          allowedWorks: [],
          songCountByWork: {},
          loading: false,
        }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        works: [],
        allowedWorks: [],
        songCountByWork: {},
        loading: false,
        error: error instanceof Error ? error.message : "Erreur chargement oeuvres",
      }));
    }
  }, [loadSongCounts]);

  // Mode Custom : charge TOUTES les œuvres de tous les univers
  const openCustomMode = useCallback(async () => {
    setState({
      customizingUniverse: CUSTOM_UNIVERSE,
      works: [],
      allowedWorks: [],
      noSeek: false,
      maxSongs: null,
      songCountByWork: {},
      loading: true,
      error: null,
      isCustomMode: true,
    });

    try {
      const worksResult = await getAllWorks();
      if (worksResult.success && worksResult.data) {
        const works = worksResult.data;
        const songCountByWork = await loadSongCounts(works);

        setState((prev) => ({
          ...prev,
          works,
          allowedWorks: [], // Aucune œuvre sélectionnée par défaut en mode custom
          songCountByWork,
          loading: false,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          works: [],
          allowedWorks: [],
          songCountByWork: {},
          loading: false,
        }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        works: [],
        allowedWorks: [],
        songCountByWork: {},
        loading: false,
        error: error instanceof Error ? error.message : "Erreur chargement oeuvres",
      }));
    }
  }, [loadSongCounts]);

  const closeCustomize = useCallback(() => {
    setState((prev) => ({ ...prev, customizingUniverse: null }));
  }, []);

  const toggleWork = useCallback((workId: string) => {
    setState((prev) => {
      const isSelected = prev.allowedWorks.includes(workId);
      
      // Si on essaie d'ajouter et qu'on est en mode custom avec limite atteinte
      if (!isSelected && prev.isCustomMode && prev.allowedWorks.length >= MAX_WORKS_CUSTOM_MODE) {
        return prev; // Ne pas ajouter
      }

      return {
        ...prev,
        allowedWorks: isSelected
          ? prev.allowedWorks.filter((id) => id !== workId)
          : [...prev.allowedWorks, workId],
      };
    });
  }, []);

  const setNoSeek = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, noSeek: value }));
  }, []);

  const setMaxSongs = useCallback((value: number | null) => {
    setState((prev) => ({ ...prev, maxSongs: value }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    totalSongsAvailable,
    maxWorksAllowed,
    openCustomize,
    openCustomMode,
    closeCustomize,
    toggleWork,
    setNoSeek,
    setMaxSongs,
    reset,
  };
};
