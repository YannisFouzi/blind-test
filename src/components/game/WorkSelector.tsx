import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Work } from "@/types";

interface WorkSelectorProps {
  works: Work[];
  currentSongWorkId: string | undefined;
  selectedWork: string | null;
  showAnswer: boolean;
  canValidate: boolean;
  canGoNext: boolean;
  isCurrentSongAnswered: boolean;
  onWorkSelection: (workId: string) => void;
  onValidateAnswer: () => void;
  onNextSong: () => void;
}

const WorkSelectorComponent = ({
  works,
  currentSongWorkId,
  selectedWork,
  showAnswer,
  canValidate,
  canGoNext,
  isCurrentSongAnswered,
  onWorkSelection,
  onValidateAnswer,
  onNextSong,
}: WorkSelectorProps) => {
  const [isValidateButtonVisible, setIsValidateButtonVisible] = useState(true);
  const [isNextButtonVisible, setIsNextButtonVisible] = useState(true);
  const [cardAnimations, setCardAnimations] = useState<{
    [key: string]: boolean;
  }>({});
  const validateButtonRef = useRef<HTMLDivElement>(null);
  const nextButtonRef = useRef<HTMLDivElement>(null);

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

    const handleNextButtonVisibility = (
      entries: IntersectionObserverEntry[]
    ) => {
      entries.forEach((entry) => {
        setIsNextButtonVisible(entry.isIntersecting);
      });
    };

    const validateObserver = new IntersectionObserver(
      handleValidateButtonVisibility,
      observerOptions
    );
    const nextObserver = new IntersectionObserver(
      handleNextButtonVisibility,
      observerOptions
    );

    if (validateButtonRef.current && canValidate && !isCurrentSongAnswered) {
      validateObserver.observe(validateButtonRef.current);
    }
    if (nextButtonRef.current && showAnswer && canGoNext) {
      nextObserver.observe(nextButtonRef.current);
    }

    return () => {
      validateObserver.disconnect();
      nextObserver.disconnect();
    };
  }, [canValidate, showAnswer, canGoNext, isCurrentSongAnswered]);

  const handleCardClick = useCallback((workId: string) => {
    if (showAnswer || isCurrentSongAnswered) return;

    // Animation de clic
    setCardAnimations((prev) => ({ ...prev, [workId]: true }));
    setTimeout(() => {
      setCardAnimations((prev) => ({ ...prev, [workId]: false }));
    }, 300);

    onWorkSelection(workId);
  }, [showAnswer, isCurrentSongAnswered, onWorkSelection]);

  const getWorkCardClassName = useCallback((work: Work) => {
    let className =
      "relative cursor-pointer transform transition-all duration-300 ease-out";

    if (showAnswer || isCurrentSongAnswered) {
      className += " cursor-default";

      if (work.id === currentSongWorkId) {
        // Bonne réponse - effet doré magique
        className += " scale-105";
      } else if (work.id === selectedWork) {
        // Mauvaise réponse - effet rouge
        className += " scale-95";
      } else {
        // Autres options - effet fade
        className += " opacity-50 scale-95";
      }
    } else {
      if (work.id === selectedWork) {
        // Sélectionné
        className += " scale-105";
      } else {
        // Non sélectionné
        className += "";
      }
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
      const isAnimating = cardAnimations[work.id];

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
              className={`relative work-card h-full flex flex-col justify-center items-center p-4 transform transition-all duration-300 ${
                isAnimating ? "scale-95" : ""
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
    cardAnimations,
    getWorkCardClassName,
    handleCardClick,
  ]);

  return (
    <>
      <div className="relative">
        <div className="space-y-8">
          {/* Titre avec effet magique */}
          {/* <div className="text-center mb-8">
            <h2 className="fantasy-text text-4xl md:text-5xl font-bold mb-4">
              Sélectionnez l&apos;œuvre
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-blue-400 to-purple-500 mx-auto rounded-full glow-effect" />
          </div> */}

          {/* Grille de cartes responsive avec tailles uniformes */}
          <div className="uniform-card-grid">{workCards}</div>

          {/* Bouton valider avec nouveau design */}
          {canValidate && !isCurrentSongAnswered && (
            <div ref={validateButtonRef} className="text-center mb-6">
              <button
                onClick={onValidateAnswer}
                className="magic-button px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-bold"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Valider ma réponse
                </span>
              </button>
            </div>
          )}

          {/* Bouton suivant avec nouveau design */}
          {showAnswer && canGoNext && (
            <div ref={nextButtonRef} className="text-center">
              <button
                onClick={onNextSong}
                className="magic-button px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-bold"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Morceau suivant
                </span>
              </button>
            </div>
          )}
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
              Valider ma réponse
            </span>
          </button>
        </div>
      )}

      {showAnswer && canGoNext && !isNextButtonVisible && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 whitespace-nowrap">
          <button
            onClick={onNextSong}
            className="magic-button px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-bold"
          >
            <span className="relative z-10 flex items-center gap-2">
              Morceau suivant
            </span>
          </button>
        </div>
      )}
    </>
  );
};

export const WorkSelector = memo(WorkSelectorComponent);
WorkSelector.displayName = "WorkSelector";
