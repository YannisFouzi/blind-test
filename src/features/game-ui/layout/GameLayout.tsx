import { memo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import chromeStyles from "@/styles/gameChrome.module.css";
import { getLayoutPolicy, type GameMode } from "./layoutPolicy";
import styles from "./GameLayout.module.css";

type GameLayoutProps = {
  mode: GameMode;
  cardCount: number;
  topButtons?: ReactNode;
  scoreboard?: ReactNode;
  scoreboardCompact?: ReactNode;
  center: ReactNode;
};

const GameLayoutComponent = ({
  mode,
  cardCount,
  topButtons,
  scoreboard,
  scoreboardCompact,
  center,
}: GameLayoutProps) => {
  const policy = getLayoutPolicy({ mode, cardCount });
  const hasScoreboard = mode === "multi" && Boolean(scoreboard);

  return (
    <>
      {topButtons && (
        <div
          data-testid="game-layout-top-buttons"
          className={cn(
            "fixed z-50 flex flex-col items-start",
            chromeStyles.homeButtonAnchor,
            chromeStyles.homeButtonAnchorStacked,
            policy.useInlineTopButtonsMobile && chromeStyles.homeButtonAnchorInlineMobile
          )}
        >
          {topButtons}
        </div>
      )}

      {hasScoreboard && policy.useFloatingScoreboardMobile && scoreboardCompact && (
        <div
          data-testid="game-layout-floating-scoreboard"
          className={cn(
            "fixed left-1/2 -translate-x-1/2 z-40 lg:hidden pointer-events-none",
            chromeStyles.floatingScoreboard
          )}
        >
          <div className="pointer-events-auto">{scoreboardCompact}</div>
        </div>
      )}

      <div
        className={cn(
          "container mx-auto px-4 py-6 sm:py-8 relative z-10",
          styles.playerSafeArea,
          chromeStyles.homeSafeArea,
          policy.useInlineTopButtonsMobile
            ? chromeStyles.homeSafeAreaInlineMobile
            : mode === "multi"
              ? chromeStyles.homeSafeAreaStackedMobile
              : null
        )}
        data-mode={mode}
        data-card-count={cardCount}
        data-testid="game-layout-container"
      >
        {hasScoreboard && !policy.useFloatingScoreboardMobile && scoreboardCompact && (
          <div className="lg:hidden flex justify-center mb-4 sm:mb-6" data-testid="game-layout-scoreboard-compact">
            {scoreboardCompact}
          </div>
        )}

        {hasScoreboard ? (
          <>
            <div className="hidden lg:grid lg:grid-cols-[clamp(13rem,18vw,20rem)_minmax(0,1fr)_clamp(13rem,18vw,20rem)] lg:items-start lg:gap-6">
              <div aria-hidden />
              <div
                data-testid="game-layout-center"
                className={cn(
                  "flex flex-col items-center justify-center gap-3 sm:gap-4 min-h-[calc(100svh-180px)] sm:min-h-[calc(100svh-240px)] md:min-h-[calc(100svh-280px)]",
                  policy.needsFloatingScoreboardGap && styles.multiGameCenterFloatingGap
                )}
              >
                {center}
              </div>
              <div className="sticky top-6 self-start justify-self-end" data-testid="game-layout-scoreboard">
                {scoreboard}
              </div>
            </div>

            <div className="lg:hidden">
              <div
                data-testid="game-layout-center"
                className={cn(
                  "flex flex-col items-center justify-center gap-3 sm:gap-4 min-h-[calc(100svh-180px)] sm:min-h-[calc(100svh-240px)] md:min-h-[calc(100svh-280px)]",
                  policy.needsFloatingScoreboardGap && styles.multiGameCenterFloatingGap
                )}
              >
                {center}
              </div>
            </div>
          </>
        ) : (
          <div
            data-testid="game-layout-center"
            className="flex flex-col items-center justify-center gap-3 sm:gap-4 min-h-[calc(100svh-180px)] sm:min-h-[calc(100svh-240px)] md:min-h-[calc(100svh-280px)]"
          >
            {center}
          </div>
        )}
      </div>
    </>
  );
};

export const GameLayout = memo(GameLayoutComponent);
GameLayout.displayName = "GameLayout";
