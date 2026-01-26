/**
 * Stores Index
 *
 * Barrel export for all Zustand stores
 *
 * @example
 * ```tsx
 * import { useThemeStore, useGameConfig, useUIStore } from '@/stores';
 * ```
 */

// ========== MIDDLEWARE ==========
export * from './middleware';

// ========== STORES ==========

/**
 * Theme Store - Gestion du thÃ¨me global (magic, neon, retro)
 * Persiste dans localStorage
 */
export * from './themeStore';

/**
 * Game Config Store - Configuration du jeu
 * **CRITIQUE** : Ã‰limine 16 props de UniverseCustomizeModal
 * Pas de persistence (Ã©tat Ã©phÃ©mÃ¨re)
 */
export * from './gameConfigStore';

/**
 * UI Store - Ã‰tat UI Ã©phÃ©mÃ¨re (modals, toasts, loading)
 * Pas de persistence (Ã©tat Ã©phÃ©mÃ¨re)
 */
export * from './uiStore';

/**
 * Room Auth Store - Donnees auth ephemeres (mot de passe en transit)
 * Pas de persistence (memoire uniquement)
 */
export * from './roomAuthStore';


