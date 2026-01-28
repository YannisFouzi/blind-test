export type MysteryEffectType = "double" | "reverse";

// Forme minimale d'un Song : utilisé à la fois côté front et côté PartyKit.
export type SongLike = { id: string };

/**
 * Modèle "Round" au lieu de songIndex.
 *
 * - normal  : 1 song lue normalement
 * - reverse : 1 song lue en reverse (même durée / timeline)
 * - double  : 2 songs lues en même temps
 */
export type GameRound =
  | { type: "normal"; songIds: [string] }
  | { type: "reverse"; songIds: [string] }
  | { type: "double"; songIds: [string, string] };

export interface MysteryEffectsConfig {
  enabled: boolean;
  /** Pourcentage de songs impactées, 1–100. */
  frequency: number;
  /** Liste des effets activés (double, reverse, ou les deux). */
  effects: MysteryEffectType[];
}

/**
 * Calcule les rounds de jeu avec effets mystères.
 *
 * Utilisation prévue :
 * - Mode Solo  : côté client dans useSoloGame
 * - Mode Multi : côté serveur dans handleConfigure (PartyKit)
 *
 * Sémantique de frequency : % de songs impactées.
 * Exemple : 100 songs, frequency 10 => 10 songs marquées pour un effet,
 * qui seront ensuite réparties entre reverse / double.
 */
export function calculateGameRounds<TSong extends SongLike>(
  songs: TSong[],
  config: MysteryEffectsConfig
): GameRound[] {
  if (!config.enabled || config.effects.length === 0) {
    // Mode normal : 1 round = 1 song
    return songs.map((song) => ({
      type: "normal" as const,
      songIds: [song.id],
    }));
  }

  const totalSongs = songs.length;
  // Nombre cible de chansons "affectées" par un effet (reverse ou double).
  // On travaille à partir d'un pourcentage mais on raisonne en nombre de songs touchées.
  const targetSongsTouched = Math.min(
    totalSongs,
    Math.max(1, Math.round((totalSongs * config.frequency) / 100))
  );

  // Copie mélangée des songs (Fisher–Yates pour éviter les biais)
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
        hasDouble && remainingSongsToTouch >= 2 && remainingUnconsumed >= 2;
      const canUseReverse = hasReverse && remainingSongsToTouch >= 1;

      let chosenEffect: MysteryEffectType | "none" = "none";

      if (canUseDouble && canUseReverse) {
        // Choix aléatoire entre double et reverse lorsque les deux sont possibles
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
        // Pas de partenaire disponible → fallback vers reverse si possible
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

    // Aucun effet appliqué (soit parce qu'on a épuisé le quota, soit parce qu'aucun effet possible)
    rounds.push({
      type: "normal",
      songIds: [shuffledSongs[i].id],
    });
    consumedIndices.add(i);
  }

  return rounds;
}

/** Helper utilitaire : renvoie le round courant ou undefined si hors bornes. */
export function getCurrentRound(
  rounds: GameRound[],
  roundIndex: number
): GameRound | undefined {
  if (roundIndex < 0 || roundIndex >= rounds.length) return undefined;
  return rounds[roundIndex];
}
