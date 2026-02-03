import type { User } from "firebase/auth";
import { useEffect, type ReactNode } from "react";
import { Home, LogOut, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

interface AdminLayoutProps {
  children: ReactNode;
  user: User | null;
  title: string;
  loading?: boolean;
  error?: string | null;
  success?: string | null;
  onLogout: () => void;
  onClearMessages: () => void;
  onNavigateHome: () => void;
}

const useToastMessages = (
  message: string | null | undefined,
  onClearMessages: () => void,
  notify: (value: string) => void
) => {
  useEffect(() => {
    if (!message) return;
    notify(message);
    onClearMessages();
  }, [message, onClearMessages, notify]);
};

export const AdminLayout = ({
  children,
  user,
  title,
  loading = false,
  error,
  success,
  onLogout,
  onClearMessages,
  onNavigateHome,
}: AdminLayoutProps) => {
  useToastMessages(error, onClearMessages, toast.error);
  useToastMessages(success, onClearMessages, toast.success);

  return (
    <div className="min-h-screen bg-[var(--color-surface-base)] text-[var(--color-text-primary)]">
      <header className="bg-white border-b-[3px] border-[#1B1B1B] shadow-[4px_4px_0_#1B1B1B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-extrabold">{title}</h1>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={onNavigateHome}
                className="flex items-center space-x-2"
              >
                <Home className="w-4 h-4" />
                <span>Accueil</span>
              </Button>

              {user && (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 text-[var(--color-text-secondary)]">
                    <UserRound className="w-4 h-4" />
                    <span className="text-sm">{user.displayName || user.email}</span>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={onLogout}
                    className="flex items-center space-x-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Deconnexion</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="mb-6 p-4 bg-[#E0F2FE] border-[3px] border-[#1B1B1B] rounded-2xl shadow-[3px_3px_0_#1B1B1B]">
            <div className="flex items-center space-x-2 text-[var(--color-text-primary)] font-semibold">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#1B1B1B] border-t-transparent" />
              <span>Chargement...</span>
            </div>
          </div>
        )}

        {children}
      </main>
    </div>
  );
};

