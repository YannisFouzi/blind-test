import { useQuery } from "@tanstack/react-query";
import { getWorksByUniverse } from "@/services/firebase/works";
import { Work } from "@/types";

/**
 * Hook TanStack Query pour charger les works d'un univers
 *
 * Avantages :
 * - Cache automatique (évite les rechargements inutiles)
 * - Gestion du loading/error automatique
 * - Refetch automatique quand la fenêtre reprend le focus
 * - Retry automatique en cas d'erreur
 *
 * @param universeId - ID de l'univers
 * @returns Query result avec data, isLoading, error, etc.
 *
 * @example
 * const { data: works = [], isLoading, error } = useWorksQuery(universeId);
 */
export const useWorksQuery = (universeId: string) => {
  return useQuery<Work[], Error>({
    // Query key : identifiant unique pour le cache
    queryKey: ["works", universeId],

    // Query function : fonction async qui retourne les données
    queryFn: async () => {
      const result = await getWorksByUniverse(universeId);

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to load works");
      }

      return result.data;
    },

    // Options
    staleTime: 5 * 60 * 1000, // 5 minutes - les données restent "fresh" pendant 5min
    enabled: !!universeId, // Ne lance la query que si universeId est défini
    retry: 1, // Retry 1 fois en cas d'erreur
  });
};
