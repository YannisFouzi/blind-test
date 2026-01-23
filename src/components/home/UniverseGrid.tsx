"use client";

import { memo, useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { Play as PlayIcon, Star as StarIcon, Shuffle } from "lucide-react";
import { Universe } from "@/types";
import { AVAILABLE_ICONS } from "@/constants/icons";
import { generateStylesFromColor } from "@/utils/colorGenerator";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

interface UniverseGridProps {
  universes: Universe[];
  error?: string | null;
  onSelect: (id: string) => void;
  onCustomize?: (universe: Universe) => void;
  onCustomMode?: () => void; // Ouvre le mode custom (toutes les œuvres)
}

const ICON_COMPONENTS = AVAILABLE_ICONS.reduce<Record<string, LucideIcon>>(
  (acc, icon) => {
    acc[icon.id] = icon.component;
    return acc;
  },
  {}
);

const getIconComponent = (iconName: string) =>
  ICON_COMPONENTS[iconName] ?? StarIcon;

const DEFAULT_COLOR = "#3B82F6";

const buildUniverseStyles = (universe: Universe) => {
  const color = universe.color.startsWith("#") ? universe.color : DEFAULT_COLOR;
  const styles = generateStylesFromColor(color);

  return {
    inlineStyles: styles.inlineStyles,
    overlayStyles: styles.overlayStyles,
    iconStyles: styles.iconStyles,
    accentColor: styles.primaryColor,
  };
};

const UniverseGridComponent = ({
  universes,
  error,
  onSelect,
  onCustomize,
  onCustomMode,
}: UniverseGridProps) => {
  const styleCache = useMemo(() => {
    const cache = new Map<string, ReturnType<typeof buildUniverseStyles>>();
    universes.forEach((universe) => {
      cache.set(universe.id, buildUniverseStyles(universe));
    });
    return cache;
  }, [universes]);

  if (error) {
    return (
      <div className="text-center">
        <div className="magic-card p-12 max-w-2xl mx-auto">
          <ErrorMessage message={error} />
          <p className="text-purple-300 mt-4">
            Les univers magiques sont en cours de préparation... Revenez
            bientôt !
          </p>
        </div>
      </div>
    );
  }

  if (universes.length === 0) {
    return (
      <div className="text-center">
        <div className="magic-card p-12 max-w-2xl mx-auto">
          <ErrorMessage message="Aucun univers disponible pour le moment" />
          <p className="text-purple-300 mt-4">
            Les univers magiques sont en cours de préparation... Revenez
            bientôt !
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
      {universes.map((universe) => {
        const styles = styleCache.get(universe.id);
        if (!styles) {
          return null;
        }

        const IconComponent = getIconComponent(universe.icon);

        return (
          <article key={universe.id}>
            <div
              className="group relative w-full overflow-hidden rounded-2xl md:rounded-3xl border border-white/10 bg-slate-900/40 p-5 md:p-8 text-left transition-transform duration-300 hover:-translate-y-1 hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
              style={{
                background: styles.inlineStyles.background,
                borderColor: styles.inlineStyles.borderColor,
                boxShadow: styles.inlineStyles.boxShadow,
              }}
            >
              <button
                className="absolute inset-0 z-10"
                onClick={() => onSelect(universe.id)}
                aria-label={`Jouer ${universe.name}`}
              ></button>
              <div
                className="absolute inset-0 rounded-[22px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: styles.overlayStyles.background }}
                aria-hidden
              />

              <div className="relative z-10 flex flex-col items-center gap-4">
                <div
                  className="flex h-20 w-20 items-center justify-center rounded-full transition-transform duration-300 group-hover:rotate-6"
                  style={{ background: styles.iconStyles.background }}
                >
                  <IconComponent className="h-10 w-10 text-slate-900" />
                </div>

                <h2 className="text-center text-2xl font-bold uppercase tracking-wide text-white">
                  {universe.name}
                </h2>

                {universe.description && (
                  <p className="text-center text-sm text-white/80">
                    {universe.description}
                  </p>
                )}

                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => onSelect(universe.id)}
                    className="inline-flex items-center gap-2 rounded-full bg-white/15 px-6 py-2 text-sm font-semibold text-white transition-transform duration-300 hover:scale-105"
                  >
                    <PlayIcon className="h-4 w-4" />
                    Mode Rapide
                  </button>
                  {onCustomize && (
                    <button
                      type="button"
                      onClick={() => onCustomize(universe)}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-900/60 border border-white/25 px-6 py-2 text-sm font-semibold text-white transition-transform duration-300 hover:scale-105"
                    >
                      Personnaliser
                    </button>
                  )}
                </div>
              </div>

              <div
                className="pointer-events-none absolute -right-6 top-8 h-16 w-16 rounded-full opacity-30 blur-3xl transition-opacity duration-300 group-hover:opacity-70"
                style={{ backgroundColor: styles.accentColor }}
                aria-hidden
              />
            </div>
          </article>
        );
      })}

      {/* Carte Mode Custom */}
      {onCustomMode && (
        <article>
          <div
            className="group relative w-full overflow-hidden rounded-2xl md:rounded-3xl border border-white/10 bg-slate-900/40 p-5 md:p-8 text-left transition-transform duration-300 hover:-translate-y-1 hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            style={{
              background: "linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(236, 72, 153, 0.15) 50%, rgba(251, 146, 60, 0.15) 100%)",
              borderColor: "rgba(139, 92, 246, 0.3)",
              boxShadow: "0 8px 32px rgba(139, 92, 246, 0.2)",
            }}
          >
            <div
              className="absolute inset-0 rounded-[22px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: "radial-gradient(circle at center, rgba(139, 92, 246, 0.3) 0%, transparent 70%)" }}
              aria-hidden
            />

            <div className="relative z-10 flex flex-col items-center gap-4">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full transition-transform duration-300 group-hover:rotate-6"
                style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #EC4899 50%, #FB923C 100%)" }}
              >
                <Shuffle className="h-10 w-10 text-white" />
              </div>

              <h2 className="text-center text-2xl font-bold uppercase tracking-wide text-white">
                Mode Custom
              </h2>

              <p className="text-center text-sm text-white/80">
                Mélangez les œuvres de tous les univers (8 max)
              </p>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={onCustomMode}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 px-6 py-2 text-sm font-semibold text-white transition-transform duration-300 hover:scale-105 shadow-lg shadow-purple-500/30"
                >
                  Personnaliser
                </button>
              </div>
            </div>

            <div
              className="pointer-events-none absolute -right-6 top-8 h-16 w-16 rounded-full opacity-30 blur-3xl transition-opacity duration-300 group-hover:opacity-70"
              style={{ backgroundColor: "#8B5CF6" }}
              aria-hidden
            />
          </div>
        </article>
      )}
    </div>
  );
};

export const UniverseGrid = memo(UniverseGridComponent);
UniverseGrid.displayName = "UniverseGrid";
