"use client";

import { memo, useCallback, useMemo, useRef } from "react";
import { Play as PlayIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Universe } from "@/types";
import { generateStylesFromColor } from "@/utils/colorGenerator";
import { getUniverseBackgroundImage, CUSTOM_UNIVERSE_ID } from "@/constants/gameModes";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { OutlinedTitle } from "@/components/ui/OutlinedTitle";
import { pressable } from "@/styles/ui";

interface UniverseGridProps {
  universes: Universe[];
  error?: string | null;
  onSelect: (id: string) => void;
  onCustomize?: (universe: Universe) => void;
  onCustomMode?: () => void;
}

const DEFAULT_COLOR = "#3B82F6";
const EMPTY_MESSAGE = "Les univers magiques sont en cours de preparation... Revenez bientot !";

/** Taille fixe pour toutes les cartes (meme hauteur et largeur via la grille). */
const CARD_SIZE_CLASSES = "h-[280px] flex flex-col justify-between p-5 md:p-6";
const CARD_BASE_CLASSES =
  "relative w-full overflow-hidden rounded-3xl border-2 border-black text-left shadow-[4px_4px_0_#1B1B1B]";
const BUTTON_BASE_CLASSES = "px-3 py-1.5 text-[10px] font-extrabold";

/** Overlay semi-transparent pour garder le texte lisible sur l'image de fond. */
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

/** Placement xl : 2 lignes x 3 carres (colonnes 1-3), pour Tailwind JIT. */
const XL_GRID_PLACEMENT = [
  "xl:col-start-1 xl:row-start-1",
  "xl:col-start-2 xl:row-start-1",
  "xl:col-start-3 xl:row-start-1",
  "xl:col-start-1 xl:row-start-2",
  "xl:col-start-2 xl:row-start-2",
  "xl:col-start-3 xl:row-start-2",
  "xl:col-start-1 xl:row-start-3",
  "xl:col-start-2 xl:row-start-3",
  "xl:col-start-3 xl:row-start-3",
  "xl:col-start-1 xl:row-start-4",
  "xl:col-start-2 xl:row-start-4",
  "xl:col-start-3 xl:row-start-4",
] as const;

const UniverseGridComponent = ({
  universes,
  error,
  onSelect,
  onCustomize,
  onCustomMode,
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
          <p className="text-[var(--color-text-secondary)] mt-4">{EMPTY_MESSAGE}</p>
        </div>
      </div>
    );
  }

  if (universes.length === 0) {
    return (
      <div className="text-center">
        <div className="magic-card p-12 max-w-2xl mx-auto">
          <ErrorMessage message="Aucun univers disponible pour le moment" />
          <p className="text-[var(--color-text-secondary)] mt-4">{EMPTY_MESSAGE}</p>
        </div>
      </div>
    );
  }

  const pressClasses = pressable;
  const totalCards = universes.length + (onCustomMode ? 1 : 0);
  const isLastCardAlone = totalCards % 2 === 1;
  const customBgImage = getUniverseBackgroundImage(CUSTOM_UNIVERSE_ID);

  return (
    <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_minmax(0,6rem)] gap-4 md:gap-6 md:gap-8 max-w-6xl mx-auto">
      {universes.map((universe, index) => {
        const styles = styleCache.get(universe.id);
        if (!styles) {
          return null;
        }
        const isLastUniverseAndAlone =
          index === universes.length - 1 && !onCustomMode && isLastCardAlone;
        const spanFullRowMobile = isLastUniverseAndAlone ? "col-span-2 md:col-span-2" : "";
        const xlPlacement = XL_GRID_PLACEMENT[index] ?? "";

        return (
          <article
            key={universe.id}
            className={`${spanFullRowMobile} ${xlPlacement}`}
            onMouseEnter={() => handlePrefetch(universe.id)}
            onFocus={() => handlePrefetch(universe.id)}
          >
            <div
              className={`${CARD_BASE_CLASSES} ${CARD_SIZE_CLASSES}`}
              style={{
                ...getCardBackgroundStyle(styles.bgImage, styles.inlineStyles.background),
                borderColor: styles.inlineStyles.borderColor,
                boxShadow: styles.inlineStyles.boxShadow,
              }}
            >
              <div
                className={`relative z-10 flex flex-col items-center gap-2 flex-1 justify-center ${
                  styles.bgImage ? "text-white [--color-text-primary:white]" : ""
                }`}
              >
                <OutlinedTitle
                  as="h2"
                  className="text-center text-2xl font-extrabold tracking-wide"
                >
                  {universe.name}
                </OutlinedTitle>

                <div className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSelect(universe.id)}
                    className={`${BUTTON_BASE_CLASSES} bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-light)] ${pressClasses}`}
                  >
                    <PlayIcon className="h-3 w-3 inline-block mr-1" />
                    Mode Rapide
                  </button>
                  {onCustomize && (
                    <button
                      type="button"
                      onClick={() => onCustomize(universe)}
                      className={`${BUTTON_BASE_CLASSES} bg-white hover:bg-[var(--color-surface-overlay)] ${pressClasses}`}
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
        <article
          className={`${isLastCardAlone ? "col-span-2 md:col-span-2 " : ""}xl:col-start-4 xl:row-start-1 xl:row-span-2`}
        >
          <div
            className={`${CARD_BASE_CLASSES} h-[280px] xl:h-full flex flex-col justify-center items-center p-3 xl:p-4 gap-2`}
            style={getCardBackgroundStyle(
              customBgImage,
              "linear-gradient(180deg, rgba(167, 139, 250, 0.25) 0%, rgba(255, 255, 255, 0.95) 60%)"
            )}
          >
            <div
              className={`relative z-10 flex flex-col items-center gap-2 flex-1 justify-center xl:justify-center xl:py-4 ${
                customBgImage ? "text-white [--color-text-primary:white]" : ""
              }`}
            >
              <OutlinedTitle
                as="h2"
                className="text-center text-2xl font-extrabold tracking-wide"
              >
                Mode Custom
              </OutlinedTitle>

              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={onCustomMode}
                  className={`${BUTTON_BASE_CLASSES} bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-light)] ${pressClasses}`}
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
