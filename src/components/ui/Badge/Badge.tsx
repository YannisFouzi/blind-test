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
  "inline-flex items-center gap-1 rounded-full border-2 border-[#1B1B1B] font-semibold text-[var(--color-text-primary)] shadow-[2px_2px_0_#1B1B1B] transition-transform duration-150",
  {
    variants: {
      /**
       * Variant de style
       */
      variant: {
        default:
          "bg-white",
        primary:
          "bg-[var(--color-brand-primary)]",
        secondary:
          "bg-[var(--color-brand-secondary)] text-[#1B1B1B]",
        accent:
          "bg-[var(--color-brand-accent)] text-[#1B1B1B]",

        // États
        success:
          "bg-[#86efac] text-[#1B1B1B]",
        error:
          "bg-[#fca5a5] text-[#1B1B1B]",
        warning:
          "bg-[#fde047] text-[#1B1B1B]",
        info:
          "bg-[#93c5fd] text-[#1B1B1B]",

        // Gradients
        magic:
          "bg-[var(--color-brand-primary)]",
        neon:
          "bg-[#67e8f9] text-[#1B1B1B]",

        // Styles alternatifs
        outline:
          "bg-transparent text-[#1B1B1B]",
        subtle:
          "bg-[var(--color-surface-overlay)] text-[#1B1B1B]",
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
