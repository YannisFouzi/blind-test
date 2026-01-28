import { memo, useCallback, useMemo, type ReactNode, type CSSProperties } from "react";
import type { Song, Work } from "@/types";

type SlotState = "none" | "pending" | "correct" | "wrong";

interface DoubleWorkSelectorProps {
  works: Work[];
  roundSongs: Song[];
  selectedWorkSlot1: string | null;
  selectedWorkSlot2: string | null;
  showAnswer: boolean;
  canValidate: boolean;
  isCurrentSongAnswered: boolean;
  onSelectSlotWork: (slotIndex: 0 | 1, workId: string) => void;
  onValidateAnswer: () => void;
  onClearWorkSelection: (workId: string) => void;
  footer?: ReactNode;
}

const DoubleWorkSelectorComponent = ({
  works,
  roundSongs,
  selectedWorkSlot1,
  selectedWorkSlot2,
  showAnswer,
  canValidate,
  isCurrentSongAnswered,
  onSelectSlotWork,
  onValidateAnswer,
  onClearWorkSelection,
  footer,
}: DoubleWorkSelectorProps) => {
  const songSlot1 = roundSongs[0];
  const songSlot2 = roundSongs[1];

  // Pour chaque œuvre, combien de chansons de ce round lui appartiennent
  const correctCountByWorkId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const song of roundSongs) {
      map[song.workId] = (map[song.workId] ?? 0) + 1;
    }
    return map;
  }, [roundSongs]);

  // Évalue pour chaque slot (1 / 2) si la sélection finale est correcte ou non,
  // en respectant la logique "multiset" (pas d'effet d'ordre).
  const [globalSlot1State, globalSlot2State] = useMemo<[SlotState, SlotState]>(() => {
    // Pas encore validé → juste des sélections "en attente"
    if (!showAnswer && !isCurrentSongAnswered) {
      return [
        selectedWorkSlot1 ? "pending" : "none",
        selectedWorkSlot2 ? "pending" : "none",
      ];
    }

    // Après validation → on compare aux œuvres correctes en multiset
    const remaining: Record<string, number> = {};
    for (const song of roundSongs) {
      remaining[song.workId] = (remaining[song.workId] ?? 0) + 1;
    }

    const evalSlot = (selectedWorkId: string | null): SlotState => {
      if (!selectedWorkId) return "none";
      const count = remaining[selectedWorkId] ?? 0;
      if (count > 0) {
        remaining[selectedWorkId] = count - 1;
        return "correct";
      }
      return "wrong";
    };

    const slot1 = evalSlot(selectedWorkSlot1);
    const slot2 = evalSlot(selectedWorkSlot2);

    return [slot1, slot2];
  }, [roundSongs, selectedWorkSlot1, selectedWorkSlot2, showAnswer, isCurrentSongAnswered]);

  const handleCardClick = useCallback(
    (workId: string) => {
      if (showAnswer || isCurrentSongAnswered) return;
      
      // Compter combien de fois cette œuvre est déjà sélectionnée
      let currentCount = 0;
      if (selectedWorkSlot1 === workId) currentCount++;
      if (selectedWorkSlot2 === workId) currentCount++;
      
      // Si l'œuvre a déjà 2 sélections, ne rien faire (ou on pourrait permettre de désélectionner)
      if (currentCount >= 2) {
        return;
      }
      
      // Si l'œuvre a 0 sélection → remplir le premier slot disponible (gauche)
      if (currentCount === 0) {
        if (!selectedWorkSlot1) {
          onSelectSlotWork(0, workId);
        } else if (!selectedWorkSlot2) {
          onSelectSlotWork(1, workId);
        }
        return;
      }
      
      // Si l'œuvre a 1 sélection → remplir le deuxième slot disponible (droite)
      if (currentCount === 1) {
        if (selectedWorkSlot1 === workId && !selectedWorkSlot2) {
          // La première sélection est sur slot1, remplir slot2
          onSelectSlotWork(1, workId);
        } else if (selectedWorkSlot2 === workId && !selectedWorkSlot1) {
          // La première sélection est sur slot2, remplir slot1
          onSelectSlotWork(0, workId);
        } else if (selectedWorkSlot1 === workId && selectedWorkSlot2) {
          // Slot1 a cette œuvre, slot2 a autre chose → remplacer slot2
          onSelectSlotWork(1, workId);
        } else if (selectedWorkSlot2 === workId && selectedWorkSlot1) {
          // Slot2 a cette œuvre, slot1 a autre chose → remplacer slot1
          onSelectSlotWork(0, workId);
        }
        return;
      }
    },
    [isCurrentSongAnswered, onSelectSlotWork, selectedWorkSlot1, selectedWorkSlot2, showAnswer]
  );

  const workCards = useMemo(() => {
    return works.map((work) => {
      // Compter combien de fois cette œuvre est sélectionnée (pour les songId du round)
      let selectionCount = 0;
      if (selectedWorkSlot1 === work.id) selectionCount++;
      if (selectedWorkSlot2 === work.id) selectionCount++;
      
      // Pastille gauche : allumée si au moins 1 sélection
      const isLeftPastilleActive = selectionCount >= 1;
      // Pastille droite : allumée si 2 sélections
      const isRightPastilleActive = selectionCount >= 2;
      
      const isSelected = selectionCount > 0;
      
      // Déterminer l'état de chaque pastille
      // Avant validation : "pending" si allumée, "none" sinon
      // Après validation : utiliser la logique multiset pour déterminer correct/wrong
      let leftPastilleState: SlotState = "none";
      let rightPastilleState: SlotState = "none";
      
      if (isLeftPastilleActive) {
        if (showAnswer || isCurrentSongAnswered) {
          // Après validation : vérifier si au moins une sélection est correcte
          const hasCorrect = (selectedWorkSlot1 === work.id && globalSlot1State === "correct") ||
                            (selectedWorkSlot2 === work.id && globalSlot2State === "correct");
          const hasWrong = (selectedWorkSlot1 === work.id && globalSlot1State === "wrong") ||
                          (selectedWorkSlot2 === work.id && globalSlot2State === "wrong");
          leftPastilleState = hasCorrect ? "correct" : (hasWrong ? "wrong" : "pending");
        } else {
          leftPastilleState = "pending";
        }
      }
      
      if (isRightPastilleActive) {
        if (showAnswer || isCurrentSongAnswered) {
          // Après validation : vérifier la deuxième sélection
          // Si les deux sont sur la même œuvre, on prend le deuxième état
          if (selectedWorkSlot1 === work.id && selectedWorkSlot2 === work.id) {
            // Les deux sont sur cette œuvre : gauche = slot1, droite = slot2
            rightPastilleState = globalSlot2State;
          } else if (selectedWorkSlot2 === work.id) {
            // Seulement slot2 est sur cette œuvre : droite = slot2
            rightPastilleState = globalSlot2State;
          } else {
            // Seulement slot1 est sur cette œuvre : droite = slot1 (cas rare)
            rightPastilleState = globalSlot1State;
          }
        } else {
          rightPastilleState = "pending";
        }
      }
      
      const selectedCount = selectionCount;

      const isCorrectWork = (correctCountByWorkId[work.id] ?? 0) > 0;

      const matchedCount =
        (leftPastilleState === "correct" ? 1 : 0) + (rightPastilleState === "correct" ? 1 : 0);
      const wrongCount =
        (leftPastilleState === "wrong" ? 1 : 0) + (rightPastilleState === "wrong" ? 1 : 0);

      const getSlotClass = (state: SlotState) => {
        if (state === "none") return "bg-white";
        if (state === "pending") return "bg-[#facc15]"; // jaune avant validation
        if (state === "correct") return "bg-[#22c55e]"; // vert
        return "bg-[#f97373]"; // rouge
      };

      let backgroundStyle: CSSProperties | undefined;

      if (showAnswer || isCurrentSongAnswered) {
        if (isCorrectWork) {
          if (selectedCount === 0) {
            // œuvre correcte non sélectionnée → léger vert
            backgroundStyle = {
              background:
                "linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(132, 204, 22, 0.12))",
            };
          } else if (matchedCount === selectedCount) {
            // toutes les sélections sur cette carte sont correctes
            backgroundStyle = {
              background:
                "linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(132, 204, 22, 0.2))",
            };
          } else if (wrongCount === selectedCount) {
            // toutes les sélections sur cette carte sont fausses
            backgroundStyle = {
              background:
                "linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(248, 113, 113, 0.18))",
            };
          } else if (matchedCount > 0 && wrongCount > 0) {
            // mélange bon / mauvais → moitié vert, moitié rouge
            backgroundStyle = {
              background:
                "linear-gradient(90deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.2) 50%, rgba(248, 113, 113, 0.18) 50%, rgba(248, 113, 113, 0.18) 100%)",
            };
          }
        } else if (selectedCount > 0) {
          // œuvre fausse mais sélectionnée
          backgroundStyle = {
            background:
              "linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(248, 113, 113, 0.18))",
          };
        }
      }

      return (
        <div
          key={work.id}
          className="relative transition-all duration-200 ease-out cursor-pointer"
          onClick={() => handleCardClick(work.id)}
        >
          <div className="relative uniform-card">
            <div
              className={`relative work-card h-full flex flex-col justify-center items-center p-4 ${
                !(showAnswer || isCurrentSongAnswered)
                  ? "work-card--interactive"
                  : ""
              } ${
                isSelected && !(showAnswer || isCurrentSongAnswered)
                  ? "work-card--active"
                  : ""
              }`}
              style={backgroundStyle}
            >
              <div className="relative z-10 text-center w-full flex flex-col justify-center h-full">
                {/* Indicateurs de sélection (2 "radio-boutons" anonymes par slot) */}
                <div className="flex items-center justify-center gap-1 mb-2">
                  {/* Pastille gauche : toujours affichée si on a 2 songs */}
                  {songSlot1 && songSlot2 && (
                    <span
                      className={`w-3.5 h-3.5 rounded-full border border-[#1B1B1B] shadow-[1px_1px_0_#1B1B1B] ${
                        getSlotClass(leftPastilleState)
                      }`}
                    />
                  )}
                  {/* Pastille droite : toujours affichée si on a 2 songs */}
                  {songSlot1 && songSlot2 && (
                    <span
                      className={`w-3.5 h-3.5 rounded-full border border-[#1B1B1B] shadow-[1px_1px_0_#1B1B1B] ${
                        getSlotClass(rightPastilleState)
                      }`}
                    />
                  )}
                </div>

                <h3
                  className={`uniform-card-title font-bold text-base transition-all duration-300 px-2 ${
                    isSelected && !(showAnswer || isCurrentSongAnswered)
                      ? "work-card-title--active"
                      : "text-[var(--color-text-primary)]"
                  }`}
                  title={work.title}
                >
                  {work.title}
                </h3>

                {/* Bouton "Enlever" pour retirer une ou deux sélections sur cette œuvre */}
                {selectedCount > 0 && !showAnswer && !isCurrentSongAnswered && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearWorkSelection(work.id);
                    }}
                    className="mt-2 inline-flex items-center justify-center rounded-full border-2 border-[#1B1B1B] bg-white px-3 py-0.5 text-[0.7rem] font-semibold shadow-[2px_2px_0_#1B1B1B] hover:bg-[var(--color-surface-overlay)]"
                  >
                    Enlever
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    });
  }, [
    works,
    selectedWorkSlot1,
    selectedWorkSlot2,
    correctCountByWorkId,
    globalSlot1State,
    globalSlot2State,
    showAnswer,
    isCurrentSongAnswered,
    handleCardClick,
    onClearWorkSelection,
    songSlot1,
    songSlot2,
  ]);

  return (
    <>
      <div className="relative">
        <div className="space-y-4">
          {/* Grille de cartes */}
          <div className="uniform-card-grid">{workCards}</div>

          {/* Zone d'actions / footer */}
          <div className="flex items-center justify-center min-h-[120px] sm:min-h-[124px]">
            {!showAnswer && !isCurrentSongAnswered ? (
              canValidate ? (
                <button
                  onClick={onValidateAnswer}
                  className="magic-button px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-bold"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Valider mes 2 reponses
                  </span>
                </button>
              ) : null
            ) : (
              footer
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export const DoubleWorkSelector = memo(DoubleWorkSelectorComponent);
DoubleWorkSelector.displayName = "DoubleWorkSelector";

