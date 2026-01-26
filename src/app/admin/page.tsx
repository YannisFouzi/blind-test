"use client";

import { signInWithPopup, signOut } from "firebase/auth";
import { LogOut } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ADMIN_EMAIL, auth, googleProvider } from "@/lib/firebase";
import { User } from "@/types";

const GoogleIcon = () => (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path
      fill="#4285F4"
      d="M23.6 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5c-.3 1.4-1.1 2.6-2.4 3.4v2.8h3.9c2.3-2.1 3.6-5.2 3.6-8.3z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.2 0 5.9-1.1 7.8-3l-3.9-2.8c-1.1.8-2.5 1.3-3.9 1.3-3 0-5.5-2-6.4-4.8H1.6v3.1C3.5 21.4 7.5 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.6 14.7c-.3-1-.3-2.1 0-3.1V8.5H1.6c-1.3 2.5-1.3 5.5 0 8l4-2.8z"
    />
    <path
      fill="#EA4335"
      d="M12 4.7c1.7 0 3.1.6 4.3 1.7l3.2-3.2C18 1.2 15.3 0 12 0 7.5 0 3.5 2.6 1.6 6.5l4 3.1C6.5 6.7 9 4.7 12 4.7z"
    />
  </svg>
);

export default function AdminLoginPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // Vérifier si l'utilisateur est admin via l'email
        const isAdmin = firebaseUser.email === ADMIN_EMAIL;

        if (isAdmin) {
          const user: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            displayName: firebaseUser.displayName!,
            photoURL: firebaseUser.photoURL || undefined,
            isAdmin: true,
          };
          setUser(user);
          // Rediriger vers le dashboard
          router.push("/admin/dashboard");
        } else {
          setError(
            `Accès refusé. Seul l'administrateur autorisé peut accéder à cette section.`
          );
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (error: unknown) {
      if (process.env.NODE_ENV === "development") {
        console.error("Erreur de connexion:", error);
      }

      // Messages d'erreur plus spécifiques
      const authError = error as { code?: string };
      if (authError.code === "auth/popup-closed-by-user") {
        setError("Connexion annulée par l'utilisateur.");
      } else if (authError.code === "auth/popup-blocked") {
        setError("Popup bloquée. Veuillez autoriser les popups pour ce site.");
      } else {
        setError("Erreur lors de la connexion. Veuillez réessayer.");
      }
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setError(null);
    } catch (error: unknown) {
      if (process.env.NODE_ENV === "development") {
        console.error("Erreur de déconnexion:", error);
      }
      setError("Erreur lors de la déconnexion.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-8">
      <div className="bg-slate-800/50 rounded-2xl p-8 border border-gray-700/50 max-w-md w-full">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 mb-2">
            Administration
          </h1>
          <p className="text-gray-400 mb-8">
            Gestion des univers et playlists
          </p>

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
              <p className="text-red-300 text-sm">{error}</p>
              <p className="text-red-400 text-xs mt-2">
                Contact administrateur : {ADMIN_EMAIL}
              </p>
            </div>
          )}

          {!user ? (
            <div>
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
              >
                <GoogleIcon />
                Se connecter avec Google
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="flex items-center justify-center mb-6">
                {user.photoURL && (
                  <Image
                    src={user.photoURL}
                    alt={user.displayName || "Photo de profil"}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-full border-2 border-yellow-400"
                  />
                )}
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Bienvenue, {user.displayName}
              </h2>
              <p className="text-gray-400 mb-2">{user.email}</p>
              <div className="bg-green-500/20 border border-green-500 rounded-lg p-2 mb-6">
                <p className="text-green-300 text-xs font-medium">
                  ✓ Administrateur autorisé
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => router.push("/admin/dashboard")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                >
                  Accéder au Dashboard
                </button>

                <button
                  onClick={handleSignOut}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-3 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Se déconnecter
                </button>
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-700">
            <button
              onClick={() => router.push("/")}
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              ← Retour au blind test
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
