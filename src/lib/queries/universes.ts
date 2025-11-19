import { queryOptions } from "@tanstack/react-query";
import { FirebaseService } from "@/services/firebaseService";
import { Universe } from "@/types";

/**
 * Query keys factory pour les univers
 * Pattern recommandé par TanStack Query pour organiser les query keys
 * https://tanstack.com/query/latest/docs/framework/react/guides/query-keys
 */
export const universesKeys = {
  // Key de base pour toutes les queries liées aux univers
  all: ["universes"] as const,

  // Key pour la liste des univers actifs
  active: () => [...universesKeys.all, "active"] as const,

  // Key pour un univers spécifique
  detail: (id: string) => [...universesKeys.all, "detail", id] as const,
};

/**
 * Query function pour récupérer les univers actifs
 * Gère les erreurs de manière professionnelle
 */
export const getActiveUniverses = async (): Promise<Universe[]> => {
  const result = await FirebaseService.getActiveUniverses();

  if (!result.success) {
    throw new Error(result.error || "Erreur lors du chargement des univers");
  }

  return result.data || [];
};

/**
 * Query options pour les univers actifs
 * Utilise queryOptions pour avoir une meilleure inférence de types
 * Pattern recommandé depuis TanStack Query v5
 */
export const activeUniversesQueryOptions = queryOptions({
  queryKey: universesKeys.active(),
  queryFn: getActiveUniverses,
  // Configuration spécifique pour cette query
  staleTime: 5 * 60 * 1000, // Les univers sont considérés frais pendant 5 minutes
  gcTime: 10 * 60 * 1000, // Garde en cache pendant 10 minutes
  retry: 2, // Retry 2 fois en cas d'échec
});
