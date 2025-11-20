import type { LucideIcon } from "lucide-react";
import {
  Bolt,
  Book,
  Castle,
  Crown,
  Diamond,
  Feather,
  Film,
  Flower2,
  Gamepad2,
  Gem,
  Ghost,
  Heart,
  Leaf,
  Moon,
  Mountain,
  Music2,
  Orbit,
  Rainbow,
  Rocket,
  Scroll,
  Shield,
  Skull,
  Snowflake,
  Sparkles,
  Star,
  Sun,
  Sword,
  Swords,
  Telescope,
  Trees,
  Wand,
  Wand2,
} from "lucide-react";

export const ICON_CATEGORIES = [
  { id: "magic", name: "Magie & Fantasy" },
  { id: "war", name: "Guerre & Combat" },
  { id: "nature", name: "Nature & \u00C9l\u00E9ments" },
  { id: "space", name: "Espace & Sci-Fi" },
  { id: "entertainment", name: "Divertissement" },
  { id: "symbols", name: "Symboles" },
] as const;

export type IconCategoryId = (typeof ICON_CATEGORIES)[number]["id"];

export interface IconOption {
  id: string;
  name: string;
  component: LucideIcon;
  category: IconCategoryId;
}

type IconDefinition = Omit<IconOption, "id">;

const ICON_DEFINITIONS = {
  wand: { name: "Baguette magique", component: Wand2, category: "magic" },
  sparkles: { name: "\u00C9tincelles", component: Sparkles, category: "magic" },
  crown: { name: "Couronne", component: Crown, category: "magic" },
  castle: { name: "Ch\u00E2teau", component: Castle, category: "magic" },
  diamond: { name: "Gemme", component: Diamond, category: "magic" },
  unicorn: { name: "Arc-en-ciel", component: Rainbow, category: "magic" },
  magicWand: { name: "Magie", component: Wand, category: "magic" },
  ring: { name: "Anneau", component: Gem, category: "magic" },

  sword: { name: "\u00C9p\u00E9e", component: Sword, category: "war" },
  swords: { name: "Lames crois\u00E9es", component: Swords, category: "war" },
  shield: { name: "Bouclier", component: Shield, category: "war" },
  bolt: { name: "Tonnerre", component: Bolt, category: "war" },
  skull: { name: "Cr\u00E2ne", component: Skull, category: "war" },

  leaf: { name: "Feuille", component: Leaf, category: "nature" },
  sun: { name: "Soleil", component: Sun, category: "nature" },
  moon: { name: "Lune", component: Moon, category: "nature" },
  snowflake: { name: "Flocon", component: Snowflake, category: "nature" },
  mountain: { name: "Montagnes", component: Mountain, category: "nature" },
  trees: { name: "For\u00EAt", component: Trees, category: "nature" },
  flower: { name: "Fleur", component: Flower2, category: "nature" },

  rocket: { name: "Fus\u00E9e", component: Rocket, category: "space" },
  alien: { name: "Alien", component: Orbit, category: "space" },
  telescope: { name: "T\u00E9lescope", component: Telescope, category: "space" },

  gamepad: { name: "Manette", component: Gamepad2, category: "entertainment" },
  music: { name: "Musique", component: Music2, category: "entertainment" },
  film: { name: "Film", component: Film, category: "entertainment" },
  book: { name: "Livre", component: Book, category: "entertainment" },
  scroll: { name: "Parchemin", component: Scroll, category: "entertainment" },

  star: { name: "\u00C9toile", component: Star, category: "symbols" },
  heart: { name: "C\u0153ur", component: Heart, category: "symbols" },
  ghost: { name: "Fant\u00F4me", component: Ghost, category: "symbols" },
  feather: { name: "Plume", component: Feather, category: "symbols" },
  spark: { name: "\u00C9tincelle", component: Sparkles, category: "symbols" },
} satisfies Record<string, IconDefinition>;

export type IconId = keyof typeof ICON_DEFINITIONS;

const ICON_ENTRIES = Object.entries(ICON_DEFINITIONS) as Array<
  [IconId, IconDefinition]
>;

export const AVAILABLE_ICONS: IconOption[] = ICON_ENTRIES.map(
  ([id, config]) => ({
    id,
    ...config,
  })
);

export const getIconById = (iconId: string): IconOption | null =>
  AVAILABLE_ICONS.find((icon) => icon.id === iconId) || null;

export const getIconsByCategory = (
  categoryId: IconCategoryId
): IconOption[] => AVAILABLE_ICONS.filter((icon) => icon.category === categoryId);
