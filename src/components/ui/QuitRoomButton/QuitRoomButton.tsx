"use client";

import { LogOut } from "lucide-react";
import { ConfirmActionButton } from "@/components/ui/ConfirmActionButton";

export interface QuitRoomButtonProps {
  onConfirm: () => void;
  title?: string;
  message?: string;
  className?: string;
  showLabelOnMobile?: boolean;
}

const DEFAULT_TITLE = "Quitter la salle ?";
const DEFAULT_MESSAGE = "Vous allez quitter la room et retourner a l'accueil.";
const BUTTON_CLASS =
  "magic-button home-button px-3 py-2 sm:px-6 sm:py-3 flex items-center gap-1 sm:gap-2 text-sm sm:text-base bg-[#fca5a5] hover:bg-[#f87171]";

export const QuitRoomButton = ({
  onConfirm,
  title = DEFAULT_TITLE,
  message = DEFAULT_MESSAGE,
  className,
  showLabelOnMobile = false,
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
      <span className={showLabelOnMobile ? "inline" : "hidden sm:inline"}>Quitter</span>
    </ConfirmActionButton>
  </div>
);
