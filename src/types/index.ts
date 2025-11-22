import { z } from "zod";

const timestampSchema = z.preprocess((value) => {
  if (value instanceof Date) {
    return value;
  }

  if (value && typeof value === "object" && "toDate" in (value as Record<string, unknown>)) {
    const maybeTimestamp = value as { toDate?: () => Date };
    return typeof maybeTimestamp.toDate === "function" ? maybeTimestamp.toDate() : value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return value;
}, z.date());

const audioUrlSchema = z.preprocess(
  (value) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    }
    return value;
  },
  z.string().url().optional()
);

export const GameAnswerSchema = z.object({
  songId: z.string().min(1),
  workId: z.string().min(1),
  selectedWorkId: z.string().min(1).nullable(),
  isCorrect: z.boolean(),
  answeredAt: timestampSchema,
});

export const ScoreSchema = z.object({
  correct: z.number().int().min(0),
  incorrect: z.number().int().min(0),
});

export const SongSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  artist: z.string().min(1),
  workId: z.string().min(1),
  youtubeId: z.string().min(1),
  audioUrl: audioUrlSchema,
  duration: z.number().int().min(0),
  createdAt: timestampSchema,
});

export const WorkSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  universeId: z.string().min(1),
  playlistId: z.string().min(1),
  order: z.number().int().min(0),
  createdAt: timestampSchema,
});

export const UniverseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(""),
  color: z
    .string()
    .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Color must be a valid hex value"),
  icon: z.string().min(1),
  active: z.boolean().optional(),
  createdAt: timestampSchema,
});

export const GameSessionSchema = z.object({
  id: z.string().min(1),
  universeId: z.string().min(1),
  songs: z.array(SongSchema),
  currentSongIndex: z.number().int().min(0),
  score: ScoreSchema,
  answers: z.array(GameAnswerSchema),
  createdAt: timestampSchema,
});

export const UserSchema = z.object({
  uid: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1),
  photoURL: z.string().url().optional(),
  isAdmin: z.boolean(),
});

export type Universe = z.infer<typeof UniverseSchema>;
export type Work = z.infer<typeof WorkSchema>;
export type Song = z.infer<typeof SongSchema>;
export type GameSession = z.infer<typeof GameSessionSchema>;
export type GameAnswer = z.infer<typeof GameAnswerSchema>;
export type User = z.infer<typeof UserSchema>;
