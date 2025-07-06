import { useEffect, useRef, useState } from "react";
import { Work } from "../../../types";
import { Button } from "../ui/Button";

interface WorkSelectorProps {
  works: Work[];
  currentSongWorkId: string | undefined;
  selectedWork: string | null;
  showAnswer: boolean;
  canValidate: boolean;
  canGoNext: boolean;
  onWorkSelection: (workId: string) => void;
  onValidateAnswer: () => void;
  onNextSong: () => void;
}

export const WorkSelector = ({
  works,
  currentSongWorkId,
  selectedWork,
  showAnswer,
  canValidate,
  canGoNext,
  onWorkSelection,
  onValidateAnswer,
  onNextSong,
}: WorkSelectorProps) => {
  const [isValidateButtonVisible, setIsValidateButtonVisible] = useState(true);
  const [isNextButtonVisible, setIsNextButtonVisible] = useState(true);
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

    if (validateButtonRef.current && canValidate) {
      validateObserver.observe(validateButtonRef.current);
    }
    if (nextButtonRef.current && showAnswer && canGoNext) {
      nextObserver.observe(nextButtonRef.current);
    }

    return () => {
      validateObserver.disconnect();
      nextObserver.disconnect();
    };
  }, [canValidate, showAnswer, canGoNext]);

  const getWorkButtonClassName = (work: Work) => {
    let className =
      "p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer text-center";

    if (showAnswer) {
      if (work.id === currentSongWorkId) {
        // Bonne réponse
        className += " border-yellow-500 bg-yellow-500/20 text-yellow-400";
      } else if (work.id === selectedWork) {
        // Mauvaise réponse sélectionnée
        className += " border-red-500 bg-red-500/20 text-red-400";
      } else {
        // Autres options
        className += " border-gray-600 bg-gray-700/30 text-gray-500";
      }
    } else {
      if (work.id === selectedWork) {
        className += " border-blue-500 bg-blue-500/20 text-blue-400";
      } else {
        className +=
          " border-gray-600 bg-gray-700/30 text-white hover:border-gray-500 hover:bg-gray-600/30";
      }
    }

    return className;
  };

  return (
    <>
      <div className="bg-slate-800/50 rounded-2xl p-8 border border-gray-700/50">
        <h3 className="text-2xl font-bold text-yellow-400 mb-6 text-center">
          Sélectionnez l'oeuvre
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {works.map((work) => (
            <button
              key={work.id}
              onClick={() => onWorkSelection(work.id)}
              className={`${getWorkButtonClassName(work)} ${
                showAnswer ? "cursor-default" : "cursor-pointer"
              }`}
              disabled={showAnswer}
            >
              <div className="text-sm font-medium">{work.title}</div>
              {showAnswer && work.id === currentSongWorkId && (
                <div className="text-xs text-yellow-300 mt-1">
                  Réponse correcte
                </div>
              )}
              {showAnswer &&
                work.id === selectedWork &&
                work.id !== currentSongWorkId && (
                  <div className="text-xs text-red-300 mt-1">Votre choix ✗</div>
                )}
            </button>
          ))}
        </div>

        {/* Bouton valider */}
        {canValidate && (
          <div ref={validateButtonRef} className="text-center">
            <Button onClick={onValidateAnswer} variant="success" size="large">
              Valider ma réponse
            </Button>
          </div>
        )}

        {/* Bouton suivant */}
        {showAnswer && canGoNext && (
          <div ref={nextButtonRef} className="text-center">
            <Button onClick={onNextSong} variant="primary" size="large">
              Morceau suivant
            </Button>
          </div>
        )}
      </div>

      {/* Bouton valider fixe */}
      {canValidate && !isValidateButtonVisible && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 whitespace-nowrap">
          <Button onClick={onValidateAnswer} variant="success" size="large">
            Valider ma réponse
          </Button>
        </div>
      )}

      {/* Bouton suivant fixe */}
      {showAnswer && canGoNext && !isNextButtonVisible && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 whitespace-nowrap">
          <Button onClick={onNextSong} variant="primary" size="large">
            Morceau suivant
          </Button>
        </div>
      )}
    </>
  );
};
