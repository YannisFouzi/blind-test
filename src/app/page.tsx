import { HomeBackground } from "@/components/home/HomeBackground";
import { HomeContent } from "@/components/home/HomeContent";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 relative overflow-hidden">
      <HomeBackground />
      <div className="relative z-10">
        <HomeContent />
      </div>
    </div>
  );
}
