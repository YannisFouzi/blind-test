import { User } from "firebase/auth";
import { ReactNode, useEffect } from "react";
import { Home, LogOut, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/Button";

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
  useEffect(() => {
    if (error) {
      toast.error(error);
      onClearMessages();
    }
  }, [error, onClearMessages]);

  useEffect(() => {
    if (success) {
      toast.success(success);
      onClearMessages();
    }
  }, [success, onClearMessages]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="bg-slate-800/50 border-b border-gray-700/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-white">{title}</h1>
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
                  <div className="flex items-center space-x-2 text-gray-300">
                    <UserRound className="w-4 h-4" />
                    <span className="text-sm">
                      {user.displayName || user.email}
                    </span>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={onLogout}
                    className="flex items-center space-x-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>DÉconnexion</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="mb-6 p-4 bg-blue-900/30 border border-blue-600 rounded-lg">
            <div className="flex items-center space-x-2 text-blue-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
              <span>Chargement...</span>
            </div>
          </div>
        )}

        {children}
      </main>
    </div>
  );
};
