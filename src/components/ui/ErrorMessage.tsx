import { ReactNode } from "react";

interface ErrorMessageProps {
  title?: string;
  message: string;
  icon?: string;
  onRetry?: () => void;
  children?: ReactNode;
  className?: string;
}

export const ErrorMessage = ({
  title = "Erreur",
  message,
  icon = "⚠️",
  onRetry,
  children,
  className = "",
}: ErrorMessageProps) => {
  return (
    <div
      className={`bg-red-500/20 border border-red-500 rounded-2xl p-8 text-center ${className}`}
    >
      <div className="text-6xl mb-4">{icon}</div>
      <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>
      <p className="text-red-300 text-lg mb-6">{message}</p>

      <div className="flex justify-center gap-4">
        {onRetry && (
          <button
            onClick={onRetry}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Réessayer
          </button>
        )}
        {children}
      </div>
    </div>
  );
};
