"use client";

import { collection, getDocs, query, where } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { Universe } from "../../types";
import {
  generateStylesFromColor,
  getIconById,
  getUniverseTheme,
  getUniverseThemeByName,
} from "../utils";

export default function HomePage() {
  const [universes, setUniverses] = useState<Universe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUniverses();
  }, []);

  const loadUniverses = async () => {
    try {
      setLoading(true);
      setError(null);

      // CORRECTION: Filtrer seulement les univers actifs (conformément aux règles Firestore)
      const universesQuery = query(
        collection(db, "universes"),
        where("active", "==", true)
      );

      const querySnapshot = await getDocs(universesQuery);

      const fetchedUniverses = querySnapshot.docs.map((doc) => {
        const data = doc.data();

        // Log de debug seulement en développement
        if (process.env.NODE_ENV === "development") {
          console.log("🔍 [DEBUG] Document univers:", {
            id: doc.id,
            name: data.name,
            active: data.active,
            hasAllFields: !!(
              data.name &&
              data.description &&
              data.color &&
              data.icon
            ),
          });
        }

        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
        };
      }) as Universe[];

      setUniverses(fetchedUniverses);
    } catch (error: any) {
      // Log d'erreur détaillé seulement en développement
      if (process.env.NODE_ENV === "development") {
        console.error(
          "❌ [DEBUG] Erreur lors du chargement des univers:",
          error
        );
      }

      // Messages d'erreur spécifiques
      if (error.code === "permission-denied") {
        setError("Permissions insuffisantes pour accéder aux univers");
      } else if (error.code === "unavailable") {
        setError("Service Firebase temporairement indisponible");
      } else {
        setError(`Erreur: ${error.message}`);
      }

      setUniverses([]); // État vide en cas d'erreur
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#121225] via-[#1a1a35] to-[#0d0d20] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#e9be56] mx-auto mb-4"></div>
          <p className="text-xl text-white">Chargement des univers...</p>
          <p className="text-sm text-gray-400 mt-2">Connexion à Firebase...</p>
        </div>
      </div>
    );
  }

  // Affichage d'erreur si problème de permissions
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#121225] via-[#1a1a35] to-[#0d0d20] flex items-center justify-center">
        <div className="max-w-2xl mx-auto text-center px-8">
          <div className="bg-red-500/20 border border-red-500 rounded-2xl p-12">
            <div className="text-6xl mb-6">⚠️</div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Erreur de chargement
            </h2>
            <p className="text-red-300 text-lg mb-8">{error}</p>
            <button
              onClick={loadUniverses}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors mr-4"
            >
              Réessayer
            </button>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              🛠️ Administration
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#121225] via-[#1a1a35] to-[#0d0d20] relative overflow-hidden">
      {/* Effets de fond animés */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-64 h-64 bg-[#e9be56]/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-[#6d1e1e]/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#276f91]/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 text-center max-w-6xl mx-auto px-6">
        {/* Titre principal */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-[#e9be56] via-[#f0e3bc] to-[#e9be56] bg-clip-text text-transparent mb-6 animate-fade-in">
            CHOISISSEZ VOTRE UNIVERS
          </h1>
          <p className="text-xl md:text-2xl text-white/70 max-w-3xl mx-auto leading-relaxed">
            Plongez dans l'univers de votre choix et testez vos connaissances
            musicales
          </p>
        </div>

        {/* Contenu principal */}
        {universes.length === 0 ? (
          /* Message si aucun univers */
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-slate-800/50 rounded-2xl p-12 border border-gray-700/50">
              <div className="text-6xl mb-6">🎵</div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Aucun univers actif
              </h2>
              <p className="text-gray-400 text-lg mb-8">
                Aucun univers de blind test n'est actuellement actif. Les
                univers doivent être activés par l'administrateur pour
                apparaître ici.
              </p>
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                🛠️ Accès Administration
              </Link>
            </div>
          </div>
        ) : (
          /* Grille des univers */
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 max-w-7xl mx-auto">
              {universes.map((universe) => {
                // Détecter le type de données : ancien thème, couleur hex, ou ID d'icône
                let styles;
                let IconComponent;

                if (universe.color.startsWith("#")) {
                  // Nouvelle logique : couleur hex + ID d'icône
                  styles = generateStylesFromColor(universe.color);
                  const iconData =
                    getIconById(universe.icon) || getIconById("wand");
                  IconComponent = iconData?.component;
                } else {
                  // Rétrocompatibilité : anciens thèmes prédéfinis
                  const theme = universe.color.includes("-")
                    ? getUniverseTheme(universe.color)
                    : getUniverseThemeByName(universe.name);

                  styles = {
                    gradient: theme.gradient,
                    border: theme.border,
                    borderHover: theme.borderHover,
                    shadow: theme.shadow,
                    overlay: theme.overlay,
                    iconGradient: theme.iconGradient,
                    textGradient: theme.textGradient,
                    particles: theme.particles,
                    particlesAlt: theme.particlesAlt,
                    primaryColor: theme.primaryColor,
                  };
                  IconComponent = theme.icon;
                }

                // Déterminer si on utilise les styles inline ou les classes Tailwind
                const useInlineStyles =
                  universe.color.startsWith("#") && "inlineStyles" in styles;
                const hasInlineStyles =
                  useInlineStyles &&
                  styles.inlineStyles &&
                  styles.overlayStyles &&
                  styles.iconStyles;

                return (
                  <Link
                    key={universe.id}
                    href={`/game/${universe.id}`}
                    className="group"
                  >
                    <button
                      className={`group relative backdrop-blur-xl rounded-2xl md:rounded-3xl p-4 md:p-8 transition-all duration-500 transform hover:scale-105 hover:shadow-2xl w-full ${
                        hasInlineStyles
                          ? "border hover:border-opacity-60"
                          : `bg-gradient-to-br ${styles.gradient} ${styles.border} ${styles.borderHover} ${styles.shadow}`
                      }`}
                      style={
                        hasInlineStyles
                          ? {
                              background: styles.inlineStyles!.background,
                              borderColor: styles.inlineStyles!.borderColor,
                              boxShadow: styles.inlineStyles!.boxShadow,
                            }
                          : {}
                      }
                    >
                      {/* Effet de brillance au survol */}
                      <div
                        className={`absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                          hasInlineStyles
                            ? ""
                            : `bg-gradient-to-br ${styles.overlay}`
                        }`}
                        style={
                          hasInlineStyles
                            ? {
                                background: styles.overlayStyles!.background,
                              }
                            : {}
                        }
                      ></div>

                      <div className="relative z-10">
                        {/* Icône */}
                        <div className="flex justify-center mb-3 md:mb-6">
                          <div
                            className={`w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center group-hover:rotate-12 transition-transform duration-500 ${
                              hasInlineStyles
                                ? ""
                                : `bg-gradient-to-br ${styles.iconGradient}`
                            }`}
                            style={
                              hasInlineStyles
                                ? {
                                    background: styles.iconStyles!.background,
                                  }
                                : {}
                            }
                          >
                            {IconComponent && (
                              <IconComponent className="text-2xl md:text-4xl text-[#1c1c35]" />
                            )}
                          </div>
                        </div>

                        {/* Titre */}
                        <h2
                          className={`text-lg md:text-3xl lg:text-4xl font-bold mb-2 md:mb-4 text-center uppercase ${
                            hasInlineStyles
                              ? "text-transparent bg-clip-text"
                              : `bg-gradient-to-r ${styles.textGradient} bg-clip-text text-transparent`
                          }`}
                          style={
                            hasInlineStyles
                              ? {
                                  backgroundImage:
                                    styles.iconStyles!.background,
                                }
                              : {}
                          }
                        >
                          {universe.name}
                        </h2>
                      </div>

                      {/* Effet de particules */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <div
                          className={`absolute top-4 left-4 w-2 h-2 rounded-full animate-ping ${
                            hasInlineStyles ? "" : styles.particles
                          }`}
                          style={
                            hasInlineStyles
                              ? {
                                  backgroundColor: styles.primaryColor,
                                }
                              : {}
                          }
                        ></div>
                        <div
                          className={`absolute top-12 right-8 w-1 h-1 rounded-full animate-pulse delay-300 ${
                            hasInlineStyles ? "" : styles.particlesAlt
                          }`}
                          style={
                            hasInlineStyles
                              ? {
                                  backgroundColor: styles.primaryColor + "80",
                                }
                              : {}
                          }
                        ></div>
                        <div
                          className={`absolute bottom-8 left-12 w-1.5 h-1.5 rounded-full animate-bounce delay-500 ${
                            hasInlineStyles ? "" : styles.particles
                          }`}
                          style={
                            hasInlineStyles
                              ? {
                                  backgroundColor: styles.primaryColor,
                                }
                              : {}
                          }
                        ></div>
                      </div>
                    </button>
                  </Link>
                );
              })}
            </div>

            {/* Lien administration */}
            <div className="text-center mt-12">
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                🛠️ Administration
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
