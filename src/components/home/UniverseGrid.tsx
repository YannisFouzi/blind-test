"use client";

import { motion } from "framer-motion";
import { Play as PlayIcon, Star as StarIcon } from "lucide-react";
import { Universe } from "@/types";
import { AVAILABLE_ICONS } from "@/constants/icons";
import { generateStylesFromColor } from "@/utils/colorGenerator";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import {
  fadeInUp,
  staggerContainer,
  staggerItem,
} from "@/lib/animations/variants";

interface UniverseGridProps {
  universes: Universe[];
  error?: string | null;
  onSelect: (id: string) => void;
}

const renderIcon = (iconName: string) => {
  const iconData = AVAILABLE_ICONS.find((icon) => icon.id === iconName);

  if (iconData) {
    const IconComponent = iconData.component;
    return <IconComponent className="text-2xl md:text-4xl text-[#1c1c35]" />;
  }

  return <StarIcon className="text-2xl md:text-4xl text-[#1c1c35]" />;
};

const getUniverseStyles = (universe: Universe) => {
  const color = universe.color.startsWith("#") ? universe.color : "#3B82F6";

  const styles = generateStylesFromColor(color);

  return {
    gradient: styles.inlineStyles.background,
    border: styles.primaryColor,
    iconColor: styles.primaryColor,
    inlineStyles: styles.inlineStyles,
    overlayStyles: styles.overlayStyles,
    iconStyles: styles.iconStyles,
  };
};

export const UniverseGrid = ({
  universes,
  error,
  onSelect,
}: UniverseGridProps) => {
  if (error) {
    return (
      <motion.div
        className="text-center"
        initial="hidden"
        animate="visible"
        variants={fadeInUp}
      >
        <div className="magic-card p-12 max-w-2xl mx-auto">
          <ErrorMessage message={error} />
          <p className="text-purple-300 mt-4">
            Les univers magiques sont en cours de préparation... Revenez bientôt !
          </p>
        </div>
      </motion.div>
    );
  }

  if (universes.length === 0) {
    return (
      <motion.div
        className="text-center"
        initial="hidden"
        animate="visible"
        variants={fadeInUp}
      >
        <div className="magic-card p-12 max-w-2xl mx-auto">
          <ErrorMessage message="Aucun univers disponible pour le moment" />
          <p className="text-purple-300 mt-4">
            Les univers magiques sont en cours de préparation... Revenez bientôt !
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      {universes.map((universe) => {
        const styles = getUniverseStyles(universe);
        const hasInlineStyles =
          universe.color.startsWith("#") &&
          styles.inlineStyles &&
          styles.overlayStyles &&
          styles.iconStyles;

        return (
          <motion.div
            key={universe.id}
            className="relative cursor-pointer"
            variants={staggerItem}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(universe.id)}
          >
            <button
              className={`group relative backdrop-blur-xl rounded-2xl md:rounded-3xl p-4 md:p-8 transition-all duration-500 hover:shadow-2xl w-full ${
                hasInlineStyles
                  ? "border hover:border-opacity-60"
                  : "bg-gradient-to-br border-2"
              }`}
              style={
                hasInlineStyles
                  ? {
                      background: styles.inlineStyles!.background,
                      borderColor: styles.inlineStyles!.borderColor,
                      boxShadow: styles.inlineStyles!.boxShadow,
                    }
                  : {
                      background: styles.gradient,
                      borderColor: styles.border,
                    }
              }
            >
              <div
                className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={
                  hasInlineStyles
                    ? { background: styles.overlayStyles!.background }
                    : {
                        background: `linear-gradient(135deg, ${styles.iconColor}20, transparent)`,
                      }
                }
              />

              <div className="relative z-10">
                <div className="flex justify-center mb-3 md:mb-6">
                  <div
                    className="w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center group-hover:rotate-12 transition-transform duration-500"
                    style={
                      hasInlineStyles
                        ? { background: styles.iconStyles!.background }
                        : {
                            background: `linear-gradient(135deg, ${styles.iconColor}, ${styles.iconColor}CC)`,
                          }
                    }
                  >
                    {renderIcon(universe.icon)}
                  </div>
                </div>

                <h2
                  className={`text-xl md:text-2xl xl:text-3xl font-bold mb-1 md:mb-2 text-center uppercase leading-tight ${
                    hasInlineStyles ? "text-transparent bg-clip-text" : "text-white"
                  }`}
                  style={
                    hasInlineStyles
                      ? { backgroundImage: styles.iconStyles!.background }
                      : undefined
                  }
                >
                  {universe.name}
                </h2>

                {universe.description && (
                  <p className="text-sm md:text-base text-white/80 text-center leading-relaxed px-2 mb-2 md:mb-4">
                    {universe.description}
                  </p>
                )}

                <div className="flex justify-center">
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-3 rounded-full flex items-center gap-2 text-white font-semibold hover:scale-110 transition-transform duration-300">
                    <PlayIcon className="w-4 h-4" />
                    <span>Jouer</span>
                  </div>
                </div>
              </div>

              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div
                  className="absolute top-4 left-4 w-2 h-2 rounded-full animate-ping"
                  style={{ backgroundColor: styles.iconColor }}
                />
                <div
                  className="absolute top-12 right-8 w-1 h-1 rounded-full animate-pulse delay-300"
                  style={{ backgroundColor: `${styles.iconColor}80` }}
                />
                <div
                  className="absolute bottom-8 left-12 w-1.5 h-1.5 rounded-full animate-bounce delay-500"
                  style={{ backgroundColor: styles.iconColor }}
                />
              </div>
            </button>
          </motion.div>
        );
      })}
    </motion.div>
  );
};
