import { queryOptions } from "@tanstack/react-query";
import type { Work } from "@/types";
import { getAllWorks, getWorksByUniverse } from "@/services/firebase/works.service";

const STALE_TIME_MS = 15 * 60 * 1000;
const GC_TIME_MS = 30 * 60 * 1000;

export const worksKeys = {
  all: ["works"] as const,
  universe: (id: string) => [...worksKeys.all, "universe", id] as const,
  allWorks: () => [...worksKeys.all, "all"] as const,
};

const fetchAllWorks = async (): Promise<Work[]> => {
  const result = await getAllWorks();
  if (!result.success || !result.data) {
    throw new Error(result.error || "Impossible de charger les oeuvres");
  }
  return result.data;
};

const fetchWorksByUniverse = async (universeId: string): Promise<Work[]> => {
  const result = await getWorksByUniverse(universeId);
  if (!result.success || !result.data) {
    throw new Error(result.error || "Impossible de charger les oeuvres");
  }
  return result.data;
};

export const allWorksQueryOptions = () =>
  queryOptions({
    queryKey: worksKeys.allWorks(),
    queryFn: fetchAllWorks,
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    retry: 1,
  });

export const worksByUniverseQueryOptions = (universeId: string) =>
  queryOptions({
    queryKey: worksKeys.universe(universeId),
    queryFn: () => fetchWorksByUniverse(universeId),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    retry: 1,
  });
