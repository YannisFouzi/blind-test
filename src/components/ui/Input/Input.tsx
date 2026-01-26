import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, ReactNode } from "react";

/**
 * Input Component
 *
 * Composant Input atomique avec variants pour différents états.
 * Utilise les design tokens de config/design-tokens.ts
 *
 * @example
 * ```tsx
 * <Input
 *   placeholder="Entrez votre nom..."
 *   error="Ce champ est requis"
 * />
 *
 * <Input
 *   leftIcon={<Search />}
 *   placeholder="Rechercher..."
 * />
 * ```
 */

const inputVariants = cva(
  // Base styles
  "flex w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
  {
    variants: {
      /**
       * Variant de l'input
       */
      variant: {
        default:
          "border-[rgba(255,255,255,0.1)] focus:border-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]",
        filled:
          "bg-[var(--color-surface-elevated)] border-transparent focus:border-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]",
        flushed:
          "border-b-2 border-t-0 border-x-0 rounded-none px-0 focus:border-[var(--color-brand-primary)] focus:ring-0",
      },

      /**
       * Taille de l'input
       */
      inputSize: {
        sm: "h-9 text-sm",
        md: "h-11 text-base",
        lg: "h-14 text-lg",
      },

      /**
       * État d'erreur
       */
      error: {
        true: "border-red-500 focus:border-red-500 focus:ring-red-500",
        false: "",
      },

      /**
       * État de succès
       */
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
  /**
   * Message d'erreur à afficher
   */
  errorMessage?: string;

  /**
   * Message d'aide à afficher
   */
  helperText?: string;

  /**
   * Label de l'input
   */
  label?: string;

  /**
   * Icône à gauche de l'input
   */
  leftIcon?: ReactNode;

  /**
   * Icône à droite de l'input
   */
  rightIcon?: ReactNode;

  /**
   * Classes CSS additionnelles
   */
  className?: string;

  /**
   * Classes pour le wrapper
   */
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
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-white mb-2">
          {label}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        {/* Left Icon */}
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {leftIcon}
          </div>
        )}

        {/* Input */}
        <input
          className={cn(
            inputVariants({ variant, inputSize, error: hasError, success }),
            leftIcon && "pl-10",
            rightIcon && "pr-10",
            className
          )}
          {...props}
        />

        {/* Right Icon */}
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {rightIcon}
          </div>
        )}
      </div>

      {/* Helper Text / Error Message */}
      {(helperText || errorMessage) && (
        <p
          className={cn(
            "mt-2 text-sm",
            hasError ? "text-red-400" : "text-gray-400"
          )}
        >
          {errorMessage || helperText}
        </p>
      )}
    </div>
  );
};

/**
 * Textarea Component
 */
const textareaVariants = cva(
  "flex w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-y",
  {
    variants: {
      variant: {
        default:
          "border-[rgba(255,255,255,0.1)] focus:border-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]",
        filled:
          "bg-[var(--color-surface-elevated)] border-transparent focus:border-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]",
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
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
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
      {label && (
        <label className="block text-sm font-medium text-white mb-2">
          {label}
        </label>
      )}

      <textarea
        className={cn(textareaVariants({ variant, error: hasError }), className)}
        {...props}
      />

      {(helperText || errorMessage) && (
        <p
          className={cn(
            "mt-2 text-sm",
            hasError ? "text-red-400" : "text-gray-400"
          )}
        >
          {errorMessage || helperText}
        </p>
      )}
    </div>
  );
};

export default Input;
