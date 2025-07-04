import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "success" | "danger" | "warning";
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
}

export const Button = ({
  children,
  onClick,
  variant = "primary",
  size = "medium",
  disabled = false,
  className = "",
  type = "button",
}: ButtonProps) => {
  const baseClasses =
    "font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variantClasses = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500",
    secondary: "bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500",
    success: "bg-green-600 hover:bg-green-700 text-white focus:ring-green-500",
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
    warning:
      "bg-yellow-600 hover:bg-yellow-700 text-white focus:ring-yellow-500",
  };

  const sizeClasses = {
    small: "px-4 py-2 text-sm",
    medium: "px-6 py-3 text-base",
    large: "px-8 py-4 text-lg",
  };

  const disabledClasses = "opacity-50 cursor-not-allowed";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${disabled ? disabledClasses : ""}
        ${className}
      `}
    >
      {children}
    </button>
  );
};
