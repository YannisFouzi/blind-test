interface LoadingSpinnerProps {
  size?: "small" | "medium" | "large";
  message?: string;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<LoadingSpinnerProps["size"]>, string> = {
  small: "h-6 w-6",
  medium: "h-12 w-12",
  large: "h-16 w-16",
};

export const LoadingSpinner = ({
  size = "medium",
  message = "Chargement...",
  className = "",
}: LoadingSpinnerProps) => {
  return (
    <div className={`text-[var(--color-text-primary)] text-center ${className}`}>
      <div
        className={`animate-spin rounded-full border-4 border-[#1B1B1B] border-t-transparent mx-auto mb-4 ${SIZE_CLASSES[size]}`}
      />
      {message && <p className="text-lg font-semibold">{message}</p>}
    </div>
  );
};
