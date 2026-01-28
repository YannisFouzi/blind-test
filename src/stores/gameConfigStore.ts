/**
 * Game Configuration Store
 *
 * Gestion de la configuration du jeu (customization modal).
 * **CRITIQUE** : Élimine 16 props de UniverseCustomizeModal !
 *
 * Ce store remplace le props drilling massif et centralise toute la logique
 * de configuration du jeu (sélection d'œuvres, options audio, etc.).
 */

import { create } from 'zustand';
import type { Universe } from '@/types';

/**
 * État de la configuration du jeu
 */
interface GameConfigStore {
  // ========== STATE ==========

  /**
   * Univers en cours de customization (null si modal fermée)
   */
  customizingUniverse: Universe | null;

  /**
   * Liste des IDs d'œuvres sélectionnées
   */
  allowedWorks: string[];

  /**
   * Mode sans avance rapide (timeline non cliquable)
   */
  noSeek: boolean;

  /**
   * Nombre maximum de chansons (null = toutes)
   */
  maxSongs: number | null;

  /**
   * Mode custom (toutes les œuvres avec limite)
   */
  isCustomMode: boolean;

  /**
   * Limite d'œuvres sélectionnables (mode custom)
   */
  maxWorksAllowed: number | null;

  /**
   * Configuration des effets mystères (solo + multi)
   */
  mysteryEffects: {
    enabled: boolean;
    frequency: number; // 1-100
    selectedEffects: ("double" | "reverse")[];
  };

  // ========== ACTIONS ==========

  /**
   * Ouvrir la modal de customization pour un univers
   */
  openCustomize: (universe: Universe, options?: {
    isCustomMode?: boolean;
    maxWorksAllowed?: number | null;
  }) => void;

  /**
   * Fermer la modal de customization
   */
  closeCustomize: () => void;

  /**
   * Toggle une œuvre (ajouter/retirer de la sélection)
   */
  toggleWork: (workId: string) => void;

  /**
   * Sélectionner plusieurs œuvres d'un coup
   */
  setAllowedWorks: (workIds: string[]) => void;

  /**
   * Activer/désactiver le mode sans avance rapide
   */
  setNoSeek: (value: boolean) => void;

  /**
   * Définir le nombre maximum de chansons
   */
  setMaxSongs: (value: number | null) => void;

  /**
   * Reset complet de la configuration
   */
  reset: () => void;

  /**
   * Reset uniquement les options (garde l'univers et les œuvres)
   */
  resetOptions: () => void;

  /**
   * Activer / désactiver les effets mystères
   */
  setMysteryEffectsEnabled: (enabled: boolean) => void;

  /**
   * Modifier la fréquence des effets mystères (1-100%)
   */
  setMysteryEffectsFrequency: (frequency: number) => void;

  /**
   * Activer / désactiver un effet donné (double / reverse)
   */
  toggleMysteryEffect: (effect: "double" | "reverse") => void;
}

/**
 * État initial
 */
const INITIAL_STATE = {
  customizingUniverse: null,
  allowedWorks: [],
  noSeek: false,
  maxSongs: null,
  isCustomMode: false,
  maxWorksAllowed: null,
   mysteryEffects: {
    enabled: false,
    frequency: 10,
    selectedEffects: [],
  },
};

/**
 * Store Zustand pour la configuration du jeu
 *
 * @example
 * ```tsx
 * // Dans HomeContent.tsx (parent)
 * import { useGameConfig } from '@/stores';
 *
 * function HomeContent() {
 *   const openCustomize = useGameConfig((state) => state.openCustomize);
 *
 *   return (
 *     <button onClick={() => openCustomize(universe)}>
 *       Customiser
 *     </button>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Dans UniverseCustomizeModal.tsx (enfant)
 * import { useGameConfig } from '@/stores';
 *
 * function UniverseCustomizeModal() {
 *   // Plus besoin de props ! Tout vient du store
 *   const universe = useGameConfig((state) => state.customizingUniverse);
 *   const allowedWorks = useGameConfig((state) => state.allowedWorks);
 *   const toggleWork = useGameConfig((state) => state.toggleWork);
 *   const closeCustomize = useGameConfig((state) => state.closeCustomize);
 *
 *   if (!universe) return null;
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export const useGameConfig = create<GameConfigStore>((set) => ({
  // ========== INITIAL STATE ==========
  ...INITIAL_STATE,

  // ========== ACTIONS ==========

  openCustomize: (universe, options = {}) => set({
    customizingUniverse: universe,
    isCustomMode: options.isCustomMode ?? false,
    maxWorksAllowed: options.maxWorksAllowed ?? null,
    // Reset options lors de l'ouverture
    allowedWorks: [],
    noSeek: false,
    maxSongs: null,
  }),

  closeCustomize: () => set({
    // Reset complet à l'état initial
    ...INITIAL_STATE,
  }),

  toggleWork: (workId) => set((state) => {
    const isSelected = state.allowedWorks.includes(workId);

    if (isSelected) {
      // Retirer l'œuvre
      return {
        allowedWorks: state.allowedWorks.filter(id => id !== workId),
      };
    } else {
      // Vérifier la limite (mode custom)
      const canAdd = !state.maxWorksAllowed || state.allowedWorks.length < state.maxWorksAllowed;

      if (!canAdd) {
        console.warn(`Limite d'œuvres atteinte (${state.maxWorksAllowed})`);
        return state; // Pas de changement
      }

      // Ajouter l'œuvre
      return {
        allowedWorks: [...state.allowedWorks, workId],
      };
    }
  }),

  setAllowedWorks: (workIds) => set({ allowedWorks: workIds }),

  setNoSeek: (value) => set({ noSeek: value }),

  setMaxSongs: (value) => set({ maxSongs: value }),

  reset: () => set(INITIAL_STATE),

  resetOptions: () => set({
    noSeek: false,
    maxSongs: null,
  }),

  setMysteryEffectsEnabled: (enabled) =>
    set((state) => ({
      mysteryEffects: {
        ...state.mysteryEffects,
        enabled,
      },
    })),

  setMysteryEffectsFrequency: (frequency) =>
    set((state) => ({
      mysteryEffects: {
        ...state.mysteryEffects,
        frequency: Math.max(1, Math.min(100, frequency)),
      },
    })),

  toggleMysteryEffect: (effect) =>
    set((state) => {
      const selectedEffects = state.mysteryEffects.selectedEffects;
      const isSelected = selectedEffects.includes(effect);

      if (isSelected) {
        return {
          mysteryEffects: {
            ...state.mysteryEffects,
            selectedEffects: selectedEffects.filter((e) => e !== effect),
          },
        };
      }

      return {
        mysteryEffects: {
          ...state.mysteryEffects,
          selectedEffects: [...selectedEffects, effect],
        },
      };
    }),
}));

/**
 * Sélecteurs optimisés pour éviter les re-renders inutiles
 */
