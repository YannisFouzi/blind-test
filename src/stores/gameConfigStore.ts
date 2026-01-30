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
import { MAX_WORKS_CUSTOM_MODE, WORKS_PER_ROUND_DEFAULT } from '@/constants/gameModes';

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
   * Noms des œuvres sélectionnées (pour préview invités)
   */
  allowedWorkNames: string[];

  /**
   * Nombre total de chansons disponibles (pour préview quand maxSongs = null)
   */
  totalSongsForPreview: number | null;

  /**
   * Nombre total d'œuvres dans l'univers (pour préview "toutes" œuvres)
   */
  totalWorksInUniverse: number | null;

  /**
   * Nombre de chansons effectif pour la préview invités (= ce que l'hôte voit : 0 si aucune œuvre, sinon maxSongs ?? total des œuvres sélectionnées)
   */
  effectiveSongsForPreview: number | null;

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
   * Mode aléatoire : pool d'œuvres + X par manche
   */
  isRandomMode: boolean;

  /**
   * Nombre d'œuvres affichées par manche (mode aléatoire, 5–8)
   */
  worksPerRound: number | null;

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
    isRandomMode?: boolean;
    maxWorksAllowed?: number | null;
    worksPerRound?: number | null;
  }) => void;

  /**
   * Fermer la modal de customization
   */
  closeCustomize: () => void;

  /**
   * Toggle une œuvre (ajouter/retirer de la sélection). workTitle optionnel pour la préview invités.
   */
  toggleWork: (workId: string, workTitle?: string) => void;

  /**
   * Sélectionner plusieurs œuvres d'un coup
   */
  setAllowedWorks: (workIds: string[]) => void;

  /**
   * Sélectionner œuvres avec noms (pour "tout sélectionner" + préview)
   */
  setAllowedWorksWithNames: (workIds: string[], workNames: string[]) => void;

  /**
   * Définir le total de chansons disponibles (modal)
   */
  setTotalSongsForPreview: (n: number | null) => void;

  /**
   * Définir le nombre total d'œuvres dans l'univers (modal)
   */
  setTotalWorksInUniverse: (n: number | null) => void;

  /**
   * Définir le nombre de chansons effectif pour la préview (modal : 0 si 0 œuvres, sinon maxSongs ?? total sélection)
   */
  setEffectiveSongsForPreview: (n: number | null) => void;

  /**
   * Activer/désactiver le mode sans avance rapide
   */
  setNoSeek: (value: boolean) => void;

  /**
   * Définir le nombre maximum de chansons
   */
  setMaxSongs: (value: number | null) => void;

  /**
   * Définir le nombre d'œuvres par manche (mode aléatoire, 5–8)
   */
  setWorksPerRound: (value: number | null) => void;

  /**
   * Basculer entre mode personnalisé et mode aléatoire (un seul bouton Mode Custom)
   */
  setUnifiedCustomSubMode: (subMode: 'custom' | 'random') => void;

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
  allowedWorkNames: [],
  totalSongsForPreview: null,
  totalWorksInUniverse: null,
  effectiveSongsForPreview: null,
  noSeek: false,
  maxSongs: null,
  isCustomMode: false,
  maxWorksAllowed: null,
  isRandomMode: false,
  worksPerRound: null,
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
    isRandomMode: options.isRandomMode ?? false,
    maxWorksAllowed: options.maxWorksAllowed ?? null,
    worksPerRound: options.worksPerRound ?? null,
    // Reset options lors de l'ouverture
    allowedWorks: [],
    noSeek: false,
    maxSongs: null,
  }),

  closeCustomize: () => set({
    // Reset complet à l'état initial
    ...INITIAL_STATE,
  }),

  toggleWork: (workId, workTitle) => set((state) => {
    const isSelected = state.allowedWorks.includes(workId);
    const name = workTitle ?? workId;

    if (isSelected) {
      const idx = state.allowedWorks.indexOf(workId);
      return {
        allowedWorks: state.allowedWorks.filter(id => id !== workId),
        allowedWorkNames: state.allowedWorkNames.filter((_, i) => i !== idx),
      };
    } else {
      const canAdd = !state.maxWorksAllowed || state.allowedWorks.length < state.maxWorksAllowed;
      if (!canAdd) {
        console.warn(`Limite d'œuvres atteinte (${state.maxWorksAllowed})`);
        return state;
      }
      return {
        allowedWorks: [...state.allowedWorks, workId],
        allowedWorkNames: [...state.allowedWorkNames, name],
      };
    }
  }),

  setAllowedWorks: (workIds) => set({
    allowedWorks: workIds,
    allowedWorkNames: workIds.length > 0 ? workIds.map(id => id) : [],
  }),

  setAllowedWorksWithNames: (workIds, workNames) => set({
    allowedWorks: workIds,
    allowedWorkNames: workNames,
  }),

  setTotalSongsForPreview: (n) => set({ totalSongsForPreview: n }),

  setTotalWorksInUniverse: (n) => set({ totalWorksInUniverse: n }),

  setEffectiveSongsForPreview: (n) => set({ effectiveSongsForPreview: n }),

  setNoSeek: (value) => set({ noSeek: value }),

  setMaxSongs: (value) => set({ maxSongs: value }),

  setWorksPerRound: (value) => set({
    worksPerRound: value === null ? null : Math.max(2, Math.min(8, value)),
  }),

  setUnifiedCustomSubMode: (subMode: 'custom' | 'random') => set({
    isCustomMode: subMode === 'custom',
    isRandomMode: subMode === 'random',
    maxWorksAllowed: subMode === 'custom' ? MAX_WORKS_CUSTOM_MODE : null,
    worksPerRound: subMode === 'random' ? WORKS_PER_ROUND_DEFAULT : null,
  }),

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
  allowedWorkNames: (state: GameConfigStore) => state.allowedWorkNames,
  totalSongsForPreview: (state: GameConfigStore) => state.totalSongsForPreview,
  totalWorksInUniverse: (state: GameConfigStore) => state.totalWorksInUniverse,
  effectiveSongsForPreview: (state: GameConfigStore) => state.effectiveSongsForPreview,
  noSeek: (state: GameConfigStore) => state.noSeek,
  maxSongs: (state: GameConfigStore) => state.maxSongs,
  isCustomMode: (state: GameConfigStore) => state.isCustomMode,
  maxWorksAllowed: (state: GameConfigStore) => state.maxWorksAllowed,
  isRandomMode: (state: GameConfigStore) => state.isRandomMode,
  worksPerRound: (state: GameConfigStore) => state.worksPerRound,
  mysteryEffects: (state: GameConfigStore) => state.mysteryEffects,

  // Actions
  openCustomize: (state: GameConfigStore) => state.openCustomize,
  closeCustomize: (state: GameConfigStore) => state.closeCustomize,
  toggleWork: (state: GameConfigStore) => state.toggleWork,
  setAllowedWorks: (state: GameConfigStore) => state.setAllowedWorks,
  setAllowedWorksWithNames: (state: GameConfigStore) => state.setAllowedWorksWithNames,
  setTotalSongsForPreview: (state: GameConfigStore) => state.setTotalSongsForPreview,
  setTotalWorksInUniverse: (state: GameConfigStore) => state.setTotalWorksInUniverse,
  setEffectiveSongsForPreview: (state: GameConfigStore) => state.setEffectiveSongsForPreview,
  setNoSeek: (state: GameConfigStore) => state.setNoSeek,
  setMaxSongs: (state: GameConfigStore) => state.setMaxSongs,
  setWorksPerRound: (state: GameConfigStore) => state.setWorksPerRound,
  setUnifiedCustomSubMode: (state: GameConfigStore) => state.setUnifiedCustomSubMode,
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
  allowedWorkNames: useGameConfig(gameConfigSelectors.allowedWorkNames),
  totalSongsForPreview: useGameConfig(gameConfigSelectors.totalSongsForPreview),
  totalWorksInUniverse: useGameConfig(gameConfigSelectors.totalWorksInUniverse),
  effectiveSongsForPreview: useGameConfig(gameConfigSelectors.effectiveSongsForPreview),
  noSeek: useGameConfig(gameConfigSelectors.noSeek),
  maxSongs: useGameConfig(gameConfigSelectors.maxSongs),
  isCustomMode: useGameConfig(gameConfigSelectors.isCustomMode),
  maxWorksAllowed: useGameConfig(gameConfigSelectors.maxWorksAllowed),
  isRandomMode: useGameConfig(gameConfigSelectors.isRandomMode),
  worksPerRound: useGameConfig(gameConfigSelectors.worksPerRound),
  mysteryEffects: useGameConfig(gameConfigSelectors.mysteryEffects),

  // Actions
  openCustomize: useGameConfig(gameConfigSelectors.openCustomize),
  closeCustomize: useGameConfig(gameConfigSelectors.closeCustomize),
  toggleWork: useGameConfig(gameConfigSelectors.toggleWork),
  setAllowedWorks: useGameConfig(gameConfigSelectors.setAllowedWorks),
  setAllowedWorksWithNames: useGameConfig(gameConfigSelectors.setAllowedWorksWithNames),
  setTotalSongsForPreview: useGameConfig(gameConfigSelectors.setTotalSongsForPreview),
  setTotalWorksInUniverse: useGameConfig(gameConfigSelectors.setTotalWorksInUniverse),
  setEffectiveSongsForPreview: useGameConfig(gameConfigSelectors.setEffectiveSongsForPreview),
  setNoSeek: useGameConfig(gameConfigSelectors.setNoSeek),
  setMaxSongs: useGameConfig(gameConfigSelectors.setMaxSongs),
  setWorksPerRound: useGameConfig(gameConfigSelectors.setWorksPerRound),
  setUnifiedCustomSubMode: useGameConfig(gameConfigSelectors.setUnifiedCustomSubMode),
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
