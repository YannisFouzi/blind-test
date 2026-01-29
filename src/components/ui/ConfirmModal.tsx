"use client";

import { Button } from "./Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";

/** Icône avertissement au style du site (néo-brutaliste, bordure noire, fond brand) */
const WarningIcon = ({ variant }: { variant: "danger" | "warning" }) => (
  <span
    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-[#1B1B1B] bg-[var(--color-brand-primary)] text-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B]"
    aria-label={variant === "danger" ? "Attention" : "Avertissement"}
    role="img"
  >
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      {/* Triangle */}
      <path d="M12 2L2 22h20L12 2z" />
      {/* Exclamation bar + point */}
      <path d="M12 9v4M12 16h.01" />
    </svg>
  </span>
);

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  variant?: "danger" | "warning";
}

export const ConfirmModal = ({
  isOpen,
  title,
  message,
  confirmText = "Confirmer",
  cancelText = "Annuler",
  onConfirm,
  onCancel,
  loading = false,
  variant = "danger",
}: ConfirmModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-[var(--color-text-primary)]">
            <WarningIcon variant={variant} />
            {title}
          </DialogTitle>
          <DialogDescription className="text-[var(--color-text-secondary)]">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:space-x-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant === "danger" ? "danger" : "warning"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Traitement..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
