import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createPersistConfig } from './middleware';

export type Theme = 'magic' | 'neon' | 'retro';

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resetTheme: () => void;
}

const DEFAULT_THEME: Theme = 'magic';

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: DEFAULT_THEME,
      setTheme: (theme) => set({ theme }),
      resetTheme: () => set({ theme: DEFAULT_THEME }),
    }),
    createPersistConfig('theme-storage')
  )
);

export const themeSelectors = {
  theme: (state: ThemeStore) => state.theme,
  setTheme: (state: ThemeStore) => state.setTheme,
  resetTheme: (state: ThemeStore) => state.resetTheme,
};

export const useTheme = () => ({
  theme: useThemeStore(themeSelectors.theme),
  setTheme: useThemeStore(themeSelectors.setTheme),
  resetTheme: useThemeStore(themeSelectors.resetTheme),
});
