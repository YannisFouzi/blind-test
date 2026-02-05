import { describe, expect, it } from "vitest";
import { calculateGameRounds } from "../../packages/shared-utils/src/mysteryEffects";

const makeSongs = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ id: `song-${index}` }));

const flattenSongIds = (rounds: { songIds: string[] }[]) =>
  rounds.flatMap((round) => round.songIds);

const makeSeededRng = (seed: number) => {
  let state = seed | 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

describe("calculateGameRounds", () => {
  it("keeps song order when effects are disabled", () => {
    const songs = makeSongs(5);
    const rounds = calculateGameRounds(songs, {
      enabled: false,
      frequency: 50,
      effects: ["double"],
    });

    const ids = rounds.flatMap((round) => round.songIds);
    expect(ids).toEqual(songs.map((song) => song.id));
  });

  it("distributes effects based on Example A (20 songs, 50%, double+reverse)", () => {
    const songs = makeSongs(20);
    const rng = makeSeededRng(12345);
    const rounds = calculateGameRounds(
      songs,
      { enabled: true, frequency: 50, effects: ["double", "reverse"] },
      { rng }
    );

    const doubleRounds = rounds.filter((round) => round.type === "double");
    const reverseRounds = rounds.filter((round) => round.type === "reverse");
    const normalRounds = rounds.filter((round) => round.type === "normal");

    const allIds = flattenSongIds(rounds);
    expect(allIds).toHaveLength(20);
    expect(new Set(allIds).size).toBe(20);

    expect(doubleRounds).toHaveLength(2);
    expect(reverseRounds).toHaveLength(6);
    expect(normalRounds).toHaveLength(10);
    expect(rounds).toHaveLength(18);
  });

  it("handles double-only with even adjustment (Example B)", () => {
    const songs = makeSongs(21);
    const rng = makeSeededRng(23456);
    const rounds = calculateGameRounds(
      songs,
      { enabled: true, frequency: 50, effects: ["double"] },
      { rng }
    );

    const doubleRounds = rounds.filter((round) => round.type === "double");
    const reverseRounds = rounds.filter((round) => round.type === "reverse");

    expect(doubleRounds).toHaveLength(5);
    expect(reverseRounds).toHaveLength(0);
    expect(flattenSongIds(rounds)).toHaveLength(21);
    expect(rounds).toHaveLength(16);
  });

  it("enforces minimum 1 effect when frequency > 0 (Example C)", () => {
    const songs = makeSongs(9);
    const rng = makeSeededRng(34567);
    const rounds = calculateGameRounds(
      songs,
      { enabled: true, frequency: 10, effects: ["reverse"] },
      { rng }
    );

    const reverseRounds = rounds.filter((round) => round.type === "reverse");
    expect(reverseRounds).toHaveLength(1);
  });

  it("is deterministic for the same RNG", () => {
    const songs = makeSongs(12);
    const config = { enabled: true, frequency: 30, effects: ["double", "reverse"] } as const;

    const roundsA = calculateGameRounds(songs, config, { rng: makeSeededRng(98765) });
    const roundsB = calculateGameRounds(songs, config, { rng: makeSeededRng(98765) });

    expect(roundsA).toEqual(roundsB);
  });
});
