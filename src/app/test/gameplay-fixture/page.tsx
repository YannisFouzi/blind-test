"use client";

import { Suspense, useMemo, type ReactNode } from "react";
import { Home as HomeIcon, LogOut } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { DoubleWorkSelector, PlayerDome, WorkSelector } from "@/features/game-ui/components";
import { GameActionButton } from "@/features/game-ui/components/GameActionButton";
import { GameLayout, GameStage, getLayoutPolicy } from "@/features/game-ui/layout";
import { PlayersScoreboard } from "@/features/multiplayer-game/components/PlayersScoreboard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import chromeStyles from "@/styles/gameChrome.module.css";
import {
  buildGameplayFixtureModel,
  parseGameplayFixtureConfig,
} from "@/features/game-ui/fixtures/gameplayFixture";

const NOOP = () => {};

const FixturePageContent = () => {
  const searchParams = useSearchParams();

  const model = useMemo(() => {
    const config = parseGameplayFixtureConfig(searchParams);
    return buildGameplayFixtureModel(config);
  }, [searchParams]);

  const footer = useMemo<ReactNode>(() => {
    if (!model.showAnswer) {
      return null;
    }

    const metadata = model.config.variant === "double" ? (
      <div className="space-y-1">
        {model.roundSongs.map((song) => {
          const relatedWork = model.works.find((work) => work.id === song.workId);
          return (
            <p
              key={song.id}
              className="text-[0.65rem] sm:text-sm md:text-base text-[var(--color-text-primary)] font-semibold tracking-wide leading-tight"
            >
              {song.artist}
              {" \u2014 "}
              <span className="text-[#B45309]">{song.title}</span>
              {relatedWork && (
                <span className="ml-2 text-[0.65rem] sm:text-xs text-[var(--color-text-secondary)]">
                  ({relatedWork.title})
                </span>
              )}
            </p>
          );
        })}
      </div>
    ) : (
      <p className="text-[0.7rem] sm:text-sm md:text-base text-[var(--color-text-primary)] font-semibold tracking-wide">
        {model.currentSong.artist}
        {" \u2014 "}
        <span className="text-[#B45309]">{model.currentSong.title}</span>
      </p>
    );

    return (
      <div
        data-testid="fixture-answer-footer"
        className="flex flex-col items-center justify-center gap-2 sm:gap-3"
      >
        <div className="px-3 py-1.5 sm:px-5 sm:py-3 rounded-2xl bg-white border-[3px] border-[#1B1B1B] text-center shadow-[4px_4px_0_#1B1B1B]">
          {metadata}
        </div>
        {model.footerActionLabel ? (
          <div data-testid="fixture-primary-action">
            <GameActionButton label={model.footerActionLabel} onClick={NOOP} compact={model.works.length >= 7} />
          </div>
        ) : null}
      </div>
    );
  }, [model]);

  const center = useMemo(() => {
    if (model.config.variant === "double") {
      return (
        <DoubleWorkSelector
          mode={model.config.mode}
          works={model.works}
          roundSongs={model.roundSongs}
          selectedWorkSlot1={model.selectedWorkSlot1}
          selectedWorkSlot2={model.selectedWorkSlot2}
          showAnswer={model.showAnswer}
          canValidate={model.canValidate}
          isCurrentSongAnswered={model.isCurrentSongAnswered}
          onSelectSlotWork={NOOP}
          onValidateAnswer={NOOP}
          onClearWorkSelection={NOOP}
          footer={footer}
        />
      );
    }

    return (
      <WorkSelector
        mode={model.config.mode}
        works={model.works}
        currentSongWorkId={model.currentSong.workId}
        selectedWork={model.selectedWork}
        showAnswer={model.showAnswer}
        canValidate={model.canValidate}
        isCurrentSongAnswered={model.isCurrentSongAnswered}
        onWorkSelection={NOOP}
        onValidateAnswer={NOOP}
        footer={footer}
      />
    );
  }, [footer, model]);

  const topButtons = useMemo(() => {
    if (model.config.mode === "solo") {
      return (
        <button
          type="button"
          onClick={NOOP}
          data-testid="fixture-home-button"
          className={cn("magic-button flex items-center", chromeStyles.homeButton)}
        >
          <HomeIcon className="text-base sm:text-lg" />
          <span className={chromeStyles.homeButtonLabel}>Accueil</span>
        </button>
      );
    }

    const policy = getLayoutPolicy({
      mode: "multi",
      cardCount: model.config.cards,
    });
    const showQuitLabelOnMobile = policy.useInlineTopButtonsMobile;

    return (
      <>
        <button
          type="button"
          onClick={NOOP}
          data-testid="fixture-home-button"
          className={cn("magic-button flex items-center", chromeStyles.homeButton)}
        >
          <HomeIcon className="text-base sm:text-lg" />
          <span className={chromeStyles.homeButtonLabel}>Accueil</span>
        </button>
        <button
          type="button"
          onClick={NOOP}
          data-testid="fixture-quit-button"
          className={cn(
            "magic-button flex items-center bg-[#fca5a5] hover:bg-[#f87171]",
            chromeStyles.homeButton
          )}
        >
          <LogOut className="text-base sm:text-lg" />
          <span className={showQuitLabelOnMobile ? "inline" : "hidden sm:inline"}>Quitter</span>
        </button>
      </>
    );
  }, [model.config.cards, model.config.mode]);

  const centerNode = (
    <div className="w-full flex justify-center" data-testid="fixture-center-content">
      {center}
    </div>
  );

  return (
    <GameStage>
      <div data-testid="fixture-root">
        <GameLayout
          mode={model.config.mode}
          cardCount={model.config.cards}
          topButtons={topButtons}
          scoreboard={
            model.config.mode === "multi" ? (
              <PlayersScoreboard players={model.players} currentPlayerId={model.currentPlayerId} />
            ) : undefined
          }
          scoreboardCompact={
            model.config.mode === "multi" ? (
              <PlayersScoreboard
                players={model.players}
                currentPlayerId={model.currentPlayerId}
                compact
              />
            ) : undefined
          }
          center={centerNode}
        />

        <PlayerDome
          currentTimeLabel="1:10"
          durationLabel="3:40"
          isPlaying={false}
          playbackUnavailable={false}
          onTogglePlay={NOOP}
          canGoPrev={model.config.mode === "solo"}
          onPrev={model.config.mode === "solo" ? NOOP : undefined}
          canGoNext={model.config.mode === "solo"}
          onNext={model.config.mode === "solo" ? NOOP : undefined}
          isReverseMode={false}
          isDoubleMode={model.config.variant === "double"}
          progress={42}
          onTimelineClick={NOOP}
          roundLabel={`Manche 4 / ${model.config.cards + 50}`}
          correctCount={model.score.correct}
          incorrectCount={model.score.incorrect}
          isMuted={false}
          onToggleMute={NOOP}
          volume={70}
          onVolumeBarClick={NOOP}
        />
      </div>
    </GameStage>
  );
};

const FixtureFallback = () => (
  <div className="min-h-screen bg-[var(--color-surface-base)] flex items-center justify-center">
    <LoadingSpinner />
  </div>
);

export default function FixturePage() {
  return (
    <Suspense fallback={<FixtureFallback />}>
      <FixturePageContent />
    </Suspense>
  );
}
