import { nanoid } from "nanoid";

// Format seconds as M:SS.
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

function getSecureRandom(): number {
  const cryptoObj = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (cryptoObj?.getRandomValues) {
    const uint32 = new Uint32Array(1);
    cryptoObj.getRandomValues(uint32);
    return uint32[0] / 0xffffffff;
  }
  return Math.random();
}

const shuffleWithRandom = <T>(array: T[], random: () => number): T[] => {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// Shuffle with a secure random source when available.
export const shuffleArray = <T>(array: T[]): T[] => {
  return shuffleWithRandom(array, getSecureRandom);
};

// Generate a collision-resistant id.
export const generateId = (): string => {
  return nanoid();
};

// Deterministic PRNG derived from a seed string.
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  let s = h >>> 0;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 0xffffffff;
  };
}

// Shuffle deterministically based on a seed (multiplayer sync).
export const shuffleWithSeed = <T>(array: T[], seed: string): T[] => {
  return shuffleWithRandom(array, seededRandom(seed));
};
