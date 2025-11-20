"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { FaCog, FaPlay, FaStar } from "react-icons/fa";
import { Universe } from "@/types";
import { ErrorMessage } from "../components/ui/ErrorMessage";
import { HomePageSkeleton } from "../components/HomePage/HomePageSkeleton";
import { useAuth } from "../hooks/useAuth";
import { useUniverses } from "../hooks/useUniverses";
import { generateStylesFromColor } from "../utils/colorGenerator";
import { AVAILABLE_ICONS } from "@/constants/icons";
import {
  fadeInUp,
  slideInLeft,
  staggerContainer,
  staggerItem,
} from "@/lib/animations/variants";

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    universes,
    loading: universesLoading,
    error: universesError,
  } = useUniverses();

  const handleUniverseClick = (universeId: string) => {
    // Animation de clic
    router.push(`/game/${universeId}`);
  };

  const renderIcon = (iconName: string) => {
    // Chercher l'icône dans la bibliothèque
    const iconData = AVAILABLE_ICONS.find((icon) => icon.id === iconName);
    if (iconData) {
      const IconComponent = iconData.component;
      return <IconComponent className="text-2xl md:text-4xl text-[#1c1c35]" />;
    }

    // Si l'icône n'est pas trouvée, afficher une icône par défaut
    return <FaStar className="text-2xl md:text-4xl text-[#1c1c35]" />;
  };

  const getUniverseStyles = (universe: Universe) => {
    // Validation : toutes les couleurs doivent être en format hex
    const color = universe.color.startsWith("#")
      ? universe.color
      : "#3B82F6"; // Fallback bleu par défaut

    // Avertir si format invalide détecté
    if (!universe.color.startsWith("#")) {
      console.error(
        `[ERREUR] Univers "${universe.name}" a une couleur invalide: "${universe.color}"`,
        "Format attendu: #XXXXXX (hex)"
      );
    }

    const styles = generateStylesFromColor(color);
    return {
      gradient: styles.inlineStyles.background,
      border: styles.primaryColor,
      iconColor: styles.primaryColor,
      primaryColor: styles.primaryColor,
      inlineStyles: styles.inlineStyles,
      overlayStyles: styles.overlayStyles,
      iconStyles: styles.iconStyles,
    };
  };

  if (universesLoading) {
    return <HomePageSkeleton />;
  }

  // Vérifier les droits admin de façon simple
  const isAdmin = user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Particules flottantes d'arrière-plan */}
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
            style={{
              top: `${position.top}%`,
              left: `${position.left}%`,
            }}
          />
        ))}
      </div>

      {/* Effets de lumière d'ambiance */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl" />
      </div>

      {/* Contenu principal */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header avec bouton admin */}
        <motion.div
          className="flex justify-between items-center mb-12"
          initial="hidden"
          animate="visible"
          variants={slideInLeft}
        >
          <div className="flex-1" />
          {isAdmin && (
            <button
              onClick={() => router.push("/admin")}
              className="magic-button px-6 py-3 flex items-center gap-2 text-white font-semibold"
            >
              <FaCog className="text-lg" />
              <span className="hidden sm:inline">Administration</span>
            </button>
          )}
        </motion.div>

        {/* Titre principal */}
        <motion.div
          className="text-center mb-16"
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
        >
          <h1 className="fantasy-text text-6xl md:text-8xl font-bold mb-6">
            BLIND TEST
          </h1>
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="w-16 h-1 bg-gradient-to-r from-yellow-400 to-purple-500 rounded-full" />
            <FaStar className="text-yellow-400 text-2xl" />
            <div className="w-16 h-1 bg-gradient-to-r from-purple-500 to-yellow-400 rounded-full" />
          </div>
          <p className="text-xl md:text-2xl text-purple-200 max-w-3xl mx-auto leading-relaxed">
            Plongez dans vos univers favoris et testez vos connaissances
            musicales !
          </p>
        </motion.div>

        {/* Grille des univers */}
        {universesError ? (
          <motion.div
            className="text-center"
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
          >
            <div className="magic-card p-12 max-w-2xl mx-auto">
              <ErrorMessage message={universesError} />
              <p className="text-purple-300 mt-4">
                Les univers magiques sont en cours de préparation... Revenez
                bientôt !
              </p>
            </div>
          </motion.div>
        ) : universes.length > 0 ? (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            {universes.map((universe, index) => {
              const styles = getUniverseStyles(universe);

              // Déterminer si on utilise les styles inline ou les classes Tailwind
              const useInlineStyles = universe.color.startsWith("#");
              const hasInlineStyles =
                useInlineStyles &&
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
                  onClick={() => handleUniverseClick(universe.id)}
                >
                  <button
                    className={`group relative backdrop-blur-xl rounded-2xl md:rounded-3xl p-4 md:p-8 transition-all duration-500 hover:shadow-2xl w-full ${
                      hasInlineStyles
                        ? "border hover:border-opacity-60"
                        : `bg-gradient-to-br border-2`
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
                    {/* Effet de brillance au survol */}
                    <div
                      className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={
                        hasInlineStyles
                          ? {
                              background: styles.overlayStyles!.background,
                            }
                          : {
                              background: `linear-gradient(135deg, ${styles.iconColor}20, transparent)`,
                            }
                      }
                    />

                    <div className="relative z-10">
                      {/* Icône dans un cercle */}
                      <div className="flex justify-center mb-3 md:mb-6">
                        <div
                          className="w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center group-hover:rotate-12 transition-transform duration-500"
                          style={
                            hasInlineStyles
                              ? {
                                  background: styles.iconStyles!.background,
                                }
                              : {
                                  background: `linear-gradient(135deg, ${styles.iconColor}, ${styles.iconColor}CC)`,
                                }
                          }
                        >
                          {renderIcon(universe.icon)}
                        </div>
                      </div>

                      {/* Titre */}
                      <h2
                        className={`text-xl md:text-2xl xl:text-3xl font-bold mb-1 md:mb-2 text-center uppercase leading-tight ${
                          hasInlineStyles
                            ? "text-transparent bg-clip-text"
                            : "text-white"
                        }`}
                        style={
                          hasInlineStyles
                            ? {
                                backgroundImage: styles.iconStyles!.background,
                              }
                            : {}
                        }
                      >
                        {universe.name}
                      </h2>

                      {/* Description */}
                      {universe.description && (
                        <p className="text-sm md:text-base text-white/80 text-center leading-relaxed px-2 mb-2 md:mb-4">
                          {universe.description}
                        </p>
                      )}

                      {/* Bouton play */}
                      <div className="flex justify-center">
                        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-3 rounded-full flex items-center gap-2 text-white font-semibold hover:scale-110 transition-transform duration-300">
                          <FaPlay className="text-lg" />
                          <span>Jouer</span>
                        </div>
                      </div>
                    </div>

                    {/* Effet de particules */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div
                        className="absolute top-4 left-4 w-2 h-2 rounded-full animate-ping"
                        style={{
                          backgroundColor: styles.primaryColor,
                        }}
                      />
                      <div
                        className="absolute top-12 right-8 w-1 h-1 rounded-full animate-pulse delay-300"
                        style={{
                          backgroundColor: styles.primaryColor + "80",
                        }}
                      />
                      <div
                        className="absolute bottom-8 left-12 w-1.5 h-1.5 rounded-full animate-bounce delay-500"
                        style={{
                          backgroundColor: styles.primaryColor,
                        }}
                      />
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            className="text-center"
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
          >
            <div className="magic-card p-12 max-w-2xl mx-auto">
              <ErrorMessage message="Aucun univers disponible pour le moment" />
              <p className="text-purple-300 mt-4">
                Les univers magiques sont en cours de préparation... Revenez
                bientôt !
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
