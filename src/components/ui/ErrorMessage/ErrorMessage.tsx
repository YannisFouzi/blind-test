import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ErrorMessageProps {
  title?: string;
  message: string;
  icon?: string;
  onRetry?: () => void;
  children?: ReactNode;
  className?: string;
}

const DEFAULT_TITLE = "Erreur";
const DEFAULT_ICON = "!";

export const ErrorMessage = ({
  title = DEFAULT_TITLE,
  message,
  icon = DEFAULT_ICON,
  onRetry,
  children,
  className,
}: ErrorMessageProps) => {
  return (
    <div
      className={cn(
        "bg-[#FFE5E5] border-[3px] border-[#1B1B1B] rounded-2xl p-8 text-center shadow-[4px_4px_0_#1B1B1B]",
        className
      )}
    >
      <div className="text-6xl mb-4">{icon}</div>
      <h2 className="text-2xl font-bold text-[#1B1B1B] mb-4">{title}</h2>
      <p className="text-red-700 text-lg mb-6">{message}</p>

      <div className="flex justify-center gap-4">
        {onRetry && (
          <button onClick={onRetry} className="magic-button px-6 py-3">
            Reessayer
          </button>
        )}
        {children}
      </div>
    </div>
  );
};
