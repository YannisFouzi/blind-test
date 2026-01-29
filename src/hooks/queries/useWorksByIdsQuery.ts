import { useQuery } from "@tanstack/react-query";
import { getWorksByIds } from "@/services/firebase/works";
import type { Work } from "@/types";

/**
 * Hook TanStack Query pour charger des œuvres par leurs IDs
 * (mode aléatoire multi : room.allowedWorks)
 *
 * @param workIds - Liste d'IDs d'œuvres
 * @returns Query result avec data, isLoading, error, etc.
 */
export const useWorksByIdsQuery = (workIds: string[]) => {
  const stableKey = [...workIds].sort().join(",");

  return useQuery<Work[], Error>({
    queryKey: ["works", "byIds", stableKey],
    queryFn: async () => {
      const result = await getWorksByIds(workIds);
      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to load works");
      }
      return result.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: workIds.length > 0,
    retry: 1,
  });
};
