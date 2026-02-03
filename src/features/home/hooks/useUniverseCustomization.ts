import { useCallback, useMemo, useState } from "react";
import { getAllWorks, getSongsByWork, getWorksByUniverse } from "@/services/firebase";
import type { Universe, Work } from "@/types";
import { CUSTOM_UNIVERSE_ID, MAX_WORKS_CUSTOM_MODE } from "@/constants/gameModes";

export const CUSTOM_UNIVERSE: Universe = {
  id: CUSTOM_UNIVERSE_ID,
  name: "Mode Custom",
  description: "Selectionnez jusqu'a 8 oeuvres parmi tous les univers",
  color: "#8B5CF6",
  icon: "shuffle",
  createdAt: new Date(),
};

export { MAX_WORKS_CUSTOM_MODE };

export interface UniverseCustomizationState {
  customizingUniverse: Universe | null;
  works: Work[];
  allowedWorks: string[];
  noSeek: boolean;
  maxSongs: number | null;
  songCountByWork: Record<string, number>;
  loading: boolean;
  error: string | null;
  isCustomMode: boolean;
}

export interface UseUniverseCustomizationReturn extends UniverseCustomizationState {
  totalSongsAvailable: number;
  maxWorksAllowed: number | null;
  openCustomize: (universe: Universe) => Promise<void>;
  openCustomMode: () => Promise<void>;
  closeCustomize: () => void;
  toggleWork: (workId: string) => void;
  setNoSeek: (value: boolean) => void;
  setMaxSongs: (value: number | null) => void;
  reset: () => void;
}

const INITIAL_STATE: UniverseCustomizationState = {
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

const buildSongCountByWork = (entries: Array<{ workId: string; count: number }>) => {
  return entries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.workId] = entry.count;
    return acc;
  }, {});
};

const loadSongCounts = async (works: Work[]) => {
  const songCounts = await Promise.all(
    works.map(async (work) => {
      const songsResult = await getSongsByWork(work.id);
      const count = songsResult.success && songsResult.data ? songsResult.data.length : 0;
      return { workId: work.id, count };
    })
  );

  return buildSongCountByWork(songCounts);
};

export const useUniverseCustomization = (): UseUniverseCustomizationReturn => {
  const [state, setState] = useState<UniverseCustomizationState>(INITIAL_STATE);

  const totalSongsAvailable = useMemo(() => {
    return state.allowedWorks.reduce((total, workId) => {
      return total + (state.songCountByWork[workId] || 0);
    }, 0);
  }, [state.allowedWorks, state.songCountByWork]);

  const maxWorksAllowed = useMemo(() => {
    return state.isCustomMode ? MAX_WORKS_CUSTOM_MODE : null;
  }, [state.isCustomMode]);

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
          allowedWorks: works.map((work) => work.id),
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
          allowedWorks: [],
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
    setState((prev) => {
      const isSelected = prev.allowedWorks.includes(workId);

      if (!isSelected && prev.isCustomMode && prev.allowedWorks.length >= MAX_WORKS_CUSTOM_MODE) {
        return prev;
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
    setState(INITIAL_STATE);
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
