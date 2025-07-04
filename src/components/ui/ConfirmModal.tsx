import { Button } from "./Button";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  variant?: "danger" | "warning";
}

export const ConfirmModal = ({
  isOpen,
  title,
  message,
  confirmText = "Confirmer",
  cancelText = "Annuler",
  onConfirm,
  onCancel,
  loading = false,
  variant = "danger",
}: ConfirmModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-gray-700/50">
        <div className="flex items-center space-x-3 mb-4">
          <div
            className={`
              w-10 h-10 rounded-full flex items-center justify-center
              ${
                variant === "danger"
                  ? "bg-red-600/20 text-red-400"
                  : "bg-yellow-600/20 text-yellow-400"
              }
            `}
          >
            {variant === "danger" ? "⚠️" : "⚠️"}
          </div>
          <h3 className="text-xl font-bold text-white">{title}</h3>
        </div>

        <p className="text-gray-300 mb-6 leading-relaxed">{message}</p>

        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Suppression..." : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};
