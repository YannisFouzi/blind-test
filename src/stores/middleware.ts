import type { StateCreator } from 'zustand';
import { createJSONStorage } from 'zustand/middleware';
import type { PersistOptions } from 'zustand/middleware';

export type PersistedStore<T> = StateCreator<
  T,
  [['zustand/persist', unknown]],
  [],
  T
>;

export const createPersistConfig = <T>(
  name: string,
  options?: Partial<PersistOptions<T>>
): PersistOptions<T> => ({
  name,
  storage: createJSONStorage(() => localStorage),
  ...options,
});

export const devtools = <T>(config: StateCreator<T>): StateCreator<T> =>
  (set, get, api) =>
    config(
      (args) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('applying', args);
        }
        set(args);
      },
      get,
      api
    );
