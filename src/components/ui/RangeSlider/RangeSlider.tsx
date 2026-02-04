"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const sliderTrackVariants = cva(
  "relative h-2 w-full grow overflow-hidden rounded-full border-2 border-black shadow-[2px_2px_0_#1B1B1B] bg-white",
  {
    variants: {
      variant: {
        default: "",
        compact: "h-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const sliderRangeVariants = cva(
  "absolute h-full rounded-full bg-[#FDE68A]",
  {
    variants: {
      variant: {
        default: "",
        compact: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const sliderThumbVariants = cva(
  "block rounded-full bg-white border-2 border-black shadow-[2px_2px_0_#1B1B1B] transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDE68A] focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        default:
          "h-5 w-5 cursor-grab active:cursor-grabbing active:scale-110 hover:scale-105",
        compact: "h-4 w-4 cursor-pointer hover:scale-105",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface RangeSliderProps
  extends Omit<
      React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>,
      "value" | "onValueChange"
    >,
    VariantProps<typeof sliderTrackVariants> {
  value: number;
  onValueChange: (value: number) => void;
  className?: string;
  trackClassName?: string;
  rangeClassName?: string;
  thumbClassName?: string;
}

export const RangeSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  RangeSliderProps
>(
  (
    {
      value,
      onValueChange,
      min = 0,
      max = 100,
      step = 1,
      disabled,
      className,
      trackClassName,
      rangeClassName,
      thumbClassName,
      variant,
      ...props
    },
    ref
  ) => {
    return (
      <SliderPrimitive.Root
        ref={ref}
        value={[value]}
        onValueChange={(values) => onValueChange(values[0])}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={cn("relative flex w-full touch-none select-none items-center", className)}
        {...props}
      >
        <SliderPrimitive.Track className={cn(sliderTrackVariants({ variant }), trackClassName)}>
          <SliderPrimitive.Range className={cn(sliderRangeVariants({ variant }), rangeClassName)} />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className={cn(sliderThumbVariants({ variant }), thumbClassName)} />
      </SliderPrimitive.Root>
    );
  }
);
RangeSlider.displayName = "RangeSlider";

export interface RangeSliderFieldProps {
  min: number;
  max: number;
  value: number;
  onValueChange: (value: number) => void;
  disabled?: boolean;
  step?: number;
  className?: string;
  sliderClassName?: string;
  trackClassName?: string;
  rangeClassName?: string;
  thumbClassName?: string;
  numberInputClassName?: string;
  numberInputAriaLabel?: string;
  sliderVariant?: VariantProps<typeof sliderTrackVariants>["variant"];
  valueSuffix?: string;
  suffixClassName?: string;
}

export const RangeSliderField = ({
  min,
  max,
  value,
  onValueChange,
  disabled = false,
  step,
  className,
  sliderClassName,
  trackClassName,
  rangeClassName,
  thumbClassName,
  numberInputClassName,
  numberInputAriaLabel,
  sliderVariant,
  valueSuffix,
  suffixClassName,
}: RangeSliderFieldProps) => {
  const hasSuffix = Boolean(valueSuffix);
  return (
    <div className={cn("flex items-center gap-4 min-h-[52px]", disabled && "opacity-60", className)}>
      <RangeSlider
        min={min}
        max={max}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        step={step}
        variant={sliderVariant}
        className={sliderClassName}
        trackClassName={trackClassName}
        rangeClassName={rangeClassName}
        thumbClassName={thumbClassName}
      />
      <div className="relative">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onValueChange(Number(event.target.value))}
          disabled={disabled}
          step={step}
          aria-label={numberInputAriaLabel}
          className={cn(
            "w-20 px-3 py-1.5 bg-white border-2 border-black rounded-lg text-black text-sm font-semibold tabular-nums shadow-[2px_2px_0_#1B1B1B] transition-all duration-150",
            hasSuffix ? "w-24 pr-10 text-right" : "text-center",
            "focus:outline-none focus:ring-2 focus:ring-[#FDE68A] focus:ring-offset-1",
            "hover:shadow-[2px_2px_0_#1B1B1B]",
            "disabled:cursor-not-allowed disabled:opacity-60",
            numberInputClassName
          )}
        />
        {hasSuffix && (
          <span
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-secondary)] pointer-events-none",
              disabled && "opacity-60",
              suffixClassName
            )}
          >
            {valueSuffix}
          </span>
        )}
      </div>
    </div>
  );
};
