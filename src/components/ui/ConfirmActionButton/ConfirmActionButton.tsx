"use client";

import { useCallback, useState } from "react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export interface ConfirmActionButtonProps {
  buttonLabel: string;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  variant?: "danger" | "warning";
  className?: string;
  children?: React.ReactNode;
}

export const ConfirmActionButton = ({
  buttonLabel,
  title,
  message,
  confirmText = "Confirmer",
  cancelText = "Annuler",
  onConfirm,
  variant = "danger",
  className = "magic-button px-4 py-2 text-sm font-bold",
  children,
}: ConfirmActionButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleConfirm = useCallback(() => {
    onConfirm();
    setIsOpen(false);
  }, [onConfirm]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={className}
        aria-label={buttonLabel}
      >
        {children ?? buttonLabel}
      </button>
      <ConfirmModal
        isOpen={isOpen}
        title={title}
        message={message}
        confirmText={confirmText}
        cancelText={cancelText}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        variant={variant}
      />
    </>
  );
};
