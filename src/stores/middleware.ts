/**
 * Zustand Middleware Configuration
 *
 * Provides reusable middleware for Zustand stores:
 * - Persistence with localStorage
 * - Development tools integration
 */

import { StateCreator } from 'zustand';
import { createJSONStorage, PersistOptions } from 'zustand/middleware';

/**
 * Type helper for stores with persistence
 */
export type PersistedStore<T> = StateCreator<
  T,
  [['zustand/persist', unknown]],
  [],
  T
>;

/**
 * Create a persistence configuration for a store
 *
 * @param name - Storage key name
 * @param options - Additional persist options
 *
 * @example
 * ```ts
 * export const useThemeStore = create<ThemeStore>()(
 *   persist(
 *     (set) => ({ theme: 'magic' }),
 *     createPersistConfig('theme-storage')
 *   )
 * );
 * ```
 */
export function createPersistConfig<T>(
  name: string,
  options?: Partial<PersistOptions<T>>
): PersistOptions<T> {
  return {
    name,
    storage: createJSONStorage(() => localStorage),
    ...options,
  } as PersistOptions<T>;
}

/**
 * Development helper: Log state changes
 * Only active in development mode
 */
export const devtools = <T>(
  config: StateCreator<T>
): StateCreator<T> => {
  return (set, get, api) =>
    config(
      (args) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('  applying', args);
        }
        set(args);
      },
      get,
      api
    );
};
