"use client";

import { Cog, Star as StarIcon } from "lucide-react";

interface HeroSectionProps {
  isAdmin: boolean;
  onAdminClick: () => void;
  showSubtitle?: boolean;
}

export const HeroSection = ({
  isAdmin,
  onAdminClick,
}: HeroSectionProps) => {
  return (
    <>
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
        <h1 className="fantasy-text text-5xl md:text-7xl font-bold mb-4">
          ULTIMATE BLIND TEST
        </h1>
      </div>
    </>
  );
};
