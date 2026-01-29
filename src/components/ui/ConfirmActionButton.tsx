"use client";

import { useState, useCallback } from "react";
import { ConfirmModal } from "./ConfirmModal";

export interface ConfirmActionButtonProps {
  /** Libellé du bouton */
  buttonLabel: string;
  /** Titre de la modale de confirmation */
  title: string;
  /** Message de la modale */
  message: string;
  /** Texte du bouton de confirmation (ex. "Quitter") */
  confirmText?: string;
  /** Texte du bouton d'annulation */
  cancelText?: string;
  /** Callback appelé quand l'utilisateur confirme */
  onConfirm: () => void;
  /** Variante visuelle de la modale (danger = rouge, warning = orange) */
  variant?: "danger" | "warning";
  /** Classes CSS du bouton (ex. "magic-button px-4 py-2") */
  className?: string;
  /** Contenu optionnel à afficher dans le bouton (icône + texte) */
  children?: React.ReactNode;
}

/**
 * Bouton qui ouvre une modale de confirmation avant d'exécuter une action.
 * Réutilisable pour "Quitter la salle", "Quitter la partie", "Retour à l'accueil", etc.
 */
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
