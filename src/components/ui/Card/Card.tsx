import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

/**
 * Card Component
 *
 * Composant Card atomique avec variants pour différents styles.
 * Utilise les design tokens de config/design-tokens.ts
 *
 * @example
 * ```tsx
 * <Card surface="elevated" glow="purple" size="lg" interactive>
 *   <CardContent />
 * </Card>
 * ```
 */

const cardVariants = cva(
  // Base styles - appliqués à tous les variants
  "relative rounded-lg border overflow-hidden transition-all duration-300",
  {
    variants: {
      /**
       * Surface variant - Niveau de profondeur visuelle
       */
      surface: {
        base: "bg-[var(--color-surface-base)] border-[rgba(255,255,255,0.05)]",
        elevated: "bg-[var(--color-surface-elevated)] border-[rgba(255,255,255,0.1)]",
        overlay: "bg-[var(--color-surface-overlay)] border-[rgba(255,255,255,0.2)]",
      },

      /**
       * Glow variant - Effet de brillance colorée
       */
      glow: {
        none: "",
        purple: "shadow-[var(--shadow-glow-purple)]",
        pink: "shadow-[var(--shadow-glow-pink)]",
        gold: "shadow-[var(--shadow-glow-gold)]",
      },

      /**
       * Size variant - Padding interne
       */
      size: {
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
        xl: "p-10",
      },

      /**
       * Interactive variant - Effets hover/active
       */
      interactive: {
        true: "cursor-pointer hover:scale-[1.02] hover:border-[rgba(255,255,255,0.3)] active:scale-[0.98]",
        false: "",
      },

      /**
       * Border radius variant
       */
      rounded: {
        sm: "rounded-lg",
        md: "rounded-xl",
        lg: "rounded-2xl",
        xl: "rounded-3xl",
      },
    },

    // Compound variants - Combinaisons spéciales
    compoundVariants: [
      {
        interactive: true,
        glow: "purple",
        className: "hover:shadow-[0_12px_48px_rgba(139,92,246,0.5)]",
      },
      {
        interactive: true,
        glow: "pink",
        className: "hover:shadow-[0_12px_48px_rgba(236,72,153,0.5)]",
      },
      {
        interactive: true,
        glow: "gold",
        className: "hover:shadow-[0_12px_48px_rgba(245,158,11,0.5)]",
      },
    ],

    // Default variants
    defaultVariants: {
      surface: "base",
      glow: "none",
      size: "md",
      interactive: false,
      rounded: "lg",
    },
  }
);

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  /**
   * Contenu de la carte
   */
  children: React.ReactNode;

  /**
   * Classes CSS additionnelles
   */
  className?: string;

  /**
   * Si true, ajoute un effet de backdrop blur
   */
  blur?: boolean;

  /**
   * Si true, ajoute un gradient animé sur la bordure
   */
  animatedBorder?: boolean;
}

export const Card = ({
  surface,
  glow,
  size,
  interactive,
  rounded,
  className,
  children,
  blur,
  animatedBorder,
  ...props
}: CardProps) => {
  return (
    <div
      className={cn(
        cardVariants({ surface, glow, size, interactive, rounded }),
        blur && "backdrop-blur-sm",
        animatedBorder && "before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-purple-500 before:via-pink-500 before:to-purple-500 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 before:-z-10",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * CardHeader - En-tête de carte avec titre et description
 */
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader = ({ children, className, ...props }: CardHeaderProps) => {
  return (
    <div className={cn("flex flex-col space-y-1.5", className)} {...props}>
      {children}
    </div>
  );
};

/**
 * CardTitle - Titre de carte
 */
export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

export const CardTitle = ({
  children,
  className,
  as: Component = "h3",
  ...props
}: CardTitleProps) => {
  return (
    <Component
      className={cn("text-2xl font-semibold leading-none tracking-tight text-white", className)}
      {...props}
    >
      {children}
    </Component>
  );
};

/**
 * CardDescription - Description de carte
 */
export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
  className?: string;
}

export const CardDescription = ({
  children,
  className,
  ...props
}: CardDescriptionProps) => {
  return (
    <p
      className={cn("text-sm text-gray-400", className)}
      {...props}
    >
      {children}
    </p>
  );
};

/**
 * CardContent - Contenu principal de la carte
 */
export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const CardContent = ({
  children,
  className,
  ...props
}: CardContentProps) => {
  return (
    <div className={cn("pt-0", className)} {...props}>
      {children}
    </div>
  );
};

/**
 * CardFooter - Pied de page de la carte
 */
export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter = ({
  children,
  className,
  ...props
}: CardFooterProps) => {
  return (
    <div
      className={cn("flex items-center pt-4", className)}
      {...props}
    >
      {children}
    </div>
  );
};

// Export all components
export default Card;
