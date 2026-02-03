import { z } from "zod";

/**
 * Schema pour les URLs optionnelles
 * Accepte une URL valide, une chaîne vide ou undefined
 */
const optionalUrlSchema = z.union([
  z.string().url("URL invalide"),
  z.literal(""),
]).optional();

/**
 * Schema pour les URLs de playlist YouTube
 * Accepte à la fois les URLs complètes et les IDs purs (PLxxxxx)
 */
const playlistIdSchema = z
  .string()
  .regex(/^[a-zA-Z0-9_-]+$/, "Format d'ID invalide");

const playlistUrlSchema = z.union([
  z.string().url("URL invalide"), // URL complète
  playlistIdSchema, // ID pur
  z.literal(""), // Chaîne vide
]).optional();

export const SongFormSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  artist: z.string().min(1, "L'artiste est requis"),
  workId: z.string().min(1, "L'œuvre est requise"),
  youtubeId: z.string().min(1, "La vidéo YouTube est requise"),
  audioUrl: z.string().url("L'URL audio (Cloudflare) est requise"),
  youtubeUrl: optionalUrlSchema,
  duration: z.number().int("La durée doit être un nombre entier").min(0, "La durée doit être positive"),
});

export type SongFormValues = z.infer<typeof SongFormSchema>;

export const UniverseFormSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().min(1, "La description est requise"),
  color: z
    .string()
    .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "La couleur doit être un hexadécimal valide"),
  icon: z.string().min(1, "L'icône est requise"),
  active: z.boolean(),
});

export type UniverseFormValues = z.infer<typeof UniverseFormSchema>;

export const WorkFormSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  universeId: z.string().min(1, "L'univers est requis"),
  playlistId: z.string().optional(),
  playlistUrl: playlistUrlSchema,
});

export type WorkFormValues = z.infer<typeof WorkFormSchema>;

