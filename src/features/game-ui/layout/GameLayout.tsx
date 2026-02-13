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
  const shouldDockScoreboardInTopChrome =
    Boolean(topButtons) &&
    hasScoreboard &&
    policy.useFloatingScoreboardMobile &&
    !policy.useInlineTopButtonsMobile &&
    Boolean(scoreboardCompact);

  return (
    <>
      {topButtons && (
        <div
          data-testid="game-layout-top-buttons"
          className={cn(
            "fixed z-50",
            shouldDockScoreboardInTopChrome
              ? "grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 lg:flex lg:flex-col lg:items-start"
              : "flex flex-col items-start",
            chromeStyles.homeButtonAnchor,
            shouldDockScoreboardInTopChrome && chromeStyles.homeButtonAnchorRight
          )}
        >
          <div
            className={cn(
              "flex flex-col items-start",
              chromeStyles.homeButtonAnchorStacked,
              policy.useInlineTopButtonsMobile && chromeStyles.homeButtonAnchorInlineMobile
            )}
          >
            {topButtons}
          </div>

          {shouldDockScoreboardInTopChrome ? (
            <div className="lg:hidden justify-self-end self-start min-w-0">
              <div className="pointer-events-auto">{scoreboardCompact}</div>
            </div>
          ) : null}
        </div>
      )}

      {hasScoreboard && policy.useFloatingScoreboardMobile && scoreboardCompact && !shouldDockScoreboardInTopChrome && (
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
          "container mx-auto px-4 py-5 lg:py-8 relative z-10 h-full flex flex-col",
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
          <div className="lg:hidden flex justify-center mb-4 lg:mb-6" data-testid="game-layout-scoreboard-compact">
            {scoreboardCompact}
          </div>
        )}

        {hasScoreboard ? (
          <>
            <div className="hidden lg:grid lg:grid-cols-[clamp(13rem,18vw,20rem)_minmax(0,1fr)_clamp(13rem,18vw,20rem)] lg:items-start lg:gap-6 flex-1 min-h-0">
              <div aria-hidden />
              <div
                data-testid="game-layout-center"
                className={cn(
                  "flex flex-col items-center justify-start lg:justify-center gap-3 lg:gap-4 min-h-0",
                  policy.needsFloatingScoreboardGap && styles.multiGameCenterFloatingGap
                )}
              >
                {center}
              </div>
              <div className="sticky top-6 self-start justify-self-end" data-testid="game-layout-scoreboard">
                {scoreboard}
              </div>
            </div>

            <div className="lg:hidden flex-1 min-h-0">
              <div
                data-testid="game-layout-center"
                className={cn(
                  "flex flex-col items-center justify-start gap-3 min-h-0",
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
            className="flex flex-col items-center justify-start lg:justify-center gap-3 lg:gap-4 flex-1 min-h-0"
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
