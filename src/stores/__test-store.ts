/**
 * TEST STORE - Vérification de l'installation Zustand
 *
 * Ce fichier peut être supprimé après vérification.
 * Il sert uniquement à tester que Zustand fonctionne correctement.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createPersistConfig } from './middleware';

// Test 1: Store simple
interface TestStore {
  count: number;
  increment: () => void;
}

export const useTestStore = create<TestStore>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

// Test 2: Store avec persistence
interface PersistedTestStore {
  name: string;
  setName: (name: string) => void;
}

export const usePersistedTestStore = create<PersistedTestStore>()(
  persist(
    (set) => ({
      name: 'Test',
      setName: (name) => set({ name }),
    }),
    createPersistConfig('test-storage')
  )
);

/**
 * Usage dans un composant React:
 *
 * import { useTestStore } from '@/stores/__test-store';
 *
 * function TestComponent() {
 *   const count = useTestStore((state) => state.count);
 *   const increment = useTestStore((state) => state.increment);
 *
 *   return <button onClick={increment}>Count: {count}</button>;
 * }
 */
