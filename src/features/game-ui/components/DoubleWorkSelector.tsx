import {
  memo,
  useCallback,
  useMemo,
  type ReactNode,
  type CSSProperties,
  type MouseEvent,
} from "react";
import type { Song, Work } from "@/types";
import { GameActionButton } from "./GameActionButton";
import { WorkCardShell } from "./WorkCardShell";

type SlotState = "none" | "pending" | "correct" | "wrong";
type SlotIndex = 0 | 1;

export interface DoubleWorkSelectorProps {
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

type SlotStates = {
  slot1: SlotState;
  slot2: SlotState;
};

type PastilleStates = {
  left: SlotState;
  right: SlotState;
};

type WorkCardState = {
  work: Work;
  selectionCount: number;
  isSelected: boolean;
  leftPastilleState: SlotState;
  rightPastilleState: SlotState;
  backgroundStyle?: CSSProperties;
};

const SLOT_CLASS_BY_STATE: Record<SlotState, string> = {
  none: "bg-white",
  pending: "bg-[#facc15]",
  correct: "bg-[#22c55e]",
  wrong: "bg-[#f97373]",
};

const getSelectionCount = (
  workId: string,
  selectedWorkSlot1: string | null,
  selectedWorkSlot2: string | null
) => (selectedWorkSlot1 === workId ? 1 : 0) + (selectedWorkSlot2 === workId ? 1 : 0);

const countByWorkId = (songs: Song[]) => {
  const map: Record<string, number> = {};
  for (const song of songs) {
    map[song.workId] = (map[song.workId] ?? 0) + 1;
  }
  return map;
};

const computeSlotStates = ({
  selectedWorkSlot1,
  selectedWorkSlot2,
  isAnswerRevealed,
  correctCountByWorkId,
}: {
  selectedWorkSlot1: string | null;
  selectedWorkSlot2: string | null;
  isAnswerRevealed: boolean;
  correctCountByWorkId: Record<string, number>;
}): SlotStates => {
  if (!isAnswerRevealed) {
    return {
      slot1: selectedWorkSlot1 ? "pending" : "none",
      slot2: selectedWorkSlot2 ? "pending" : "none",
    };
  }

  const remaining = { ...correctCountByWorkId };

  const evalSlot = (selectedWorkId: string | null): SlotState => {
    if (!selectedWorkId) return "none";
    const count = remaining[selectedWorkId] ?? 0;
    if (count > 0) {
      remaining[selectedWorkId] = count - 1;
      return "correct";
    }
    return "wrong";
  };

  return {
    slot1: evalSlot(selectedWorkSlot1),
    slot2: evalSlot(selectedWorkSlot2),
  };
};

const getNextSlotForWork = ({
  workId,
  selectedWorkSlot1,
  selectedWorkSlot2,
}: {
  workId: string;
  selectedWorkSlot1: string | null;
  selectedWorkSlot2: string | null;
}): SlotIndex | null => {
  const selectionCount = getSelectionCount(workId, selectedWorkSlot1, selectedWorkSlot2);

  if (selectionCount >= 2) return null;

  if (selectionCount === 0) {
    if (!selectedWorkSlot1) return 0;
    if (!selectedWorkSlot2) return 1;
    return null;
  }

  if (selectedWorkSlot1 === workId && !selectedWorkSlot2) return 1;
  if (selectedWorkSlot2 === workId && !selectedWorkSlot1) return 0;
  if (selectedWorkSlot1 === workId && selectedWorkSlot2) return 1;
  if (selectedWorkSlot2 === workId && selectedWorkSlot1) return 0;

  return null;
};

const getPastilleStates = ({
  workId,
  selectionCount,
  selectedWorkSlot1,
  selectedWorkSlot2,
  slotStates,
  isAnswerRevealed,
}: {
  workId: string;
  selectionCount: number;
  selectedWorkSlot1: string | null;
  selectedWorkSlot2: string | null;
  slotStates: SlotStates;
  isAnswerRevealed: boolean;
}): PastilleStates => {
  let left: SlotState = "none";
  let right: SlotState = "none";

  if (selectionCount >= 1) {
    if (!isAnswerRevealed) {
      left = "pending";
    } else {
      const slot1Correct = selectedWorkSlot1 === workId && slotStates.slot1 === "correct";
      const slot2Correct = selectedWorkSlot2 === workId && slotStates.slot2 === "correct";
      const slot1Wrong = selectedWorkSlot1 === workId && slotStates.slot1 === "wrong";
      const slot2Wrong = selectedWorkSlot2 === workId && slotStates.slot2 === "wrong";
      left = slot1Correct || slot2Correct ? "correct" : slot1Wrong || slot2Wrong ? "wrong" : "pending";
    }
  }

  if (selectionCount >= 2) {
    if (!isAnswerRevealed) {
      right = "pending";
    } else if (selectedWorkSlot1 === workId && selectedWorkSlot2 === workId) {
      right = slotStates.slot2;
    } else if (selectedWorkSlot2 === workId) {
      right = slotStates.slot2;
    } else if (selectedWorkSlot1 === workId) {
      right = slotStates.slot1;
    } else {
      right = "pending";
    }
  }

  return { left, right };
};

const getBackgroundStyle = ({
  isAnswerRevealed,
  isCorrectWork,
  selectionCount,
  matchedCount,
  wrongCount,
}: {
  isAnswerRevealed: boolean;
  isCorrectWork: boolean;
  selectionCount: number;
  matchedCount: number;
  wrongCount: number;
}): CSSProperties | undefined => {
  if (!isAnswerRevealed) return undefined;

  if (isCorrectWork) {
    if (selectionCount === 0) {
      return {
        background:
          "linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(132, 204, 22, 0.12))",
      };
    }
    if (matchedCount === selectionCount) {
      return {
        background:
          "linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(132, 204, 22, 0.2))",
      };
    }
    if (wrongCount === selectionCount) {
      return {
        background:
          "linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(248, 113, 113, 0.18))",
      };
    }
    if (matchedCount > 0 && wrongCount > 0) {
      return {
        background:
          "linear-gradient(90deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.2) 50%, rgba(248, 113, 113, 0.18) 50%, rgba(248, 113, 113, 0.18) 100%)",
      };
    }
  } else if (selectionCount > 0) {
    return {
      background:
        "linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(248, 113, 113, 0.18))",
    };
  }

  return undefined;
};

const buildWorkCardState = ({
  work,
  selectedWorkSlot1,
  selectedWorkSlot2,
  slotStates,
  correctCountByWorkId,
  isAnswerRevealed,
}: {
  work: Work;
  selectedWorkSlot1: string | null;
  selectedWorkSlot2: string | null;
  slotStates: SlotStates;
  correctCountByWorkId: Record<string, number>;
  isAnswerRevealed: boolean;
}): WorkCardState => {
  const selectionCount = getSelectionCount(work.id, selectedWorkSlot1, selectedWorkSlot2);
  const { left, right } = getPastilleStates({
    workId: work.id,
    selectionCount,
    selectedWorkSlot1,
    selectedWorkSlot2,
    slotStates,
    isAnswerRevealed,
  });

  const matchedCount = (left === "correct" ? 1 : 0) + (right === "correct" ? 1 : 0);
  const wrongCount = (left === "wrong" ? 1 : 0) + (right === "wrong" ? 1 : 0);
  const isCorrectWork = (correctCountByWorkId[work.id] ?? 0) > 0;
  const backgroundStyle = getBackgroundStyle({
    isAnswerRevealed,
    isCorrectWork,
    selectionCount,
    matchedCount,
    wrongCount,
  });

  return {
    work,
    selectionCount,
    isSelected: selectionCount > 0,
    leftPastilleState: left,
    rightPastilleState: right,
    backgroundStyle,
  };
};

const SelectionDots = ({
  show,
  leftState,
  rightState,
}: {
  show: boolean;
  leftState: SlotState;
  rightState: SlotState;
}) => {
  if (!show) return null;

  return (
    <div className="work-card-header-dots flex items-center justify-center gap-1">
      <span
        className={`w-3.5 h-3.5 rounded-full border border-[#1B1B1B] shadow-[1px_1px_0_#1B1B1B] ${
          SLOT_CLASS_BY_STATE[leftState]
        }`}
      />
      <span
        className={`w-3.5 h-3.5 rounded-full border border-[#1B1B1B] shadow-[1px_1px_0_#1B1B1B] ${
          SLOT_CLASS_BY_STATE[rightState]
        }`}
      />
    </div>
  );
};

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
  const isAnswerRevealed = showAnswer || isCurrentSongAnswered;
  const canInteract = !isAnswerRevealed;
  const showDots = roundSongs.length >= 2;

