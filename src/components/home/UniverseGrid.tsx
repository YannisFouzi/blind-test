"use client";

import { memo, useCallback, useMemo, useRef } from "react";
import { Play as PlayIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Universe } from "@/types";
import { generateStylesFromColor } from "@/utils/colorGenerator";
import {
  getUniverseBackgroundImage,
  CUSTOM_UNIVERSE_ID,
  RANDOM_UNIVERSE_ID,
} from "@/constants/gameModes";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { pressable } from "@/styles/ui";

interface UniverseGridProps {
  universes: Universe[];
  error?: string | null;
  onSelect: (id: string) => void;
  onCustomize?: (universe: Universe) => void;
  onCustomMode?: () => void;
  onRandomMode?: () => void;
}

const DEFAULT_COLOR = "#3B82F6";

/** Taille fixe pour toutes les cartes (même hauteur et largeur via la grille) */
const CARD_SIZE_CLASSES =
  "h-[280px] flex flex-col justify-between p-5 md:p-6";

/** Overlay semi-transparent pour garder le texte lisible sur l'image de fond */
const IMAGE_OVERLAY =
  "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.5) 100%)";

const buildUniverseStyles = (universe: Universe) => {
  const color = universe.color.startsWith("#") ? universe.color : DEFAULT_COLOR;
  const styles = generateStylesFromColor(color);
  const bgImage = getUniverseBackgroundImage(universe.id, universe.name);
  return {
    inlineStyles: styles.inlineStyles,
    bgImage,
  };
};

const getCardBackgroundStyle = (bgImage: string | null, fallbackGradient: string) => {
  if (bgImage) {
    return {
      backgroundImage: `${IMAGE_OVERLAY}, url(${bgImage})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    } as React.CSSProperties;
  }
  return { background: fallbackGradient } as React.CSSProperties;
};

const UniverseGridComponent = ({
  universes,
  error,
  onSelect,
  onCustomize,
  onCustomMode,
  onRandomMode,
}: UniverseGridProps) => {
  const router = useRouter();
  const prefetchedUniversesRef = useRef<Set<string>>(new Set());

  const styleCache = useMemo(() => {
    const cache = new Map<string, ReturnType<typeof buildUniverseStyles>>();
    universes.forEach((universe) => {
      cache.set(universe.id, buildUniverseStyles(universe));
    });
    return cache;
  }, [universes]);

  const handlePrefetch = useCallback(
    (universeId: string) => {
      if (prefetchedUniversesRef.current.has(universeId)) {
        return;
      }

      prefetchedUniversesRef.current.add(universeId);
      router.prefetch(`/game/${universeId}`);
    },
    [router]
  );

  if (error) {
    return (
      <div className="text-center">
        <div className="magic-card p-12 max-w-2xl mx-auto">
          <ErrorMessage message={error} />
          <p className="text-[var(--color-text-secondary)] mt-4">
            Les univers magiques sont en cours de preparation... Revenez bientot !
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
          <p className="text-[var(--color-text-secondary)] mt-4">
            Les univers magiques sont en cours de preparation... Revenez bientot !
          </p>
        </div>
      </div>
    );
  }

  const pressClasses = pressable;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
      {universes.map((universe) => {
        const styles = styleCache.get(universe.id);
        if (!styles) {
          return null;
        }

        return (
          <article
            key={universe.id}
            onMouseEnter={() => handlePrefetch(universe.id)}
            onFocus={() => handlePrefetch(universe.id)}
          >
            <div
              className={`relative w-full overflow-hidden rounded-3xl border-2 border-black text-left shadow-[4px_4px_0_#1B1B1B] ${CARD_SIZE_CLASSES}`}
              style={{
                ...getCardBackgroundStyle(styles.bgImage, styles.inlineStyles.background),
                borderColor: styles.inlineStyles.borderColor,
                boxShadow: styles.inlineStyles.boxShadow,
              }}
            >
              <div
                className={`relative z-10 flex flex-col items-center gap-2 flex-1 justify-center ${styles.bgImage ? "text-white [--color-text-primary:white]" : ""}`}
              >
                <h2 className="text-center text-2xl font-extrabold uppercase tracking-wide text-[var(--color-text-primary)] drop-shadow-md">
                  {universe.name}
                </h2>

                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => onSelect(universe.id)}
                    className={`px-5 py-2 text-xs font-extrabold bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-light)] ${pressClasses}`}
                  >
                    <PlayIcon className="h-4 w-4" />
                    Mode Rapide
                  </button>
                  {onCustomize && (
                    <button
                      type="button"
                      onClick={() => onCustomize(universe)}
                      className={`px-5 py-2 text-xs font-extrabold bg-white hover:bg-[var(--color-surface-overlay)] ${pressClasses}`}
                    >
                      Personnaliser
                    </button>
                  )}
                </div>
              </div>
            </div>
          </article>
        );
      })}

      {onCustomMode && (
        <article>
          <div
            className={`relative w-full overflow-hidden rounded-3xl border-2 border-black text-left shadow-[4px_4px_0_#1B1B1B] ${CARD_SIZE_CLASSES}`}
            style={getCardBackgroundStyle(
              getUniverseBackgroundImage(CUSTOM_UNIVERSE_ID),
              "linear-gradient(180deg, rgba(167, 139, 250, 0.25) 0%, rgba(255, 255, 255, 0.95) 60%)"
            )}
          >
            <div className="relative z-10 flex flex-col items-center gap-2 flex-1 justify-center text-white [--color-text-primary:white]">
              <h2 className="text-center text-2xl font-extrabold uppercase tracking-wide text-[var(--color-text-primary)] drop-shadow-md">
                Mode Custom
              </h2>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={onCustomMode}
                  className={`px-5 py-2 text-xs font-extrabold bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-light)] ${pressClasses}`}
                >
                  Personnaliser
                </button>
              </div>
            </div>
          </div>
        </article>
      )}

      {onRandomMode && (
        <article>
          <div
            className={`relative w-full overflow-hidden rounded-3xl border-2 border-black text-left shadow-[4px_4px_0_#1B1B1B] ${CARD_SIZE_CLASSES}`}
            style={getCardBackgroundStyle(
              getUniverseBackgroundImage(RANDOM_UNIVERSE_ID),
              "linear-gradient(180deg, rgba(16, 185, 129, 0.2) 0%, rgba(255, 255, 255, 0.95) 60%)"
            )}
          >
            <div className="relative z-10 flex flex-col items-center gap-2 flex-1 justify-center text-white [--color-text-primary:white]">
              <h2 className="text-center text-2xl font-extrabold uppercase tracking-wide text-[var(--color-text-primary)] drop-shadow-md">
                Mode aléatoire
              </h2>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={onRandomMode}
                  className={`px-5 py-2 text-xs font-extrabold bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-light)] ${pressClasses}`}
                >
                  Personnaliser
                </button>
              </div>
            </div>
          </div>
        </article>
      )}
    </div>
  );
};

export const UniverseGrid = memo(UniverseGridComponent);
UniverseGrid.displayName = "UniverseGrid";
