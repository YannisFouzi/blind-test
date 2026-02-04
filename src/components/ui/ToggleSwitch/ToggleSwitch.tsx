"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const switchVariants = cva(
  "relative inline-flex items-center rounded-full border-2 border-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-base)] disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      size: {
        sm: "h-5 w-9",
        md: "h-7 w-12",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

const knobVariants = cva(
  "inline-block rounded-full border-2 border-black bg-white transition-transform",
  {
    variants: {
      size: {
        sm: "h-3.5 w-3.5",
        md: "h-5 w-5",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

type ToggleSwitchBaseProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  ariaLabel?: string;
  onClassName?: string;
  offClassName?: string;
  knobClassName?: string;
};

export interface ToggleSwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange">,
    VariantProps<typeof switchVariants>,
    ToggleSwitchBaseProps {}

export const ToggleSwitch = React.forwardRef<HTMLButtonElement, ToggleSwitchProps>(
  (
    {
      checked,
      onCheckedChange,
      ariaLabel,
      onClassName,
      offClassName,
      className,
      knobClassName,
      size,
      disabled,
      ...props
    },
    ref
  ) => {
    const isChecked = Boolean(checked);
    const trackClass = isChecked
      ? onClassName ?? "bg-[#FDE68A]"
      : offClassName ?? "bg-[var(--color-surface-overlay)]";
    const translateClass =
      size === "sm"
        ? isChecked
          ? "translate-x-4"
          : "translate-x-0.5"
        : isChecked
          ? "translate-x-6"
          : "translate-x-1";

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={isChecked}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && onCheckedChange(!isChecked)}
        className={cn(switchVariants({ size }), trackClass, className)}
        {...props}
      >
        <span className={cn(knobVariants({ size }), translateClass, knobClassName)} />
      </button>
    );
  }
);
ToggleSwitch.displayName = "ToggleSwitch";
