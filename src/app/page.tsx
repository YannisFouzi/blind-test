import { HomeBackground } from "@/features/home/components/HomeBackground";
import { HomeContent } from "@/features/home/components/HomeContent";
import { getActiveUniversesServer } from "@/services/firebase/universes.service.server";
import type { Universe } from "@/types";

export const revalidate = 300;

export default async function HomePage() {
  let initialUniverses: Universe[] | undefined;
  try {
    initialUniverses = await getActiveUniversesServer();
  } catch (error) {
    console.error("[HomePage] Failed to load universes on server:", error);
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <HomeBackground />
      <div className="relative z-10">
        <HomeContent initialUniverses={initialUniverses} />
      </div>
    </div>
  );
}
