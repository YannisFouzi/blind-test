import { User, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { ADMIN_EMAIL, auth, googleProvider } from "@/lib/firebase";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

type AuthResult = { success: boolean; error?: string };

const INITIAL_STATE: AuthState = {
  user: null,
  loading: true,
  error: null,
};

export const useAuth = () => {
  const [state, setState] = useState<AuthState>(INITIAL_STATE);

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

  const login = async (): Promise<AuthResult> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const result = await signInWithPopup(auth, googleProvider);

      if (result.user.email !== ADMIN_EMAIL) {
        await signOut(auth);
        throw new Error(
          "Acces non autorise. Seul l'administrateur peut se connecter."
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

  const logout = async (): Promise<AuthResult> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      await signOut(auth);
      setState((prev) => ({ ...prev, loading: false }));
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erreur de deconnexion";
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

  const isAdmin = state.user?.email === ADMIN_EMAIL;

  return {
    ...state,
    login,
    logout,
    clearError,
    isAdmin,
  };
};