export const gameConfigSelectors = {
  // State
  customizingUniverse: (state: GameConfigStore) => state.customizingUniverse,
  allowedWorks: (state: GameConfigStore) => state.allowedWorks,
  noSeek: (state: GameConfigStore) => state.noSeek,
  maxSongs: (state: GameConfigStore) => state.maxSongs,
  isCustomMode: (state: GameConfigStore) => state.isCustomMode,
  maxWorksAllowed: (state: GameConfigStore) => state.maxWorksAllowed,
  mysteryEffects: (state: GameConfigStore) => state.mysteryEffects,

  // Actions
  openCustomize: (state: GameConfigStore) => state.openCustomize,
  closeCustomize: (state: GameConfigStore) => state.closeCustomize,
  toggleWork: (state: GameConfigStore) => state.toggleWork,
  setAllowedWorks: (state: GameConfigStore) => state.setAllowedWorks,
  setNoSeek: (state: GameConfigStore) => state.setNoSeek,
  setMaxSongs: (state: GameConfigStore) => state.setMaxSongs,
  reset: (state: GameConfigStore) => state.reset,
  resetOptions: (state: GameConfigStore) => state.resetOptions,
  setMysteryEffectsEnabled: (state: GameConfigStore) => state.setMysteryEffectsEnabled,
  setMysteryEffectsFrequency: (state: GameConfigStore) => state.setMysteryEffectsFrequency,
  toggleMysteryEffect: (state: GameConfigStore) => state.toggleMysteryEffect,
};

/**
 * Hook personnalisé pour accéder à la config du jeu (version optimisée)
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { allowedWorks, toggleWork } = useGameConfiguration();
 *
 *   return (
 *     <div>
 *       {allowedWorks.map(id => (
 *         <button key={id} onClick={() => toggleWork(id)}>
 *           Work {id}
 *         </button>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export const useGameConfiguration = () => ({
  // State
  customizingUniverse: useGameConfig(gameConfigSelectors.customizingUniverse),
  allowedWorks: useGameConfig(gameConfigSelectors.allowedWorks),
  noSeek: useGameConfig(gameConfigSelectors.noSeek),
  maxSongs: useGameConfig(gameConfigSelectors.maxSongs),
  isCustomMode: useGameConfig(gameConfigSelectors.isCustomMode),
  maxWorksAllowed: useGameConfig(gameConfigSelectors.maxWorksAllowed),
  mysteryEffects: useGameConfig(gameConfigSelectors.mysteryEffects),

  // Actions
  openCustomize: useGameConfig(gameConfigSelectors.openCustomize),
  closeCustomize: useGameConfig(gameConfigSelectors.closeCustomize),
  toggleWork: useGameConfig(gameConfigSelectors.toggleWork),
  setAllowedWorks: useGameConfig(gameConfigSelectors.setAllowedWorks),
  setNoSeek: useGameConfig(gameConfigSelectors.setNoSeek),
  setMaxSongs: useGameConfig(gameConfigSelectors.setMaxSongs),
  reset: useGameConfig(gameConfigSelectors.reset),
  resetOptions: useGameConfig(gameConfigSelectors.resetOptions),
  setMysteryEffectsEnabled: useGameConfig(gameConfigSelectors.setMysteryEffectsEnabled),
  setMysteryEffectsFrequency: useGameConfig(gameConfigSelectors.setMysteryEffectsFrequency),
  toggleMysteryEffect: useGameConfig(gameConfigSelectors.toggleMysteryEffect),
});

/**
 * Hook utilitaire : vérifier si on peut sélectionner plus d'œuvres
 */
export const useCanSelectMoreWorks = () => {
  const maxWorksAllowed = useGameConfig(gameConfigSelectors.maxWorksAllowed);
  const allowedWorks = useGameConfig(gameConfigSelectors.allowedWorks);

  return !maxWorksAllowed || allowedWorks.length < maxWorksAllowed;
};
