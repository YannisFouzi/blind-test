interface LoadingSpinnerProps {
  size?: "small" | "medium" | "large";
  message?: string;
  className?: string;
}

export const LoadingSpinner = ({
  size = "medium",
  message = "Chargement...",
  className = "",
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    small: "h-6 w-6",
    medium: "h-12 w-12",
    large: "h-16 w-16",
  };

  return (
    <div className={`text-[var(--color-text-primary)] text-center ${className}`}>
      <div
        className={`animate-spin rounded-full border-4 border-[#1B1B1B] border-t-transparent mx-auto mb-4 ${sizeClasses[size]}`}
      ></div>
      {message && <p className="text-lg font-semibold">{message}</p>}
    </div>
  );
};
