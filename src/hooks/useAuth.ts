import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { useEffect, useState } from "react";
import { auth, googleProvider } from "../../lib/firebase";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setState((prev) => ({
        ...prev,
        user,
        loading: false,
      }));
    });

    return unsubscribe;
  }, []);

  const login = async (): Promise<{ success: boolean; error?: string }> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const result = await signInWithPopup(auth, googleProvider);

      // Vérification si l'utilisateur est admin
      if (result.user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
        await signOut(auth);
        throw new Error(
          "Accès non autorisé. Seul l'administrateur peut se connecter."
        );
      }

      setState((prev) => ({ ...prev, loading: false }));
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erreur de connexion";
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  };

  const logout = async (): Promise<{ success: boolean; error?: string }> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      await signOut(auth);
      setState((prev) => ({ ...prev, loading: false }));
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erreur de déconnexion";
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  };

  const clearError = () => {
    setState((prev) => ({ ...prev, error: null }));
  };

  const isAdmin = state.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  return {
    ...state,
    login,
    logout,
    clearError,
    isAdmin,
  };
};
