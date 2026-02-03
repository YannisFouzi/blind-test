import { useQuery } from "@tanstack/react-query";
import { getWorksByIds } from "@/services/firebase/works.service";
import type { Work } from "@/types";

const STALE_TIME_MS = 5 * 60 * 1000;

const buildStableKey = (workIds: string[]) => [...workIds].sort().join(",");

export const useWorksByIdsQuery = (workIds: string[]) => {
  const stableKey = buildStableKey(workIds);

  return useQuery<Work[], Error>({
    queryKey: ["works", "byIds", stableKey],
    queryFn: async () => {
      const result = await getWorksByIds(workIds);
      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to load works");
      }
      return result.data;
    },
    staleTime: STALE_TIME_MS,
    enabled: workIds.length > 0,
    retry: 1,
  });
};
