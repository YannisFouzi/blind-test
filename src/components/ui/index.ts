/**
 * UI Components Library
 *
 * Design System basé sur CVA (class-variance-authority) + Tailwind CSS
 * Tous les composants utilisent les design tokens de config/design-tokens.ts
 */

// === NOUVEAUX COMPOSANTS (CVA) ===

// Card
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  type CardProps,
} from "./Card";

// Button (nouveau avec CVA)
export {
  Button,
  ButtonGroup,
  buttonVariants,
  type ButtonProps,
  type ButtonGroupProps,
} from "./Button/index";

// Input
export { Input, Textarea, type InputProps, type TextareaProps } from "./Input";

// Badge
export { Badge, BadgeGroup, type BadgeProps } from "./Badge";

// === COMPOSANTS EXISTANTS ===

export { ConfirmModal } from "./ConfirmModal";
export { ErrorMessage } from "./ErrorMessage";
export { LoadingSpinner } from "./LoadingSpinner";
export { Toaster } from "./Toaster";
export * from "./dialog";
