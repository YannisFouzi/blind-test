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

export interface IconOption {
  id: string;
  name: string;
  component: LucideIcon;
  category: string;
}

export const ICON_CATEGORIES = [
  { id: "magic", name: "Magie & Fantasy" },
  { id: "war", name: "Guerre & Combat" },
  { id: "nature", name: "Nature & Éléments" },
  { id: "space", name: "Espace & Sci-Fi" },
  { id: "entertainment", name: "Divertissement" },
  { id: "symbols", name: "Symboles" },
];

export const AVAILABLE_ICONS: IconOption[] = [
  { id: "wand", name: "Baguette magique", component: Wand2, category: "magic" },
  { id: "sparkles", name: "Étincelles", component: Sparkles, category: "magic" },
  { id: "crown", name: "Couronne", component: Crown, category: "magic" },
  { id: "castle", name: "Château", component: Castle, category: "magic" },
  { id: "diamond", name: "Gemme", component: Diamond, category: "magic" },
  { id: "unicorn", name: "Licorne", component: Rainbow, category: "magic" },
  { id: "magic-wand", name: "Magie", component: Wand, category: "magic" },

  { id: "sword", name: "Épée", component: Sword, category: "war" },
  { id: "swords", name: "Lames croisées", component: Swords, category: "war" },
  { id: "shield", name: "Bouclier", component: Shield, category: "war" },
  { id: "bolt", name: "Tonnerre", component: Bolt, category: "war" },
  { id: "skull", name: "Crâne", component: Skull, category: "war" },

  { id: "leaf", name: "Feuille", component: Leaf, category: "nature" },
  { id: "sun", name: "Soleil", component: Sun, category: "nature" },
  { id: "moon", name: "Lune", component: Moon, category: "nature" },
  { id: "snowflake", name: "Flocon", component: Snowflake, category: "nature" },
  { id: "mountain", name: "Montagnes", component: Mountain, category: "nature" },
  { id: "trees", name: "Forêt", component: Trees, category: "nature" },
  { id: "flower", name: "Fleur", component: Flower2, category: "nature" },

  { id: "rocket", name: "Fusée", component: Rocket, category: "space" },
  { id: "alien", name: "Alien", component: Orbit, category: "space" },
  { id: "telescope", name: "Télescope", component: Telescope, category: "space" },

  { id: "gamepad", name: "Manette", component: Gamepad2, category: "entertainment" },
  { id: "music", name: "Musique", component: Music2, category: "entertainment" },
  { id: "film", name: "Film", component: Film, category: "entertainment" },
  { id: "book", name: "Livre", component: Book, category: "entertainment" },
  { id: "scroll", name: "Parchemin", component: Scroll, category: "entertainment" },

  { id: "star", name: "Étoile", component: Star, category: "symbols" },
  { id: "heart", name: "Cœur", component: Heart, category: "symbols" },
  { id: "ghost", name: "Fantôme", component: Ghost, category: "symbols" },
  { id: "feather", name: "Plume", component: Feather, category: "symbols" },
  { id: "spark", name: "Étincelle", component: Sparkles, category: "symbols" },
];

export const getIconById = (iconId: string): IconOption | null =>
  AVAILABLE_ICONS.find((icon) => icon.id === iconId) || null;

export const getIconsByCategory = (categoryId: string): IconOption[] =>
  AVAILABLE_ICONS.filter((icon) => icon.category === categoryId);