  const correctCountByWorkId = useMemo(() => countByWorkId(roundSongs), [roundSongs]);

  const slotStates = useMemo(
    () =>
      computeSlotStates({
        selectedWorkSlot1,
        selectedWorkSlot2,
        isAnswerRevealed,
        correctCountByWorkId,
      }),
    [selectedWorkSlot1, selectedWorkSlot2, isAnswerRevealed, correctCountByWorkId]
  );

  const handleCardClick = useCallback(
    (workId: string) => {
      if (!canInteract) return;
      const slot = getNextSlotForWork({ workId, selectedWorkSlot1, selectedWorkSlot2 });
      if (slot === null) {
        if (
          selectedWorkSlot1 &&
          selectedWorkSlot2 &&
          selectedWorkSlot1 === selectedWorkSlot2 &&
          selectedWorkSlot1 !== workId
        ) {
          onSelectSlotWork(1, workId);
        }
        return;
      }
      onSelectSlotWork(slot, workId);
    },
    [canInteract, onSelectSlotWork, selectedWorkSlot1, selectedWorkSlot2]
  );

  const handleClearWork = useCallback(
    (event: MouseEvent<HTMLButtonElement>, workId: string) => {
      event.stopPropagation();
      onClearWorkSelection(workId);
    },
    [onClearWorkSelection]
  );

