import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Work } from "@/types";
import { GameActionButton } from "./GameActionButton";
import { WorkCardShell } from "./WorkCardShell";

export interface WorkSelectorProps {
  works: Work[];
  currentSongWorkId: string | undefined;
  selectedWork: string | null;
  showAnswer: boolean;
  canValidate: boolean;
  isCurrentSongAnswered: boolean;
  onWorkSelection: (workId: string) => void;
  onValidateAnswer: () => void;
  footer?: ReactNode;
}

const WorkSelectorComponent = ({
  works,
  currentSongWorkId,
  selectedWork,
  showAnswer,
  canValidate,
  isCurrentSongAnswered,
  onWorkSelection,
  onValidateAnswer,
  footer,
}: WorkSelectorProps) => {
  const validateLabel = "Valider ma reponse";
  const [isValidateButtonVisible, setIsValidateButtonVisible] = useState(true);
  const validateButtonRef = useRef<HTMLDivElement>(null);
  const isAnswerRevealed = showAnswer || isCurrentSongAnswered;
  const canInteract = !isAnswerRevealed;

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: "0px",
      threshold: 0.1,
    };

    const handleValidateButtonVisibility = (
      entries: IntersectionObserverEntry[]
    ) => {
      entries.forEach((entry) => {
        setIsValidateButtonVisible(entry.isIntersecting);
      });
    };

    const validateObserver = new IntersectionObserver(
      handleValidateButtonVisibility,
      observerOptions
    );

    if (validateButtonRef.current && canValidate && !isCurrentSongAnswered) {
      validateObserver.observe(validateButtonRef.current);
    }

    return () => {
      validateObserver.disconnect();
    };
  }, [canValidate, isCurrentSongAnswered]);

  const handleCardClick = useCallback(
    (workId: string) => {
      if (!canInteract) return;

      onWorkSelection(workId);
    },
    [canInteract, onWorkSelection]
  );

  const workCards = useMemo(() => {
    return works.map((work, index) => {
      const isCorrect = work.id === currentSongWorkId;
      const isSelected = work.id === selectedWork;
      const isWrong = isSelected && !isCorrect && isAnswerRevealed;
      const wrapperClassName = [
        "relative transition-all duration-200 ease-out",
        canInteract ? "cursor-pointer" : "cursor-default",
        !canInteract && !isCorrect && !isSelected ? "opacity-50 scale-95" : "",
      ]
        .filter(Boolean)
        .join(" ");

      const backgroundStyle = isAnswerRevealed
        ? isCorrect
          ? {
              background:
                "linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(132, 204, 22, 0.2))",
            }
          : isWrong
          ? {
              background:
                "linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(248, 113, 113, 0.18))",
            }
          : undefined
        : undefined;

      const titleClassName = isAnswerRevealed
        ? isCorrect
          ? "text-green-700"
          : isWrong
          ? "text-red-600"
          : "text-[var(--color-text-primary)]"
        : isSelected
        ? "work-card-title--active"
        : "text-[var(--color-text-primary)]";

      return (
        <div
          key={work.id}
          className={wrapperClassName}
          onClick={() => handleCardClick(work.id)}
          style={{
            animationDelay: `${index * 0.1}s`,
          }}
        >
          <WorkCardShell
            title={work.title}
            isInteractive={canInteract}
            isActive={isSelected}
            backgroundStyle={backgroundStyle}
            titleClassName={titleClassName}
          />
        </div>
      );
    });
  }, [works, currentSongWorkId, selectedWork, isAnswerRevealed, canInteract, handleCardClick]);

  return (
    <>
      <div className="relative">
        <div className="space-y-6">
          {/* Grille de cartes responsive avec tailles uniformes */}
          <div className="uniform-card-grid">{workCards}</div>

          {/* Zone d'actions reservee (valider ou resultat) */}
          <div
            ref={validateButtonRef}
            className="flex items-center justify-center min-h-[120px] sm:min-h-[124px]"
          >
            {!isAnswerRevealed ? (
              canValidate ? (
                <GameActionButton label={validateLabel} onClick={onValidateAnswer} />
              ) : null
            ) : (
              footer
            )}
          </div>
        </div>
      </div>

      {/* Boutons fixes - au-dessus de la barre de lecteur */}
      {canValidate && !isCurrentSongAnswered && !isValidateButtonVisible && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 whitespace-nowrap">
          <GameActionButton label={validateLabel} onClick={onValidateAnswer} />
        </div>
      )}
    </>
  );
};

export const WorkSelector = memo(WorkSelectorComponent);
WorkSelector.displayName = "WorkSelector";
