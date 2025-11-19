"use client";

import { useQuery } from "@tanstack/react-query";
import { activeUniversesQueryOptions } from "@/lib/queries/universes";
import { Universe } from "@/types";

/**
 * Hook professionnel pour récupérer les univers actifs
 * Utilise TanStack Query pour :
 * - Cache automatique
 * - Retry en cas d'échec
 * - Refetch intelligent
 * - Synchronisation entre composants
 *
 * @returns {Object} État de la query avec universes, loading, error et refetch
 */
export const useUniverses = () => {
  const query = useQuery(activeUniversesQueryOptions);

  return {
    universes: query.data || ([] as Universe[]),
    loading: query.isLoading,
    error: query.error ? String(query.error) : null,
    refetch: query.refetch,
    // Infos supplémentaires utiles de TanStack Query
    isRefetching: query.isRefetching,
    isFetching: query.isFetching,
  };
};
