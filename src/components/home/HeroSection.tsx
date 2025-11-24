"use client";

import { motion } from "framer-motion";
import { Cog, Star as StarIcon } from "lucide-react";
import { fadeInUp, slideInLeft } from "@/lib/animations/variants";

interface HeroSectionProps {
  isAdmin: boolean;
  onAdminClick: () => void;
  showSubtitle?: boolean;
}

export const HeroSection = ({
  isAdmin,
  onAdminClick,
  showSubtitle = true,
}: HeroSectionProps) => {
  return (
    <>
      <motion.div
        className="flex justify-between items-center mb-6"
        initial="hidden"
        animate="visible"
        variants={slideInLeft}
      >
        <div className="flex-1" />
        {isAdmin && (
          <button
            onClick={onAdminClick}
            className="magic-button px-6 py-3 flex items-center gap-2 text-white font-semibold"
          >
            <Cog className="w-4 h-4" />
            <span className="hidden sm:inline">Administration</span>
          </button>
        )}
      </motion.div>

      <motion.div
        className="text-center mb-10"
        initial="hidden"
        animate="visible"
        variants={fadeInUp}
      >
        <h1 className="fantasy-text text-5xl md:text-7xl font-bold mb-4">
          BLIND TEST
        </h1>
        <div className="flex items-center justify-center gap-3 mb-5">
          <div className="w-12 h-1 bg-gradient-to-r from-yellow-400 to-purple-500 rounded-full" />
          <StarIcon className="text-yellow-400 w-5 h-5" />
          <div className="w-12 h-1 bg-gradient-to-r from-purple-500 to-yellow-400 rounded-full" />
        </div>
        {showSubtitle && (
          <p className="text-lg md:text-xl text-purple-200 max-w-3xl mx-auto leading-relaxed">
            Plongez dans vos univers favoris et testez vos connaissances
            musicales !
          </p>
        )}
      </motion.div>
    </>
  );
};
