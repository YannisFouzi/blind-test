"use client";

import { Cog } from "lucide-react";
import { OutlinedTitle } from "@/components/ui/OutlinedTitle";

interface HeroSectionProps {
  isAdmin: boolean;
  onAdminClick: () => void;
}

export const HeroSection = ({
  isAdmin,
  onAdminClick,
}: HeroSectionProps) => {
  return (
    <div className="relative text-center mb-10">
      {isAdmin && (
        <button
          onClick={onAdminClick}
          className="magic-button px-6 py-3 flex items-center gap-2 font-semibold absolute right-0 top-0 z-10"
        >
          <Cog className="w-4 h-4" />
          <span className="hidden sm:inline">Administration</span>
        </button>
      )}
      <OutlinedTitle as="h1" className="text-5xl md:text-7xl font-bold mb-4">
        ULTIMATE BLIND TEST
      </OutlinedTitle>
    </div>
  );
};
