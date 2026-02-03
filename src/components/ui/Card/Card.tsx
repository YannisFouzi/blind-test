import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

type CardBaseProps<T> = HTMLAttributes<T> & { className?: string; children: React.ReactNode };

const cardVariants = cva(
  "relative rounded-2xl border-2 border-[var(--color-text-primary)] overflow-hidden transition-all duration-200",
  {
    variants: {
      surface: {
        base: "bg-[var(--color-surface-base)]",
        elevated: "bg-[var(--color-surface-elevated)]",
        overlay: "bg-[var(--color-surface-overlay)]",
      },
      glow: {
        none: "",
        purple: "shadow-[var(--shadow-glow-purple)]",
        pink: "shadow-[var(--shadow-glow-pink)]",
        gold: "shadow-[var(--shadow-glow-gold)]",
      },
      size: {
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
        xl: "p-10",
      },
      interactive: {
        true: "cursor-pointer",
        false: "",
      },
      rounded: {
        sm: "rounded-lg",
        md: "rounded-xl",
        lg: "rounded-2xl",
        xl: "rounded-3xl",
      },
    },
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
  children: React.ReactNode;
  className?: string;
  blur?: boolean;
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
        animatedBorder &&
          "before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-purple-500 before:via-pink-500 before:to-purple-500 before:opacity-100 before:transition-opacity before:duration-500 before:-z-10",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export type CardHeaderProps = CardBaseProps<HTMLDivElement>;

export const CardHeader = ({ children, className, ...props }: CardHeaderProps) => {
  return (
    <div className={cn("flex flex-col space-y-1.5", className)} {...props}>
      {children}
    </div>
  );
};

export interface CardTitleProps extends CardBaseProps<HTMLHeadingElement> {
  as?: HeadingTag;
}

export const CardTitle = ({
  children,
  className,
  as: Component = "h3",
  ...props
}: CardTitleProps) => {
  return (
    <Component
      className={cn("text-2xl font-bold leading-none tracking-tight text-[var(--color-text-primary)]", className)}
      {...props}
    >
      {children}
    </Component>
  );
};

export type CardDescriptionProps = CardBaseProps<HTMLParagraphElement>;

export const CardDescription = ({
  children,
  className,
  ...props
}: CardDescriptionProps) => {
  return (
    <p className={cn("text-sm text-[var(--color-text-secondary)]", className)} {...props}>
      {children}
    </p>
  );
};

export type CardContentProps = CardBaseProps<HTMLDivElement>;

export const CardContent = ({ children, className, ...props }: CardContentProps) => {
  return (
    <div className={cn("pt-0", className)} {...props}>
      {children}
    </div>
  );
};

export type CardFooterProps = CardBaseProps<HTMLDivElement>;

export const CardFooter = ({ children, className, ...props }: CardFooterProps) => {
  return (
    <div className={cn("flex items-center pt-4", className)} {...props}>
      {children}
    </div>
  );
};

export default Card;
