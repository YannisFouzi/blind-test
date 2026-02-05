import { memo } from "react";

interface GameActionButtonProps {
  label: string;
  onClick: () => void;
  compact?: boolean;
}

export const GameActionButton = memo(({ label, onClick, compact = false }: GameActionButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`magic-button game-action-button px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-bold${
      compact ? " game-action-button--dense" : ""
    }`}
  >
    <span className="relative z-10 flex items-center gap-2">{label}</span>
  </button>
));

GameActionButton.displayName = "GameActionButton";
