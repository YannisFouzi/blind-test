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
    <div className={`text-white text-center ${className}`}>
      <div
        className={`animate-spin rounded-full border-b-2 border-white mx-auto mb-4 ${sizeClasses[size]}`}
      ></div>
      {message && <p className="text-xl">{message}</p>}
    </div>
  );
};
