"use client";

import { signInWithPopup, signOut } from "firebase/auth";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FaGoogle, FaSignOutAlt } from "react-icons/fa";
import { ADMIN_EMAIL, auth, googleProvider } from "../../../lib/firebase";
import { User } from "../../../types";

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
            Gestion des univers et playlists de blind test
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
                <FaGoogle size={20} />
                Se connecter avec Google
              </button>

              <div className="text-xs text-gray-500">
                <p>Accès réservé aux administrateurs</p>
                <p>Email autorisé : {ADMIN_EMAIL}</p>
              </div>
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
                  <FaSignOutAlt size={16} />
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
