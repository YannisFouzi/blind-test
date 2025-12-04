import { useQuery } from "@tanstack/react-query";
import { getSongsByWork } from "@/services/firebase/songs";
import { Song } from "@/types";

/**
 * Hook TanStack Query pour charger les songs de plusieurs works
 *
 * Charge les songs pour tous les workIds fournis en parallèle
 * et retourne la liste complète des songs
 *
 * Avantages :
 * - Cache automatique par work
 * - Chargement en parallèle de tous les works
 * - Gestion automatique du loading/error
 *
 * @param workIds - Liste des IDs de works
 * @returns Query result avec data (liste de tous les songs), isLoading, error, etc.
 *
 * @example
 * const workIds = ["work1", "work2", "work3"];
 * const { data: songs = [], isLoading, error } = useSongsQuery(workIds);
 */
export const useSongsQuery = (workIds: string[]) => {
  return useQuery<Song[], Error>({
    // Query key : inclut tous les workIds pour un cache précis
    queryKey: ["songs", ...workIds.sort()], // Sort pour avoir une clé stable

    // Query function : charge les songs de tous les works en parallèle
    queryFn: async () => {
      // Charger tous les works en parallèle
      const promises = workIds.map((workId) => getSongsByWork(workId));
      const results = await Promise.all(promises);

      // Combiner tous les songs dans une seule liste
      const allSongs: Song[] = [];
      for (const result of results) {
        if (result.success && result.data) {
          allSongs.push(...result.data);
        } else {
          // Si un des appels échoue, on logue mais on continue
          console.warn(`Failed to load songs for a work:`, result.error);
        }
      }

      return allSongs;
    },

    // Options
    staleTime: 5 * 60 * 1000, // 5 minutes - les songs changent rarement
    enabled: workIds.length > 0, // Ne lance la query que s'il y a des workIds
    retry: 1, // Retry 1 fois en cas d'erreur
  });
};
