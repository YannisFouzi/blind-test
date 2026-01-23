import { useCallback, useState } from "react";
import { getWorksByUniverse } from "@/services/firebase";
import type { Universe, Work } from "@/types";

export interface UniverseCustomizationState {
  customizingUniverse: Universe | null;
  works: Work[];
  allowedWorks: string[];
  noSeek: boolean;
  loading: boolean;
  error: string | null;
}

export interface UseUniverseCustomizationReturn extends UniverseCustomizationState {
  openCustomize: (universe: Universe) => Promise<void>;
  closeCustomize: () => void;
  toggleWork: (workId: string) => void;
  setNoSeek: (value: boolean) => void;
  reset: () => void;
}

const initialState: UniverseCustomizationState = {
  customizingUniverse: null,
  works: [],
  allowedWorks: [],
  noSeek: false,
  loading: false,
  error: null,
};

export const useUniverseCustomization = (): UseUniverseCustomizationReturn => {
  const [state, setState] = useState<UniverseCustomizationState>(initialState);

  const openCustomize = useCallback(async (universe: Universe) => {
    setState({
      customizingUniverse: universe,
      works: [],
      allowedWorks: [],
      noSeek: false,
      loading: true,
      error: null,
    });

    try {
      const worksResult = await getWorksByUniverse(universe.id);
      if (worksResult.success && worksResult.data) {
        setState((prev) => ({
          ...prev,
          works: worksResult.data!,
          allowedWorks: worksResult.data!.map((w) => w.id),
          loading: false,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          works: [],
          allowedWorks: [],
          loading: false,
        }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        works: [],
        allowedWorks: [],
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

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    openCustomize,
    closeCustomize,
    toggleWork,
    setNoSeek,
    reset,
  };
};
