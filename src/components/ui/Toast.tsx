import { useEffect } from "react";

interface ToastProps {
  message: string;
  type: "success" | "error" | "warning" | "info";
  onClose: () => void;
  duration?: number;
}

export const Toast = ({
  message,
  type,
  onClose,
  duration = 5000,
}: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const getToastStyles = () => {
    const baseStyles =
      "fixed top-4 right-4 max-w-md p-4 rounded-lg shadow-lg z-50 transform transition-all duration-300";

    switch (type) {
      case "success":
        return `${baseStyles} bg-green-600 text-white border border-green-500`;
      case "error":
        return `${baseStyles} bg-red-600 text-white border border-red-500`;
      case "warning":
        return `${baseStyles} bg-yellow-600 text-white border border-yellow-500`;
      case "info":
        return `${baseStyles} bg-blue-600 text-white border border-blue-500`;
      default:
        return `${baseStyles} bg-gray-600 text-white border border-gray-500`;
    }
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "info":
        return "ℹ️";
      default:
        return "📢";
    }
  };

  return (
    <div className={getToastStyles()}>
      <div className="flex items-start space-x-3">
        <div className="text-xl">{getIcon()}</div>
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
