/**
 * Theme Store
 *
 * Gestion du thème global de l'application.
 * Persiste dans localStorage pour conserver le choix de l'utilisateur.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createPersistConfig } from './middleware';

/**
 * Thèmes disponibles
 */
export type Theme = 'magic' | 'neon' | 'retro';

/**
 * État du store de thème
 */
interface ThemeStore {
  // State
  theme: Theme;

  // Actions
  setTheme: (theme: Theme) => void;
  resetTheme: () => void;
}

/**
 * Thème par défaut
 */
const DEFAULT_THEME: Theme = 'magic';

/**
 * Store Zustand pour le thème global
 *
 * @example
 * ```tsx
 * import { useThemeStore } from '@/stores';
 *
 * function ThemeSwitcher() {
 *   const theme = useThemeStore((state) => state.theme);
 *   const setTheme = useThemeStore((state) => state.setTheme);
 *
 *   return (
 *     <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
 *       <option value="magic">Magic</option>
 *       <option value="neon">Neon</option>
 *       <option value="retro">Retro</option>
 *     </select>
 *   );
 * }
 * ```
 */
export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      // Initial state
      theme: DEFAULT_THEME,

      // Actions
      setTheme: (theme) => set({ theme }),
      resetTheme: () => set({ theme: DEFAULT_THEME }),
    }),
    createPersistConfig('theme-storage')
  )
);

/**
 * Sélecteurs optimisés pour éviter les re-renders inutiles
 */
export const themeSelectors = {
  theme: (state: ThemeStore) => state.theme,
  setTheme: (state: ThemeStore) => state.setTheme,
  resetTheme: (state: ThemeStore) => state.resetTheme,
};

/**
 * Hook personnalisé pour accéder au thème (version optimisée)
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { theme, setTheme } = useTheme();
 *
 *   return <div>Current theme: {theme}</div>;
 * }
 * ```
 */
export const useTheme = () => ({
  theme: useThemeStore(themeSelectors.theme),
  setTheme: useThemeStore(themeSelectors.setTheme),
  resetTheme: useThemeStore(themeSelectors.resetTheme),
});
