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
 * Theme Store - Gestion du thème global (magic, neon, retro)
 * Persiste dans localStorage
 */
export * from './themeStore';

/**
 * Game Config Store - Configuration du jeu
 * **CRITIQUE** : Élimine 16 props de UniverseCustomizeModal
 * Pas de persistence (état éphémère)
 */
export * from './gameConfigStore';

/**
 * UI Store - État UI éphémère (modals, toasts, loading)
 * Pas de persistence (état éphémère)
 */
export * from './uiStore';
