import { useEffect, useState } from "react";
import { Universe } from "../../types";
import { FirebaseService } from "../services/firebaseService";

interface UniversesState {
  universes: Universe[];
  loading: boolean;
  error: string | null;
}

export const useUniverses = () => {
  const [state, setState] = useState<UniversesState>({
    universes: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    loadUniverses();
  }, []);

  const loadUniverses = async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const result = await FirebaseService.getActiveUniverses();
      if (result.success && result.data) {
        setState({
          universes: result.data,
          loading: false,
          error: null,
        });
      } else {
        setState({
          universes: [],
          loading: false,
          error: result.error || "Erreur lors du chargement des univers",
        });
      }
    } catch (error) {
      setState({
        universes: [],
        loading: false,
        error: "Erreur lors du chargement des univers",
      });
    }
  };

  return {
    ...state,
    refetch: loadUniverses,
  };
};
