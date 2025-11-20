"use client";

import { useRouter } from "next/navigation";
import { HeroSection } from "@/components/home/HeroSection";
import { UniverseGrid } from "@/components/home/UniverseGrid";
import { HomePageSkeleton } from "@/components/HomePage/HomePageSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useUniverses } from "@/hooks/useUniverses";

export const HomeContent = () => {
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

  const isAdmin =
    Boolean(user?.email) && user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  return (
    <div className="container mx-auto px-4 py-12 space-y-12">
      <HeroSection isAdmin={isAdmin} onAdminClick={() => router.push("/admin")} />
      <UniverseGrid
        universes={universes}
        error={universesError}
        onSelect={handleUniverseClick}
      />
    </div>
  );
};
