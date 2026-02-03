import { queryOptions } from "@tanstack/react-query";
import { getActiveUniverses as fetchActiveUniverses } from "@/services/firebase";
import type { Universe } from "@/types";

const STALE_TIME_MS = 5 * 60 * 1000;
const GC_TIME_MS = 10 * 60 * 1000;

export const universesKeys = {
  all: ["universes"] as const,
  active: () => [...universesKeys.all, "active"] as const,
  detail: (id: string) => [...universesKeys.all, "detail", id] as const,
};

export const getActiveUniverses = async (): Promise<Universe[]> => {
  const result = await fetchActiveUniverses();

  if (!result.success) {
    throw new Error(result.error || "Erreur lors du chargement des univers");
  }

  return result.data || [];
};

export const activeUniversesQueryOptions = queryOptions({
  queryKey: universesKeys.active(),
  queryFn: getActiveUniverses,
  staleTime: STALE_TIME_MS,
  gcTime: GC_TIME_MS,
  retry: 2,
});
