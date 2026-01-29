"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";

/**
 * Fonction utilitaire pure pour la navigation "hard reload" (fallback).
 * Utilisable dans les handlers WebSocket ou autres contextes non-React
 * quand aucun router n'est disponible.
 *
 * @param url - URL de destination (relative ou absolue)
 * @param onBeforeNavigate - Callback optionnel appelé avant la navigation (pour cleanup audio, etc.)
 */
export const navigateToUrl = (url: string, onBeforeNavigate?: () => void) => {
  if (onBeforeNavigate) {
    onBeforeNavigate();
  }
  setTimeout(() => {
    window.location.href = url;
  }, 0);
};

/**
 * Hook de navigation pour le jeu (multi et solo).
 *
 * Utilise `router.push()` pour une navigation client (SPA) : cache TanStack Query
 * préservé, pas de flash blanc. Le cleanup des WebSockets doit être géré
 * explicitement dans les hooks (usePartyKitLobby, usePartyKitRoom).
 *
 * @see docs/AUDIT-NAVIGATION-WEBSOCKETS.md
 */
export const useGameNavigation = () => {
  const router = useRouter();

  const navigate = useCallback(
    (url: string, onBeforeNavigate?: () => void) => {
      if (onBeforeNavigate) {
        onBeforeNavigate();
      }
      router.push(url);
    },
    [router]
  );

  return useMemo(() => ({ navigate }), [navigate]);
};
