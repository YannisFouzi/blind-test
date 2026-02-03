"use client";

import "@/lib/wdyr";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ReactNode, useEffect, useState } from "react";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export function Providers({ children }: { children: ReactNode }) {
  // Creer le QueryClient dans le state pour eviter de le recreer a chaque render
  // Pattern recommande par TanStack Query pour Next.js App Router
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Configurations par defaut professionnelles
            staleTime: 5 * 60 * 1000, // Donnees fraiches pendant 5 minutes
            gcTime: 10 * 60 * 1000, // Garbage collection apres 10 minutes
            retry: 1, // Retry 1 fois en cas d'echec (ajuste pour eviter trop de retries)
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
            refetchOnWindowFocus: false, // Pas de refetch automatique au focus (configurable par query)
            refetchOnReconnect: true, // Refetch quand la connexion est retablie
          },
          mutations: {
            retry: 1, // Retry une fois pour les mutations
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools uniquement en developpement */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}

export function ProvidersWithAuth({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Flag pour s'assurer qu'on n'initialise qu'une seule fois
    // apres que Firebase ait verifie s'il y a une session existante
    let initialized = false;

    const unsub = onAuthStateChanged(auth, (user) => {
      if (!initialized) {
        initialized = true;
        // Firebase a fini de verifier la session stockee
        // Si aucun utilisateur n'est connecte, creer une session anonyme
        // pour permettre l'acces Firestore (mode multijoueur)
        if (!user) {
          signInAnonymously(auth).catch(() => {
            // Silencieux en cas d'erreur
          });
        }
      }
    });

    return () => unsub();
  }, []);

  return <Providers>{children}</Providers>;
}