  const workCardStates = useMemo(
    () =>
      works.map((work) =>
        buildWorkCardState({
          work,
          selectedWorkSlot1,
          selectedWorkSlot2,
          slotStates,
          correctCountByWorkId,
          isAnswerRevealed,
        })
      ),
    [
      works,
      selectedWorkSlot1,
      selectedWorkSlot2,
      slotStates,
      correctCountByWorkId,
      isAnswerRevealed,
    ]
  );

  return (
    <div className="relative w-full work-selector">
      <div className="space-y-3 sm:space-y-4 md:space-y-6">
        <div
          className={`uniform-card-grid work-selector-grid${
            works.length <= 3 ? " uniform-card-grid--stacked" : ""
          }${works.length === 4 ? " uniform-card-grid--four" : ""}${
            works.length === 5 ? " uniform-card-grid--five" : ""
          }`}
        >
          {workCardStates.map((state) => (
            <div
              key={state.work.id}
              className="relative transition-all duration-200 ease-out cursor-pointer"
              onClick={() => handleCardClick(state.work.id)}
            >
              <WorkCardShell
                title={state.work.title}
                isInteractive={canInteract}
                isActive={state.isSelected}
                layout="stacked"
                backgroundStyle={state.backgroundStyle}
                titleClassName={
                  state.isSelected && canInteract
                    ? "work-card-title--active"
                    : "text-[var(--color-text-primary)]"
                }
                header={
                  <SelectionDots
                    show={showDots}
                    leftState={state.leftPastilleState}
                    rightState={state.rightPastilleState}
                  />
                }
                footer={
                  canInteract && state.selectionCount > 0 ? (
                    <button
                      type="button"
                      onClick={(event) => handleClearWork(event, state.work.id)}
                      className="work-card-remove inline-flex items-center justify-center rounded-full border-2 border-[#1B1B1B] bg-white px-3 py-0.5 text-[0.7rem] font-semibold shadow-[2px_2px_0_#1B1B1B] hover:bg-[var(--color-surface-overlay)]"
                    >
                      Enlever
                    </button>
                  ) : null
                }
              />
            </div>
          ))}
        </div>

        <div className="work-selector-actions">
          <div
            className={`work-selector-actions-layer ${
              !canInteract ? "work-selector-actions-layer--visible" : "work-selector-actions-layer--hidden"
            }`}
            aria-hidden={canInteract}
          >
            {footer}
          </div>
          <div
            className={`work-selector-actions-layer ${
              canInteract ? "work-selector-actions-layer--visible" : "work-selector-actions-layer--hidden"
            }`}
            aria-hidden={!canInteract}
          >
            {canValidate ? (
              <GameActionButton label="Valider mes 2 reponses" onClick={onValidateAnswer} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export const DoubleWorkSelector = memo(DoubleWorkSelectorComponent);
DoubleWorkSelector.displayName = "DoubleWorkSelector";
