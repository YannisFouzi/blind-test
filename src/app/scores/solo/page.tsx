"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { Home as HomeIcon } from "lucide-react";
import { SoloScoreDisplay } from "@/features/scores/components/SoloScoreDisplay";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

function SoloScoresContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const correct = useMemo(() => {
    const value = searchParams?.get("correct");
    return value ? parseInt(value, 10) : 0;
  }, [searchParams]);

  const incorrect = useMemo(() => {
    const value = searchParams?.get("incorrect");
    return value ? parseInt(value, 10) : 0;
  }, [searchParams]);

  const handleGoHome = () => {
    router.push("/");
  };

  if (isNaN(correct) || isNaN(incorrect) || (correct === 0 && incorrect === 0)) {
    return (
      <div className="min-h-screen bg-[var(--color-surface-base)] flex items-center justify-center p-4">
        <div className="text-center">
          <ErrorMessage message="Scores invalides" />
          <button onClick={handleGoHome} className="magic-button mt-6 px-6 py-3">
            <HomeIcon className="inline mr-2" />
            Retour a l&apos;accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface-base)] relative overflow-hidden">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FDE68A]/40 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#BFDBFE]/40 rounded-full blur-3xl" />
      </div>

      <div className="fixed top-3 left-2 sm:top-6 sm:left-6 z-50">
        <button
          onClick={handleGoHome}
          className="magic-button px-3 py-2 sm:px-6 sm:py-3 flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
        >
          <HomeIcon className="text-base sm:text-lg" />
          <span className="hidden sm:inline">Accueil</span>
        </button>
      </div>

      <div className="container mx-auto px-4 py-8 pb-24 relative z-10">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-[var(--color-text-primary)] mb-2">
              Vos resultats
            </h1>
            <p className="text-[var(--color-text-secondary)]">
              Resultats de votre partie solo
            </p>
          </div>

          <SoloScoreDisplay correct={correct} incorrect={incorrect} />
        </div>
      </div>
    </div>
  );
}

export default function SoloScoresPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--color-surface-base)] flex items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <SoloScoresContent />
    </Suspense>
  );
}
