import type { HTMLAttributes, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

type DotColor = "green" | "red" | "yellow" | "blue";

const DOT_COLORS: Record<DotColor, string> = {
  green: "bg-green-400",
  red: "bg-red-400",
  yellow: "bg-yellow-400",
  blue: "bg-blue-400",
};

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border-2 border-[#1B1B1B] font-semibold text-[var(--color-text-primary)] shadow-[2px_2px_0_#1B1B1B] transition-transform duration-150",
  {
    variants: {
      variant: {
        default: "bg-white",
        primary: "bg-[var(--color-brand-primary)]",
        secondary: "bg-[var(--color-brand-secondary)] text-[#1B1B1B]",
        accent: "bg-[var(--color-brand-accent)] text-[#1B1B1B]",
        success: "bg-[#86efac] text-[#1B1B1B]",
        error: "bg-[#fca5a5] text-[#1B1B1B]",
        warning: "bg-[#fde047] text-[#1B1B1B]",
        info: "bg-[#93c5fd] text-[#1B1B1B]",
        magic: "bg-[var(--color-brand-primary)]",
        neon: "bg-[#67e8f9] text-[#1B1B1B]",
        outline: "bg-transparent text-[#1B1B1B]",
        subtle: "bg-[var(--color-surface-overlay)] text-[#1B1B1B]",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-1 text-sm",
        lg: "px-3 py-1.5 text-base",
      },
      glow: {
        true: "shadow-[var(--shadow-glow-purple)]",
        false: "",
      },
      pulse: {
        true: "animate-pulse",
        false: "",
      },
    },
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
  children: ReactNode;
  className?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  dot?: boolean;
  dotColor?: DotColor;
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
  return (
    <span
      className={cn(badgeVariants({ variant, size, glow, pulse }), className)}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "inline-block w-2 h-2 rounded-full",
            DOT_COLORS[dotColor],
            pulse && "animate-pulse"
          )}
        />
      )}

      {leftIcon && <span className="inline-flex">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="inline-flex">{rightIcon}</span>}
    </span>
  );
};

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
