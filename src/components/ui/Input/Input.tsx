import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

type FieldMessageProps = {
  helperText?: string;
  errorMessage?: string;
  hasError: boolean;
};

type FieldLabelProps = {
  label?: string;
};

const FieldLabel = ({ label }: FieldLabelProps) => {
  if (!label) return null;
  return (
    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
      {label}
    </label>
  );
};

const FieldMessage = ({ helperText, errorMessage, hasError }: FieldMessageProps) => {
  if (!helperText && !errorMessage) return null;
  return (
    <p className={cn("mt-2 text-sm", hasError ? "text-red-600" : "text-[var(--color-text-secondary)]")}> 
      {errorMessage || helperText}
    </p>
  );
};

const inputVariants = cva(
  "flex w-full rounded-xl border-2 border-[var(--color-text-primary)] bg-white px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-secondary)] focus:ring-offset-2 focus:ring-offset-[var(--color-surface-base)] disabled:cursor-not-allowed disabled:opacity-50 transition-all",
  {
    variants: {
      variant: {
        default: "focus:border-[var(--color-text-primary)]",
        filled: "bg-[var(--color-surface-overlay)]",
        flushed:
          "border-b-2 border-t-0 border-x-0 rounded-none px-0 focus:border-[var(--color-brand-primary)] focus:ring-0",
      },
      inputSize: {
        sm: "h-9 text-sm",
        md: "h-11 text-base",
        lg: "h-14 text-lg",
      },
      error: {
        true: "border-red-500 focus:border-red-500 focus:ring-red-500",
        false: "",
      },
      success: {
        true: "border-green-500 focus:border-green-500 focus:ring-green-500",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "md",
      error: false,
      success: false,
    },
  }
);

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  errorMessage?: string;
  helperText?: string;
  label?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
  wrapperClassName?: string;
}

export const Input = ({
  variant,
  inputSize,
  error,
  success,
  errorMessage,
  helperText,
  label,
  leftIcon,
  rightIcon,
  className,
  wrapperClassName,
  ...props
}: InputProps) => {
  const hasError = error || !!errorMessage;

  return (
    <div className={cn("w-full", wrapperClassName)}>
      <FieldLabel label={label} />

      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]">
            {leftIcon}
          </div>
        )}

        <input
          className={cn(
            inputVariants({ variant, inputSize, error: hasError, success }),
            leftIcon && "pl-10",
            rightIcon && "pr-10",
            className
          )}
          {...props}
        />

        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]">
            {rightIcon}
          </div>
        )}
      </div>

      <FieldMessage helperText={helperText} errorMessage={errorMessage} hasError={hasError} />
    </div>
  );
};

const textareaVariants = cva(
  "flex w-full rounded-xl border-2 border-[var(--color-text-primary)] bg-white px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-secondary)] focus:ring-offset-2 focus:ring-offset-[var(--color-surface-base)] disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-y",
  {
    variants: {
      variant: {
        default: "focus:border-[var(--color-text-primary)]",
        filled: "bg-[var(--color-surface-overlay)]",
      },
      error: {
        true: "border-red-500 focus:border-red-500 focus:ring-red-500",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      error: false,
    },
  }
);

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {
  errorMessage?: string;
  helperText?: string;
  label?: string;
  className?: string;
  wrapperClassName?: string;
}

export const Textarea = ({
  variant,
  error,
  errorMessage,
  helperText,
  label,
  className,
  wrapperClassName,
  ...props
}: TextareaProps) => {
  const hasError = error || !!errorMessage;

  return (
    <div className={cn("w-full", wrapperClassName)}>
      <FieldLabel label={label} />

      <textarea className={cn(textareaVariants({ variant, error: hasError }), className)} {...props} />

      <FieldMessage helperText={helperText} errorMessage={errorMessage} hasError={hasError} />
    </div>
  );
};

export default Input;
