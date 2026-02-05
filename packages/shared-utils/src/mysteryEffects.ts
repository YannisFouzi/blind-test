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

export type Rng = () => number;

export interface MysteryEffectsOptions {
  rng?: Rng;
}

const DOUBLE_RATIO_DEFAULT = 0.5;

const clampFrequency = (value: number) => Math.max(0, Math.min(100, value));

const shuffleInPlace = <T>(items: T[], rng: Rng) => {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
};

export function calculateGameRounds<TSong extends SongLike>(
  songs: TSong[],
  config: MysteryEffectsConfig,
  options: MysteryEffectsOptions = {}
): GameRound[] {
  if (!config.enabled || config.effects.length === 0 || config.frequency <= 0) {
    return songs.map((song) => ({
      type: "normal" as const,
      songIds: [song.id],
    }));
  }

  const totalSongs = songs.length;
  if (totalSongs === 0) return [];

  const frequency = clampFrequency(config.frequency);
  let targetSongsTouched = Math.floor((totalSongs * frequency) / 100);
  if (frequency > 0) {
    targetSongsTouched = Math.max(1, targetSongsTouched);
  }
  targetSongsTouched = Math.min(totalSongs, targetSongsTouched);

  const hasDouble = config.effects.includes("double");
  const hasReverse = config.effects.includes("reverse");

  let doubleTouched = 0;
  let reverseTouched = 0;

  if (hasDouble && !hasReverse) {
    doubleTouched = targetSongsTouched;
  } else if (!hasDouble && hasReverse) {
    reverseTouched = targetSongsTouched;
  } else if (hasDouble && hasReverse) {
    doubleTouched = Math.round(targetSongsTouched * DOUBLE_RATIO_DEFAULT);
    if (doubleTouched % 2 !== 0) {
      doubleTouched -= 1;
    }
    if (doubleTouched < 0) doubleTouched = 0;
    if (doubleTouched > targetSongsTouched) {
      doubleTouched = targetSongsTouched - (targetSongsTouched % 2);
    }
    reverseTouched = targetSongsTouched - doubleTouched;
  }

  if (doubleTouched % 2 !== 0) {
    doubleTouched -= 1;
  }
  if (doubleTouched < 0) doubleTouched = 0;
  reverseTouched = Math.max(0, Math.min(targetSongsTouched - doubleTouched, reverseTouched));

  if (doubleTouched + reverseTouched <= 0) {
    return songs.map((song) => ({
      type: "normal" as const,
      songIds: [song.id],
    }));
  }

  const rng = options.rng ?? Math.random;

  const indices = Array.from({ length: totalSongs }, (_, index) => index);
  shuffleInPlace(indices, rng);

  const doubleIndices = indices.slice(0, doubleTouched);
  const reverseIndices = indices.slice(doubleTouched, doubleTouched + reverseTouched);

  const doubleSorted = [...doubleIndices].sort((a, b) => a - b);
  const reverseSet = new Set(reverseIndices);

  const doublePairs = new Map<number, number>();
  for (let i = 0; i < doubleSorted.length; i += 2) {
    const first = doubleSorted[i];
    const second = doubleSorted[i + 1];
    if (second === undefined) break;
    doublePairs.set(first, second);
  }

  const rounds: GameRound[] = [];
  const consumedIndices = new Set<number>();

  for (let i = 0; i < totalSongs; i += 1) {
    if (consumedIndices.has(i)) continue;

    const partnerIndex = doublePairs.get(i);
    if (partnerIndex !== undefined && !consumedIndices.has(partnerIndex)) {
      rounds.push({
        type: "double",
        songIds: [songs[i].id, songs[partnerIndex].id],
      });
      consumedIndices.add(i);
      consumedIndices.add(partnerIndex);
      continue;
    }

    if (reverseSet.has(i)) {
      rounds.push({
        type: "reverse",
        songIds: [songs[i].id],
      });
      consumedIndices.add(i);
      continue;
    }

    rounds.push({
      type: "normal",
      songIds: [songs[i].id],
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
