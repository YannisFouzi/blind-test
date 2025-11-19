"use client";

import { useEffect, useState } from "react";

export interface ToastMessage {
  id: string;
  type: "success" | "info" | "warning" | "error";
  title: string;
  message: string;
  duration?: number;
}

interface PreloadToastProps {
  messages: ToastMessage[];
  onRemove: (id: string) => void;
}

export const PreloadToast = ({ messages, onRemove }: PreloadToastProps) => {
  const getToastStyles = (type: ToastMessage["type"]) => {
    switch (type) {
      case "success":
        return "bg-green-800/90 border-green-600 text-green-100";
      case "info":
        return "bg-blue-800/90 border-blue-600 text-blue-100";
      case "warning":
        return "bg-orange-800/90 border-orange-600 text-orange-100";
      case "error":
        return "bg-red-800/90 border-red-600 text-red-100";
      default:
        return "bg-gray-800/90 border-gray-600 text-gray-100";
    }
  };

  const getEmoji = (type: ToastMessage["type"]) => {
    switch (type) {
      case "success":
        return "✅";
      case "info":
        return "ℹ️";
      case "warning":
        return "⚠️";
      case "error":
        return "❌";
      default:
        return "📢";
    }
  };

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 space-y-2 max-w-md w-full px-4">
      {messages.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          styles={getToastStyles(toast.type)}
          emoji={getEmoji(toast.type)}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: ToastMessage;
  styles: string;
  emoji: string;
  onRemove: (id: string) => void;
}

const ToastItem = ({ toast, styles, emoji, onRemove }: ToastItemProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animation d'entrée
    setTimeout(() => setIsVisible(true), 10);

    // Auto-remove
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, toast.duration || 3000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div
      className={`${styles} border backdrop-blur-sm rounded-lg p-3 shadow-lg transition-all duration-300 transform ${
        isVisible
          ? "translate-y-0 opacity-100 scale-100"
          : "translate-y-[-20px] opacity-0 scale-95"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0">{emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{toast.title}</div>
          <div className="text-xs opacity-90 mt-1">{toast.message}</div>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onRemove(toast.id), 300);
          }}
          className="text-sm opacity-60 hover:opacity-100 flex-shrink-0"
        >
          ×
        </button>
      </div>
    </div>
  );
};
