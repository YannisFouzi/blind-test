import { useCallback, useMemo } from "react";

/**
 * Fonction utilitaire pure pour la navigation "hard reload".
 * Utilisable dans les handlers WebSocket ou autres contextes non-React.
 *
 * @param url - URL de destination (relative ou absolue)
 * @param onBeforeNavigate - Callback optionnel appelé avant la navigation (pour cleanup audio, etc.)
 */
export const navigateToUrl = (url: string, onBeforeNavigate?: () => void) => {
  // Appeler le callback de cleanup si fourni
  if (onBeforeNavigate) {
    onBeforeNavigate();
  }

  // Navigation "hard" pour garantir cleanup complet
  // Utiliser setTimeout(0) pour éviter les conflits avec le hot reload de React
  // Le délai minimal permet à React de terminer le cleanup avant la redirection
  setTimeout(() => {
    window.location.href = url;
  }, 0);
};

/**
 * Hook de navigation pour le jeu multiplayer.
 *
 * Utilise `window.location.href` au lieu de `router.push()` pour garantir
 * un état propre lors des transitions. Cela évite les conflits de hooks
 * React causés par les WebSocket actifs (PartyKit + Firebase).
 *
 * ## Pourquoi cette approche ?
 *
 * **Contexte** : Jeu multiplayer temps réel avec :
 * - Navigations rares (3-4 par partie)
 * - État complexe : PartyKit WebSocket + PartyKit Lobby + Firebase (Auth + Firestore) + XState
 * - 3 sources d'événements asynchrones actives en parallèle
 * - Robustesse > Élégance (un bug de sync = partie foutue)
 *
 * **Trade-off accepté** :
 * - ❌ Perte du cache Next.js (~50ms)
 * - ❌ Flash blanc lors de la transition
 * - ✅ Gain de robustesse (zéro race condition)
 * - ✅ État propre garanti après navigation
 * - ✅ Simplicité (moins de code = moins de bugs)
 *
 * Pour un jeu multiplayer avec 3-4 navigations par partie, ce trade-off
 * est largement favorable.
 *
 * ## Exemples d'usage
 *
 * ```tsx
 * const { navigate } = useGameNavigation();
 *
 * // Navigation simple
 * navigate('/room/room-123?name=John&player=abc123');
 *
 * // Avec callback de cleanup (optionnel)
 * navigate('/game/universe-456?mode=multi', () => {
 *   audioReset();
 *   doubleReset();
 * });
 * ```
 *
 * @see https://github.com/partykit/partykit - PartyKit documentation
 */
export const useGameNavigation = () => {
  /**
   * Navigue vers une URL en utilisant un "hard reload" pour garantir
   * un état propre (cleanup complet des WebSocket et listeners).
   *
   * @param url - URL de destination (relative ou absolue)
   * @param onBeforeNavigate - Callback optionnel appelé avant la navigation (pour cleanup audio, etc.)
   */
  const navigate = useCallback(
    (url: string, onBeforeNavigate?: () => void) => {
      navigateToUrl(url, onBeforeNavigate);
    },
    []
  );

  // Mémoriser l'objet retourné pour éviter qu'il change entre les renders
  // et causer des problèmes d'ordre des hooks lors du hot reload
  return useMemo(() => ({ navigate }), [navigate]);
};
