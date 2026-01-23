import { useCallback, useMemo, useState } from "react";
import { getWorksByUniverse, getSongsByWork } from "@/services/firebase";
import type { Universe, Work } from "@/types";

export interface UniverseCustomizationState {
  customizingUniverse: Universe | null;
  works: Work[];
  allowedWorks: string[];
  noSeek: boolean;
  maxSongs: number | null; // null = toutes les musiques
  songCountByWork: Record<string, number>; // workId -> nombre de songs
  loading: boolean;
  error: string | null;
}

export interface UseUniverseCustomizationReturn extends UniverseCustomizationState {
  totalSongsAvailable: number; // calculé à partir des allowedWorks
  openCustomize: (universe: Universe) => Promise<void>;
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
};

export const useUniverseCustomization = (): UseUniverseCustomizationReturn => {
  const [state, setState] = useState<UniverseCustomizationState>(initialState);

  // Calcul du total de musiques disponibles basé sur les œuvres sélectionnées
  const totalSongsAvailable = useMemo(() => {
    return state.allowedWorks.reduce((total, workId) => {
      return total + (state.songCountByWork[workId] || 0);
    }, 0);
  }, [state.allowedWorks, state.songCountByWork]);

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
    });

    try {
      const worksResult = await getWorksByUniverse(universe.id);
      if (worksResult.success && worksResult.data) {
        const works = worksResult.data;
        
        // Charger le nombre de songs pour chaque work en parallèle
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
  }, []);

  const closeCustomize = useCallback(() => {
    setState((prev) => ({ ...prev, customizingUniverse: null }));
  }, []);

  const toggleWork = useCallback((workId: string) => {
    setState((prev) => ({
      ...prev,
      allowedWorks: prev.allowedWorks.includes(workId)
        ? prev.allowedWorks.filter((id) => id !== workId)
        : [...prev.allowedWorks, workId],
    }));
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
    openCustomize,
    closeCustomize,
    toggleWork,
    setNoSeek,
    setMaxSongs,
    reset,
  };
};
