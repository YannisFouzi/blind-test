import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Work } from "@/types";

interface WorkSelectorProps {
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
  const [isValidateButtonVisible, setIsValidateButtonVisible] = useState(true);
  const validateButtonRef = useRef<HTMLDivElement>(null);

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
      if (showAnswer || isCurrentSongAnswered) return;

      onWorkSelection(workId);
    },
    [showAnswer, isCurrentSongAnswered, onWorkSelection]
  );

  const getWorkCardClassName = useCallback((work: Work) => {
    const isInteractive = !(showAnswer || isCurrentSongAnswered);
    let className = "relative transition-all duration-200 ease-out";

    if (!isInteractive) {
      className += " cursor-default";
      if (work.id === currentSongWorkId) {
        className += "";
      } else if (work.id === selectedWork) {
        className += "";
      } else {
        className += " opacity-50 scale-95";
      }
    } else {
      className += " cursor-pointer";
    }

    return className;
  }, [showAnswer, isCurrentSongAnswered, currentSongWorkId, selectedWork]);

  const workCards = useMemo(() => {
    return works.map((work, index) => {
      const isCorrect = work.id === currentSongWorkId;
      const isSelected = work.id === selectedWork;
      const isWrong =
        isSelected &&
        !isCorrect &&
        (showAnswer || isCurrentSongAnswered);
      return (
        <div
          key={work.id}
          className={getWorkCardClassName(work)}
          onClick={() => handleCardClick(work.id)}
          style={{
            animationDelay: `${index * 0.1}s`,
          }}
        >
          <div className="relative uniform-card">
            {/* Carte principale avec hauteur fixe */}
            <div
              className={`relative work-card h-full flex flex-col justify-center items-center p-4 ${
                !(showAnswer || isCurrentSongAnswered) ? "work-card--interactive" : ""
              } ${
                isSelected && !(showAnswer || isCurrentSongAnswered)
                  ? "work-card--active"
                  : ""
              }`}
              style={{
                background:
                  isCorrect && (showAnswer || isCurrentSongAnswered)
                    ? "linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(132, 204, 22, 0.2))"
                    : isWrong
                    ? "linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(248, 113, 113, 0.18))"
                    : undefined,
              }}
            >
              {/* Contenu centré */}
              <div className="relative z-10 text-center w-full flex flex-col justify-center h-full">
                {/* Titre avec gestion intelligente du débordement */}
                <h3
                  className={`uniform-card-title font-bold text-base transition-all duration-300 px-2 ${
                    isCorrect && (showAnswer || isCurrentSongAnswered)
                      ? "text-green-700"
                      : isWrong
                      ? "text-red-600"
                      : isSelected &&
                        !(showAnswer || isCurrentSongAnswered)
                      ? "work-card-title--active"
                      : "text-[var(--color-text-primary)]"
                  }`}
                  title={work.title} // Tooltip pour voir le titre complet
                >
                  {work.title}
                </h3>
              </div>
            </div>
          </div>
        </div>
      );
    });
  }, [
    works,
    currentSongWorkId,
    selectedWork,
    showAnswer,
    isCurrentSongAnswered,
    getWorkCardClassName,
    handleCardClick,
  ]);

  return (
    <>
      <div className="relative">
        <div className="space-y-6">
          {/* Titre avec effet magique */}
          {/* <div className="text-center mb-8">
            <h2 className="fantasy-text text-4xl md:text-5xl font-bold mb-4">
              Sélectionnez l&apos;œuvre
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-blue-400 to-purple-500 mx-auto rounded-full glow-effect" />
          </div> */}

          {/* Grille de cartes responsive avec tailles uniformes */}
          <div className="uniform-card-grid">{workCards}</div>

          {/* Zone d'actions réservée (valider ou résultat) */}
          <div
            ref={validateButtonRef}
            className="flex items-center justify-center min-h-[120px] sm:min-h-[140px]"
          >
            {!showAnswer && !isCurrentSongAnswered ? (
              canValidate ? (
                <button
                  onClick={onValidateAnswer}
                  className="magic-button px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-bold"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Valider ma reponse
                  </span>
                </button>
              ) : null
            ) : (
              footer
            )}
          </div>

        </div>
      </div>

      {/* Boutons fixes avec design amélioré - Au-dessus de la barre de lecteur */}
      {canValidate && !isCurrentSongAnswered && !isValidateButtonVisible && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 whitespace-nowrap">
          <button
            onClick={onValidateAnswer}
            className="magic-button px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-bold"
          >
            <span className="relative z-10 flex items-center gap-2">
              Valider ma reponse
            </span>
          </button>
        </div>
      )}
    </>
  );
};

export const WorkSelector = memo(WorkSelectorComponent);
WorkSelector.displayName = "WorkSelector";
