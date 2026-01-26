/**
 * Design Tokens - Source de Vérité Unique
 *
 * Ce fichier centralise TOUS les tokens de design (couleurs, espacements, etc.)
 * pour garantir la cohérence et faciliter les changements de thème.
 *
 * ⚠️ IMPORTANT : Ce fichier est la SEULE source de vérité pour le design.
 * Toute modification ici se répercute automatiquement dans toute l'application.
 */

export const tokens = {
  /**
   * COULEURS
   * Palette complète avec variants
   */
  colors: {
    // Couleurs de marque
    brand: {
      primary: {
        DEFAULT: '#FFDC4D',      // yellow CTA
        light: '#FFE88A',
        dark: '#F5C400',
        darker: '#E2B100',
      },
      secondary: {
        DEFAULT: '#3B82F6',      // blue UI
        light: '#60A5FA',
        dark: '#2563EB',
        darker: '#1D4ED8',
      },
      accent: {
        DEFAULT: '#A855F7',      // purple pop
        light: '#C084FC',
        dark: '#9333EA',
        darker: '#7E22CE',
      },
    },

    // Surfaces (fonds)
    surface: {
      base: '#FFF3B8',          // Background base
      elevated: '#FFFFFF',      // Cards
      overlay: '#FFF9E6',       // Modals
      subtle: '#FFEFA3',        // Sections
      hover: '#FFF0C7',         // Hover
    },

    // Texte
    text: {
      primary: '#1B1B1B',       // Main text
      secondary: '#2D2D2D',
      muted: '#5E5E5E',
      disabled: '#9B9B9B',
      inverse: '#FFFFFF',
    },

    // Bordures
    border: {
      subtle: 'rgba(27, 27, 27, 0.15)',
      default: '#1B1B1B',
      strong: '#0F0F0F',
      accent: 'rgba(59, 130, 246, 0.6)',
      focus: '#F59E0B',
    },

    // États
    state: {
      success: {
        DEFAULT: '#10B981',     // green-500
        light: '#34D399',       // green-400
        dark: '#059669',        // green-600
        bg: 'rgba(16, 185, 129, 0.1)',
      },
      error: {
        DEFAULT: '#EF4444',     // red-500
        light: '#F87171',       // red-400
        dark: '#DC2626',        // red-600
        bg: 'rgba(239, 68, 68, 0.1)',
      },
      warning: {
        DEFAULT: '#F59E0B',     // amber-500
        light: '#FBBF24',       // amber-400
        dark: '#D97706',        // amber-600
        bg: 'rgba(245, 158, 11, 0.1)',
      },
      info: {
        DEFAULT: '#3B82F6',     // blue-500
        light: '#60A5FA',       // blue-400
        dark: '#2563EB',        // blue-600
        bg: 'rgba(59, 130, 246, 0.1)',
      },
    },

    // Gradients (pour compatibilite)
    gradients: {
      magic: 'linear-gradient(135deg, #FFDC4D 0%, #A855F7 100%)',
      neon: 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%)',
      retro: 'linear-gradient(135deg, #FFD166 0%, #EF476F 100%)',
      purple: 'linear-gradient(135deg, #C084FC 0%, #7C3AED 100%)',
      blue: 'linear-gradient(135deg, #93C5FD 0%, #2563EB 100%)',
    },
  },

  /**
   * ESPACEMENT
   * Basé sur scale 4px (conforme Tailwind)
   */
  spacing: {
    0: '0',
    px: '1px',
    0.5: '0.125rem',  // 2px
    1: '0.25rem',     // 4px
    1.5: '0.375rem',  // 6px
    2: '0.5rem',      // 8px
    2.5: '0.625rem',  // 10px
    3: '0.75rem',     // 12px
    3.5: '0.875rem',  // 14px
    4: '1rem',        // 16px
    5: '1.25rem',     // 20px
    6: '1.5rem',      // 24px
    7: '1.75rem',     // 28px
    8: '2rem',        // 32px
    9: '2.25rem',     // 36px
    10: '2.5rem',     // 40px
    11: '2.75rem',    // 44px
    12: '3rem',       // 48px
    14: '3.5rem',     // 56px
    16: '4rem',       // 64px
    20: '5rem',       // 80px
    24: '6rem',       // 96px
    28: '7rem',       // 112px
    32: '8rem',       // 128px
  },

  /**
   * BORDER RADIUS
   */
  radius: {
    none: '0',
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '2.5rem',  // 40px
    '3xl': '3rem',    // 48px
    full: '9999px',
  },

  /**
   * OMBRES
   */
  shadows: {
    // Ombres standards (sticker)
    sm: '2px 2px 0 #1B1B1B',
    md: '4px 4px 0 #1B1B1B',
    lg: '6px 6px 0 #1B1B1B',
    xl: '8px 8px 0 #1B1B1B',
    '2xl': '10px 10px 0 #1B1B1B',

    // Glows (utilises comme contours doux)
    glow: {
      purple: '0 0 0 3px rgba(168, 85, 247, 0.45)',
      'purple-lg': '0 0 0 4px rgba(168, 85, 247, 0.6)',
      pink: '0 0 0 3px rgba(236, 72, 153, 0.4)',
      'pink-lg': '0 0 0 4px rgba(236, 72, 153, 0.55)',
      gold: '0 0 0 3px rgba(255, 220, 77, 0.6)',
      'gold-lg': '0 0 0 4px rgba(255, 220, 77, 0.75)',
      green: '0 0 0 3px rgba(34, 197, 94, 0.45)',
      blue: '0 0 0 3px rgba(59, 130, 246, 0.45)',
      cyan: '0 0 0 3px rgba(6, 182, 212, 0.45)',
    },

    // Inner shadows (legers)
    inner: {
      sm: 'inset 0 1px 0 rgba(0, 0, 0, 0.15)',
      md: 'inset 0 2px 0 rgba(0, 0, 0, 0.2)',
      lg: 'inset 0 3px 0 rgba(0, 0, 0, 0.25)',
    },
  },

  /**
   * TYPOGRAPHIE
   */
  typography: {
    fonts: {
      sans: 'var(--font-body), "Nunito", sans-serif',
      display: 'var(--font-display), "Baloo 2", cursive',
      mono: 'var(--font-mono), "JetBrains Mono", monospace',
    },

    sizes: {
      xs: '0.75rem',      // 12px
      sm: '0.875rem',     // 14px
      base: '1rem',       // 16px
      lg: '1.125rem',     // 18px
      xl: '1.25rem',      // 20px
      '2xl': '1.5rem',    // 24px
      '3xl': '1.875rem',  // 30px
      '4xl': '2.25rem',   // 36px
      '5xl': '3rem',      // 48px
      '6xl': '3.75rem',   // 60px
      '7xl': '4.5rem',    // 72px
      '8xl': '6rem',      // 96px
      '9xl': '8rem',      // 128px
    },

    lineHeights: {
      none: '1',
      tight: '1.25',
      snug: '1.375',
      normal: '1.5',
      relaxed: '1.625',
      loose: '2',
    },

    weights: {
      thin: '100',
      extralight: '200',
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900',
    },
  },

  /**
   * ANIMATIONS
   */
  animation: {
    durations: {
      fastest: '100ms',
      fast: '150ms',
      base: '300ms',
      slow: '500ms',
      slower: '800ms',
      slowest: '1000ms',
    },

    easings: {
      // Courbes Bézier personnalisées
      default: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',  // easeOutQuad
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',                 // easeIn
      out: 'cubic-bezier(0, 0, 0.2, 1)',                // easeOut
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',            // easeInOut
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // bounce
      elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    },
  },

  /**
   * Z-INDEX
   * Layers organisés (évite les conflits)
   */
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modalBackdrop: 1300,
    modal: 1400,
    popover: 1500,
    tooltip: 1600,
  },

  /**
   * BREAKPOINTS
   * Mobile-first (conforme Tailwind)
   */
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  /**
   * TRANSITIONS
   * Propriétés de transition communes
   */
  transitions: {
    all: 'all',
    colors: 'color, background-color, border-color, text-decoration-color, fill, stroke',
    opacity: 'opacity',
    shadow: 'box-shadow',
    transform: 'transform',
  },
} as const;

// Type helper pour garantir la cohérence
export type Tokens = typeof tokens;

// Helper pour accéder aux tokens de manière type-safe
export type TokenPath = keyof typeof tokens;
