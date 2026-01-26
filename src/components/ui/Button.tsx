"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { pressable } from "@/styles/ui";

const buttonVariants = cva(
  cn(
    pressable,
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-base)] disabled:pointer-events-none disabled:opacity-50"
  ),
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-light)]",
        secondary:
          "bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-overlay)]",
        success:
          "bg-[#86efac] hover:bg-[#4ade80]",
        danger:
          "bg-[#fca5a5] hover:bg-[#f87171]",
        warning:
          "bg-[#fde047] hover:bg-[#facc15]",
        ghost:
          "bg-transparent hover:bg-[var(--color-surface-overlay)]",
      },
      size: {
        sm: "px-3 py-2 text-xs",
        md: "px-4 py-2.5 text-sm",
        lg: "px-6 py-3 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
