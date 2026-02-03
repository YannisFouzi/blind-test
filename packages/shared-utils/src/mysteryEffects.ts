export type MysteryEffectType = "double" | "reverse";

// Minimal song shape used by client and PartyKit.
export type SongLike = { id: string };

export type GameRound =
  | { type: "normal"; songIds: [string] }
  | { type: "reverse"; songIds: [string] }
  | { type: "double"; songIds: [string, string] };

export interface MysteryEffectsConfig {
  enabled: boolean;
  // Percentage of songs affected (1-100).
  frequency: number;
  // Enabled effects.
  effects: MysteryEffectType[];
}

export function calculateGameRounds<TSong extends SongLike>(
  songs: TSong[],
  config: MysteryEffectsConfig
): GameRound[] {
  if (!config.enabled || config.effects.length === 0) {
    return songs.map((song) => ({
      type: "normal" as const,
      songIds: [song.id],
    }));
  }

  const totalSongs = songs.length;
  const targetSongsTouched = Math.min(
    totalSongs,
    Math.max(1, Math.round((totalSongs * config.frequency) / 100))
  );

  const shuffledSongs = [...songs];
  for (let i = shuffledSongs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledSongs[i], shuffledSongs[j]] = [shuffledSongs[j], shuffledSongs[i]];
  }

  const rounds: GameRound[] = [];
  const consumedIndices = new Set<number>();
  let remainingSongsToTouch = targetSongsTouched;

  const hasDouble = config.effects.includes("double");
  const hasReverse = config.effects.includes("reverse");

  const getNextAvailableIndex = (startIndex: number): number | null => {
    for (let j = startIndex; j < shuffledSongs.length; j++) {
      if (!consumedIndices.has(j)) return j;
    }
    return null;
  };

  for (let i = 0; i < shuffledSongs.length; i++) {
    if (consumedIndices.has(i)) continue;

    const remainingUnconsumed = shuffledSongs.length - consumedIndices.size;
    const canApplyAnyEffect =
      remainingSongsToTouch > 0 && (hasDouble || hasReverse) && remainingUnconsumed > 0;

    if (canApplyAnyEffect) {
      const canUseDouble =
        hasDouble &&
        remainingSongsToTouch >= 2 &&
        remainingUnconsumed >= 2;
      const canUseReverse = hasReverse && remainingSongsToTouch >= 1;

      let chosenEffect: MysteryEffectType | "none" = "none";

      if (canUseDouble && canUseReverse) {
        chosenEffect = Math.random() < 0.5 ? "double" : "reverse";
      } else if (canUseDouble) {
        chosenEffect = "double";
      } else if (canUseReverse) {
        chosenEffect = "reverse";
      }

      if (chosenEffect === "double") {
        const partnerIndex = getNextAvailableIndex(i + 1);
        if (partnerIndex !== null) {
          rounds.push({
            type: "double",
            songIds: [shuffledSongs[i].id, shuffledSongs[partnerIndex].id],
          });
          consumedIndices.add(i);
          consumedIndices.add(partnerIndex);
          remainingSongsToTouch = Math.max(0, remainingSongsToTouch - 2);
          continue;
        }
        if (canUseReverse) {
          chosenEffect = "reverse";
        } else {
          chosenEffect = "none";
        }
      }

      if (chosenEffect === "reverse") {
        rounds.push({
          type: "reverse",
          songIds: [shuffledSongs[i].id],
        });
        consumedIndices.add(i);
        remainingSongsToTouch = Math.max(0, remainingSongsToTouch - 1);
        continue;
      }
    }

    rounds.push({
      type: "normal",
      songIds: [shuffledSongs[i].id],
    });
    consumedIndices.add(i);
  }

  return rounds;
}

// Return the current round or undefined if out of range.
export function getCurrentRound(
  rounds: GameRound[],
  roundIndex: number
): GameRound | undefined {
  if (roundIndex < 0 || roundIndex >= rounds.length) return undefined;
  return rounds[roundIndex];
}
