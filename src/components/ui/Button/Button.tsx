import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { pressable } from "@/styles/ui";

/**
 * Button Component
 *
 * Composant Button atomique avec variants pour différents styles.
 * Utilise les design tokens de config/design-tokens.ts
 *
 * @example
 * ```tsx
 * <Button variant="magic" size="lg" loading>
 *   Jouer
 * </Button>
 *
 * <Button variant="outline" leftIcon={<Plus />}>
 *   Ajouter
 * </Button>
 * ```
 */

export const buttonVariants = cva(
  // Base styles
  cn(
    pressable,
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-base)] disabled:pointer-events-none disabled:opacity-50"
  ),
  {
    variants: {
      /**
       * Variant de style principal
       */
      variant: {
        // Boutons principaux
        primary:
          "bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-light)]",
        secondary:
          "bg-white hover:bg-[var(--color-surface-overlay)]",
        accent:
          "bg-[var(--color-brand-secondary)] text-[#1B1B1B] hover:bg-[#60a5fa]",

        // Bouton magic (gradient violet-rose)
        magic:
          "bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-light)]",

        // Bouton neon (gradient cyan-bleu)
        neon:
          "bg-[#67e8f9] text-[#1B1B1B] hover:bg-[#22d3ee]",

        // Boutons secondaires
        outline: "bg-transparent",
        ghost: "bg-transparent hover:bg-[var(--color-surface-overlay)]",
        link: "bg-transparent hover:bg-[var(--color-surface-overlay)]",

        // États
        destructive:
          "bg-[#fca5a5] text-[#1B1B1B] hover:bg-[#f87171]",
        success:
          "bg-[#86efac] text-[#1B1B1B] hover:bg-[#4ade80]",
      },

      /**
       * Taille du bouton
       */
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-5 text-base",
        lg: "h-14 px-8 text-lg",
        xl: "h-16 px-10 text-xl",
        icon: "h-10 w-10",
      },

      /**
       * Largeur pleine
       */
      fullWidth: {
        true: "w-full",
        false: "",
      },

      /**
       * Effet glow (pulsation)
       */
      glow: {
        true: "animate-glow-pulse",
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
        className: "shadow-[0_8px_32px_rgba(6,182,212,0.3)]",
      },
    ],

    // Default variants
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false,
      glow: false,
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * Afficher un loader (désactive le bouton)
   */
  loading?: boolean;

  /**
   * Icône à gauche du texte
   */
  leftIcon?: ReactNode;

  /**
   * Icône à droite du texte
   */
  rightIcon?: ReactNode;

  /**
   * Classes CSS additionnelles
   */
  className?: string;

  /**
   * Contenu du bouton
   */
  children?: ReactNode;
}

export const Button = ({
  variant,
  size,
  fullWidth,
  glow,
  loading,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) => {
  const isDisabled = disabled || loading;

  return (
    <button
      className={cn(buttonVariants({ variant, size, fullWidth, glow }), className)}
      disabled={isDisabled}
      {...props}
    >
      {/* Loader (si loading) */}
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}

      {/* Left Icon (si pas loading) */}
      {!loading && leftIcon && <span className="mr-2">{leftIcon}</span>}

      {/* Contenu */}
      {children}

      {/* Right Icon */}
      {!loading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};

/**
 * ButtonGroup - Groupe de boutons
 */
export interface ButtonGroupProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  /**
   * Orientation du groupe
   */
  orientation?: "horizontal" | "vertical";
}

export const ButtonGroup = ({
  children,
  className,
  orientation = "horizontal",
  ...props
}: ButtonGroupProps) => {
  return (
    <div
      className={cn(
        "flex",
        orientation === "horizontal" ? "flex-row space-x-2" : "flex-col space-y-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default Button;
