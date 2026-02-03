import { HomeBackground } from "@/features/home/components/HomeBackground";
import { HomeContent } from "@/features/home/components/HomeContent";

export default function HomePage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <HomeBackground />
      <div className="relative z-10">
        <HomeContent />
      </div>
    </div>
  );
}
