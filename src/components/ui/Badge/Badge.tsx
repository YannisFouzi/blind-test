import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

/**
 * Badge Component
 *
 * Composant Badge atomique pour afficher des labels, statuts, compteurs.
 * Utilise les design tokens de config/design-tokens.ts
 *
 * @example
 * ```tsx
 * <Badge variant="success">Actif</Badge>
 * <Badge variant="magic" glow>Nouveau</Badge>
 * <Badge variant="outline" size="sm">Beta</Badge>
 * ```
 */

const badgeVariants = cva(
  // Base styles
  "inline-flex items-center gap-1 rounded-full font-medium transition-all",
  {
    variants: {
      /**
       * Variant de style
       */
      variant: {
        default:
          "bg-[var(--color-surface-elevated)] text-white border border-[rgba(255,255,255,0.2)]",
        primary:
          "bg-[var(--color-brand-primary)] text-white",
        secondary:
          "bg-[var(--color-brand-secondary)] text-white",
        accent:
          "bg-[var(--color-brand-accent)] text-white",

        // États
        success:
          "bg-green-500 text-white",
        error:
          "bg-red-500 text-white",
        warning:
          "bg-amber-500 text-white",
        info:
          "bg-blue-500 text-white",

        // Gradients
        magic:
          "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
        neon:
          "bg-gradient-to-r from-cyan-500 to-blue-500 text-white",

        // Styles alternatifs
        outline:
          "bg-transparent border-2 border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]",
        subtle:
          "bg-[rgba(139,92,246,0.1)] text-[var(--color-brand-primary)] border border-[rgba(139,92,246,0.2)]",
      },

      /**
       * Taille du badge
       */
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-1 text-sm",
        lg: "px-3 py-1.5 text-base",
      },

      /**
       * Effet glow
       */
      glow: {
        true: "shadow-[var(--shadow-glow-purple)]",
        false: "",
      },

      /**
       * Effet de pulse (animation)
       */
      pulse: {
        true: "animate-pulse",
        false: "",
      },
    },

    // Compound variants
    compoundVariants: [
      {
        variant: "magic",
        glow: true,
        className: "shadow-[var(--shadow-glow-purple)]",
      },
      {
        variant: "neon",
        glow: true,
        className: "shadow-[0_4px_16px_rgba(6,182,212,0.3)]",
      },
    ],

    defaultVariants: {
      variant: "default",
      size: "md",
      glow: false,
      pulse: false,
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /**
   * Contenu du badge
   */
  children: ReactNode;

  /**
   * Classes CSS additionnelles
   */
  className?: string;

  /**
   * Icône à gauche
   */
  leftIcon?: ReactNode;

  /**
   * Icône à droite
   */
  rightIcon?: ReactNode;

  /**
   * Si true, affiche un point lumineux
   */
  dot?: boolean;

  /**
   * Couleur du point (si dot=true)
   */
  dotColor?: "green" | "red" | "yellow" | "blue";
}

export const Badge = ({
  variant,
  size,
  glow,
  pulse,
  className,
  children,
  leftIcon,
  rightIcon,
  dot,
  dotColor = "green",
  ...props
}: BadgeProps) => {
  const dotColors = {
    green: "bg-green-400",
    red: "bg-red-400",
    yellow: "bg-yellow-400",
    blue: "bg-blue-400",
  };

  return (
    <span
      className={cn(badgeVariants({ variant, size, glow, pulse }), className)}
      {...props}
    >
      {/* Dot */}
      {dot && (
        <span
          className={cn(
            "inline-block w-2 h-2 rounded-full",
            dotColors[dotColor],
            pulse && "animate-pulse"
          )}
        />
      )}

      {/* Left Icon */}
      {leftIcon && <span className="inline-flex">{leftIcon}</span>}

      {/* Content */}
      {children}

      {/* Right Icon */}
      {rightIcon && <span className="inline-flex">{rightIcon}</span>}
    </span>
  );
};

/**
 * BadgeGroup - Groupe de badges
 */
export interface BadgeGroupProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export const BadgeGroup = ({ children, className, ...props }: BadgeGroupProps) => {
  return (
    <div className={cn("flex flex-wrap gap-2", className)} {...props}>
      {children}
    </div>
  );
};

export default Badge;
