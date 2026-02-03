/**
 * Game configuration store used by the customization modal.
 */
import { create } from 'zustand';
import type { Universe } from '@/types';
import { MAX_WORKS_CUSTOM_MODE, WORKS_PER_ROUND_DEFAULT } from '@/constants/gameModes';

type MysteryEffect = 'double' | 'reverse';

type CustomizeOptions = {
  isCustomMode?: boolean;
  isRandomMode?: boolean;
  maxWorksAllowed?: number | null;
  worksPerRound?: number | null;
};

interface GameConfigStore {
  customizingUniverse: Universe | null;
  allowedWorks: string[];
  allowedWorkNames: string[];
  totalSongsForPreview: number | null;
  totalWorksInUniverse: number | null;
  effectiveSongsForPreview: number | null;
  noSeek: boolean;
  maxSongs: number | null;
  isCustomMode: boolean;
  maxWorksAllowed: number | null;
  isRandomMode: boolean;
  worksPerRound: number | null;
  mysteryEffects: {
    enabled: boolean;
    frequency: number;
    selectedEffects: MysteryEffect[];
  };

  openCustomize: (universe: Universe, options?: CustomizeOptions) => void;
  closeCustomize: () => void;
  toggleWork: (workId: string, workTitle?: string) => void;
  setAllowedWorks: (workIds: string[]) => void;
  setAllowedWorksWithNames: (workIds: string[], workNames: string[]) => void;
  setTotalSongsForPreview: (n: number | null) => void;
  setTotalWorksInUniverse: (n: number | null) => void;
  setEffectiveSongsForPreview: (n: number | null) => void;
  setNoSeek: (value: boolean) => void;
  setMaxSongs: (value: number | null) => void;
  setWorksPerRound: (value: number | null) => void;
  setUnifiedCustomSubMode: (subMode: 'custom' | 'random') => void;
  reset: () => void;
  resetOptions: () => void;
  setMysteryEffectsEnabled: (enabled: boolean) => void;
  setMysteryEffectsFrequency: (frequency: number) => void;
  toggleMysteryEffect: (effect: MysteryEffect) => void;
}

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

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
    selectedEffects: [] as MysteryEffect[],
  },
};

export const useGameConfig = create<GameConfigStore>((set) => ({
  ...INITIAL_STATE,

  openCustomize: (universe, options = {}) =>
    set({
      customizingUniverse: universe,
      isCustomMode: options.isCustomMode ?? false,
      isRandomMode: options.isRandomMode ?? false,
      maxWorksAllowed: options.maxWorksAllowed ?? null,
      worksPerRound: options.worksPerRound ?? null,
      allowedWorks: [],
      noSeek: false,
      maxSongs: null,
    }),

  closeCustomize: () =>
    set({
      ...INITIAL_STATE,
    }),

  toggleWork: (workId, workTitle) =>
    set((state) => {
      const index = state.allowedWorks.indexOf(workId);
      if (index !== -1) {
        return {
          allowedWorks: state.allowedWorks.filter((id) => id !== workId),
          allowedWorkNames: state.allowedWorkNames.filter((_, i) => i !== index),
        };
      }

      const hasLimit = Boolean(state.maxWorksAllowed);
      if (hasLimit && state.allowedWorks.length >= state.maxWorksAllowed!) {
        console.warn(`Limite d'oeuvres atteinte (${state.maxWorksAllowed})`);
        return state;
      }

      const name = workTitle ?? workId;
      return {
        allowedWorks: [...state.allowedWorks, workId],
        allowedWorkNames: [...state.allowedWorkNames, name],
      };
    }),

  setAllowedWorks: (workIds) =>
    set({
      allowedWorks: workIds,
      allowedWorkNames: workIds.length > 0 ? workIds.map((id) => id) : [],
    }),

  setAllowedWorksWithNames: (workIds, workNames) =>
    set({
      allowedWorks: workIds,
      allowedWorkNames: workNames,
    }),

  setTotalSongsForPreview: (n) => set({ totalSongsForPreview: n }),

  setTotalWorksInUniverse: (n) => set({ totalWorksInUniverse: n }),

  setEffectiveSongsForPreview: (n) => set({ effectiveSongsForPreview: n }),

  setNoSeek: (value) => set({ noSeek: value }),

  setMaxSongs: (value) => set({ maxSongs: value }),

  setWorksPerRound: (value) =>
    set({
      worksPerRound: value === null ? null : clampNumber(value, 2, 8),
    }),

  setUnifiedCustomSubMode: (subMode: 'custom' | 'random') =>
    set({
      isCustomMode: subMode === 'custom',
      isRandomMode: subMode === 'random',
      maxWorksAllowed: subMode === 'custom' ? MAX_WORKS_CUSTOM_MODE : null,
      worksPerRound: subMode === 'random' ? WORKS_PER_ROUND_DEFAULT : null,
    }),

  reset: () => set(INITIAL_STATE),

  resetOptions: () =>
    set({
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
        frequency: clampNumber(frequency, 1, 100),
      },
    })),

  toggleMysteryEffect: (effect) =>
    set((state) => {
      const { selectedEffects } = state.mysteryEffects;
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

export const gameConfigSelectors = {
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

export const useGameConfiguration = () => ({
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

export const useCanSelectMoreWorks = () => {
  const maxWorksAllowed = useGameConfig(gameConfigSelectors.maxWorksAllowed);
  const allowedWorks = useGameConfig(gameConfigSelectors.allowedWorks);

  return !maxWorksAllowed || allowedWorks.length < maxWorksAllowed;
};
