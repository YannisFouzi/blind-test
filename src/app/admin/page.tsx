"use client";

import { signInWithPopup, signOut } from "firebase/auth";
import { LogOut } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ADMIN_EMAIL, auth, googleProvider } from "@/lib/firebase";
import { User } from "@/types";
import { pressable } from "@/styles/ui";

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
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
        const isAdmin = firebaseUser.email === ADMIN_EMAIL;

        if (isAdmin) {
          const nextUser: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            displayName: firebaseUser.displayName!,
            photoURL: firebaseUser.photoURL || undefined,
            isAdmin: true,
          };
          setUser(nextUser);
          router.push("/admin/dashboard");
        } else {
          setError(
            "Acces refuse. Seul l'administrateur autorise peut acceder a cette section."
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

      const authError = error as { code?: string };
      if (authError.code === "auth/popup-closed-by-user") {
        setError("Connexion annulee par l'utilisateur.");
      } else if (authError.code === "auth/popup-blocked") {
        setError("Popup bloquee. Veuillez autoriser les popups pour ce site.");
      } else {
        setError("Erreur lors de la connexion. Veuillez reessayer.");
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
        console.error("Erreur de deconnexion:", error);
      }
      setError("Erreur lors de la deconnexion.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-surface-base)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1B1B1B] border-t-transparent mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-[var(--color-text-primary)]">
            Verification des permissions...
          </p>
        </div>
      </div>
    );
  }

  const cardBase =
    "bg-white border-[3px] border-[#1B1B1B] rounded-3xl shadow-[6px_6px_0_#1B1B1B]";
  const actionButton = `w-full px-4 py-3 text-sm font-bold ${pressable}`;

  return (
    <div className="min-h-screen bg-[var(--color-surface-base)] flex items-center justify-center p-8">
      <div className={`${cardBase} p-8 max-w-md w-full`}>
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-[var(--color-text-primary)] mb-2">
            Administration
          </h1>
          <p className="text-[var(--color-text-secondary)] mb-8">
            Gestion des univers et playlists
          </p>

          {error && (
            <div className="bg-[#FFE5E5] border-[3px] border-[#1B1B1B] rounded-2xl p-4 mb-6 shadow-[3px_3px_0_#1B1B1B]">
              <p className="text-red-700 text-sm">{error}</p>
              <p className="text-[var(--color-text-secondary)] text-xs mt-2">
                Contact admin: {ADMIN_EMAIL}
              </p>
            </div>
          )}

          {!user ? (
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className={`${actionButton} bg-white hover:bg-[var(--color-surface-overlay)] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <GoogleIcon />
              Se connecter avec Google
            </button>
          ) : (
            <div className="text-center">
              <div className="flex items-center justify-center mb-6">
                {user.photoURL && (
                  <Image
                    src={user.photoURL}
                    alt={user.displayName || "Photo de profil"}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-full border-[3px] border-[#1B1B1B]"
                  />
                )}
              </div>
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
                Bienvenue, {user.displayName}
              </h2>
              <p className="text-[var(--color-text-secondary)] mb-2">{user.email}</p>
              <div className="bg-[#ECFDF5] border-2 border-[#1B1B1B] rounded-xl p-2 mb-6 shadow-[2px_2px_0_#1B1B1B]">
                <p className="text-[#166534] text-xs font-bold">Admin autorise</p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => router.push("/admin/dashboard")}
                  className={`${actionButton} bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-light)]`}
                >
                  Acceder au dashboard
                </button>

                <button
                  onClick={handleSignOut}
                  className={`${actionButton} bg-[#fca5a5] hover:bg-[#f87171] flex items-center justify-center gap-3`}
                >
                  <LogOut className="w-4 h-4" />
                  Se deconnecter
                </button>
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t-2 border-[#1B1B1B]/20">
            <button
              onClick={() => router.push("/")}
              className={`px-4 py-2 text-sm font-semibold bg-white hover:bg-[var(--color-surface-overlay)] ${pressable}`}
            >
              Retour au blind test
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
