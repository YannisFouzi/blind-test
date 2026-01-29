"use client";

import { LogOut } from "lucide-react";
import { ConfirmActionButton } from "./ConfirmActionButton";

export interface QuitRoomButtonProps {
  /** Callback appelé quand l'utilisateur confirme (quitter la room + naviguer) */
  onConfirm: () => void;
  /** Titre de la modale (ex. "Quitter la salle ?" ou "Quitter la partie ?") */
  title?: string;
  /** Message de la modale */
  message?: string;
  /** Classes CSS additionnelles pour le conteneur (ex. position) */
  className?: string;
}

const DEFAULT_TITLE = "Quitter la salle ?";
const DEFAULT_MESSAGE = "Vous allez quitter la room et retourner à l'accueil.";
const BUTTON_CLASS =
  "magic-button px-3 py-2 sm:px-6 sm:py-3 flex items-center gap-1 sm:gap-2 text-sm sm:text-base bg-[#fca5a5] hover:bg-[#f87171]";

/**
 * Bouton "Quitter" avec confirmation : même rendu en salle d'attente et en jeu
 * (icône LogOut + texte "Quitter", style néo-brutaliste rose).
 */
export const QuitRoomButton = ({
  onConfirm,
  title = DEFAULT_TITLE,
  message = DEFAULT_MESSAGE,
  className,
}: QuitRoomButtonProps) => (
  <div className={className}>
    <ConfirmActionButton
      buttonLabel="Quitter"
      title={title}
      message={message}
      confirmText="Quitter"
      cancelText="Annuler"
      onConfirm={onConfirm}
      className={BUTTON_CLASS}
    >
      <LogOut className="text-base sm:text-lg" />
      <span className="hidden sm:inline">Quitter</span>
    </ConfirmActionButton>
  </div>
);
