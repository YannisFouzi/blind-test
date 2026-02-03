"use client";

import { useQuery } from "@tanstack/react-query";
import type { Universe } from "@/types";
import { activeUniversesQueryOptions } from "@/features/home/queries/universes.query";

export const useUniverses = (initialData?: Universe[]) => {
  const query = useQuery({
    ...activeUniversesQueryOptions,
    initialData,
  });

  return {
    universes: query.data ?? ([] as Universe[]),
    loading: query.isLoading,
    error: query.error ? String(query.error) : null,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
    isFetching: query.isFetching,
  };
};
