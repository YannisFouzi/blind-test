"use client";

import { useRouter } from "next/navigation";
import { HeroSection } from "@/components/home/HeroSection";
import { UniverseGrid } from "@/components/home/UniverseGrid";
import { HomePageSkeleton } from "../components/HomePage/HomePageSkeleton";
import { useAuth } from "../hooks/useAuth";
import { useUniverses } from "../hooks/useUniverses";

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    universes,
    loading: universesLoading,
    error: universesError,
  } = useUniverses();

  const handleUniverseClick = (universeId: string) => {
    router.push(`/game/${universeId}`);
  };

  if (universesLoading) {
    return <HomePageSkeleton />;
  }

  const isAdmin = user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[
          { top: 10, left: 15 },
          { top: 25, left: 80 },
          { top: 40, left: 30 },
          { top: 60, left: 70 },
          { top: 80, left: 20 },
          { top: 15, left: 50 },
          { top: 35, left: 85 },
          { top: 75, left: 60 },
          { top: 90, left: 40 },
          { top: 20, left: 10 },
          { top: 55, left: 25 },
          { top: 70, left: 90 },
          { top: 30, left: 55 },
          { top: 85, left: 75 },
          { top: 45, left: 5 },
          { top: 65, left: 45 },
          { top: 12, left: 65 },
          { top: 50, left: 15 },
          { top: 75, left: 35 },
          { top: 95, left: 80 },
          { top: 25, left: 40 },
          { top: 40, left: 75 },
          { top: 60, left: 10 },
          { top: 18, left: 90 },
          { top: 32, left: 20 },
          { top: 78, left: 55 },
          { top: 88, left: 25 },
          { top: 42, left: 85 },
          { top: 68, left: 65 },
          { top: 52, left: 95 },
        ].map((position, i) => (
          <div
            key={i}
            className="particle"
            style={{ top: `${position.top}%`, left: `${position.left}%` }}
          />
        ))}
      </div>

      <div className="fixed top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-3/4 right-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.05),_transparent_60%)] opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-purple-900/40 to-slate-900/40 backdrop-blur-[2px]" />

      <div className="relative z-10 container mx-auto px-4 py-8">
        <HeroSection
          isAdmin={Boolean(isAdmin)}
          onAdminClick={() => router.push("/admin")}
        />

        <UniverseGrid
          universes={universes}
          error={universesError}
          onSelect={handleUniverseClick}
        />
      </div>
    </div>
  );
}
