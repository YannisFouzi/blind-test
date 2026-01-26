import { HomeBackground } from "@/components/home/HomeBackground";
import { HomeContent } from "@/components/home/HomeContent";

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
