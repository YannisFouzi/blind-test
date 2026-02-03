import { useQuery } from "@tanstack/react-query";
import { getWorksByUniverse } from "@/services/firebase/works.service";
import type { Work } from "@/types";

const STALE_TIME_MS = 5 * 60 * 1000;

export const useWorksQuery = (universeId: string) =>
  useQuery<Work[], Error>({
    queryKey: ["works", universeId],
    queryFn: async () => {
      const result = await getWorksByUniverse(universeId);

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to load works");
      }

      return result.data;
    },
    staleTime: STALE_TIME_MS,
    enabled: Boolean(universeId),
    retry: 1,
  });
