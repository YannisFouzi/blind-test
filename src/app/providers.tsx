"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useEffect, useState } from "react";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export function Providers({ children }: { children: ReactNode }) {
  // Créer le QueryClient dans le state pour éviter de le recréer à chaque render
  // Pattern recommandé par TanStack Query pour Next.js App Router
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Configurations par défaut professionnelles
            staleTime: 60 * 1000, // Les données sont considérées fraîches pendant 1 minute
            gcTime: 5 * 60 * 1000, // Garbage collection après 5 minutes (anciennement cacheTime)
            retry: 3, // Retry 3 fois en cas d'échec
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
            refetchOnWindowFocus: false, // Pas de refetch automatique au focus (configurable par query)
            refetchOnReconnect: true, // Refetch quand la connexion est rétablie
          },
          mutations: {
            retry: 1, // Retry une fois pour les mutations
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// Auth anonyme automatique pour permettre l'accès Firestore (multi)
const initAnonymousAuth = () => {
  if (!auth.currentUser) {
    void signInAnonymously(auth).catch(() => {
      // on laisse silencieux; un autre render pourra réessayer
    });
  }
};

export function ProvidersWithAuth({ children }: { children: ReactNode }) {
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, () => {
      initAnonymousAuth();
    });
    initAnonymousAuth();
    return () => unsub();
  }, []);

  return <Providers>{children}</Providers>;
}
