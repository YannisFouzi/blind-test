import {
  FaBolt,
  FaCrown,
  FaDragon,
  FaFilm,
  FaFire,
  FaGamepad,
  FaGem,
  FaGhost,
  FaHeart,
  FaJedi,
  FaLeaf,
  FaMoon,
  FaMusic,
  FaRocket,
  FaShield,
  FaSkull,
  FaSnowflake,
  FaStar,
  FaSun,
  FaWandMagicSparkles,
} from "react-icons/fa6";

import {
  GiAlienFire,
  GiBookCover,
  GiButterfly,
  GiCastle,
  GiCrossedSwords,
  GiCrystalBall,
  GiDiamonds,
  GiDragonHead,
  GiFeather,
  GiFireBowl,
  GiIceCube,
  GiLion,
  GiMagicSwirl,
  GiMountains,
  GiPirateFlag,
  GiRing,
  GiRose,
  GiScrollUnfurled,
  GiSnake,
  GiSpaceship,
  GiSwordsPower,
  GiTreeBranch,
  GiUnicorn,
} from "react-icons/gi";

import {
  IoDiamond,
  IoFlame,
  IoGameController,
  IoHeart,
  IoMusicalNotes,
  IoRocket,
  IoSnow,
  IoStar,
  IoTelescope,
} from "react-icons/io5";

// Imports corrects pour les icônes manquantes
import { FaMagic } from "react-icons/fa";

export interface IconOption {
  id: string;
  name: string;
  component: React.ComponentType<{ className: string }>;
  category: string;
}

export const ICON_CATEGORIES = [
  { id: "magic", name: "Magie & Fantasy" },
  { id: "war", name: "Guerre & Combat" },
  { id: "nature", name: "Nature & Elements" },
  { id: "space", name: "Espace & Sci-Fi" },
  { id: "entertainment", name: "Divertissement" },
  { id: "animals", name: "Animaux" },
  { id: "symbols", name: "Symboles" },
];

export const AVAILABLE_ICONS: IconOption[] = [
  // Magie & Fantasy
  {
    id: "wand",
    name: "Baguette magique",
    component: FaWandMagicSparkles,
    category: "magic",
  },
  { id: "ring", name: "Anneau", component: GiRing, category: "magic" },
  {
    id: "crystal-ball",
    name: "Boule de cristal",
    component: GiCrystalBall,
    category: "magic",
  },
  {
    id: "magic-swirl",
    name: "Tourbillon magique",
    component: GiMagicSwirl,
    category: "magic",
  },
  {
    id: "dragon-head",
    name: "Tête de dragon",
    component: GiDragonHead,
    category: "magic",
  },
  { id: "unicorn", name: "Licorne", component: GiUnicorn, category: "magic" },
  { id: "castle", name: "Château", component: GiCastle, category: "magic" },
  { id: "crown", name: "Couronne", component: FaCrown, category: "magic" },
  { id: "gem", name: "Gemme", component: FaGem, category: "magic" },
  { id: "magic", name: "Magie", component: FaMagic, category: "magic" },

  // Guerre & Combat
  { id: "jedi", name: "Jedi", component: FaJedi, category: "war" },
  {
    id: "swords-power",
    name: "Épées croisées",
    component: GiSwordsPower,
    category: "war",
  },
  {
    id: "crossed-swords",
    name: "Épées",
    component: GiCrossedSwords,
    category: "war",
  },
  { id: "shield", name: "Bouclier", component: FaShield, category: "war" },
  {
    id: "pirate-flag",
    name: "Drapeau pirate",
    component: GiPirateFlag,
    category: "war",
  },

  // Nature & Elements
  { id: "fire", name: "Feu", component: FaFire, category: "nature" },
  {
    id: "fire-bowl",
    name: "Brasier",
    component: GiFireBowl,
    category: "nature",
  },
  { id: "bolt", name: "Éclair", component: FaBolt, category: "nature" },
  {
    id: "snowflake",
    name: "Flocon",
    component: FaSnowflake,
    category: "nature",
  },
  { id: "ice-cube", name: "Glace", component: GiIceCube, category: "nature" },
  { id: "leaf", name: "Feuille", component: FaLeaf, category: "nature" },
  {
    id: "tree-branch",
    name: "Branche",
    component: GiTreeBranch,
    category: "nature",
  },
  { id: "sun", name: "Soleil", component: FaSun, category: "nature" },
  { id: "moon", name: "Lune", component: FaMoon, category: "nature" },
  {
    id: "mountains",
    name: "Montagnes",
    component: GiMountains,
    category: "nature",
  },
  { id: "io-flame", name: "Flamme", component: IoFlame, category: "nature" },
  { id: "io-snow", name: "Neige", component: IoSnow, category: "nature" },

  // Espace & Sci-Fi
  { id: "rocket", name: "Fusée", component: FaRocket, category: "space" },
  {
    id: "spaceship",
    name: "Vaisseau",
    component: GiSpaceship,
    category: "space",
  },
  {
    id: "alien-fire",
    name: "Alien",
    component: GiAlienFire,
    category: "space",
  },
  {
    id: "telescope",
    name: "Télescope",
    component: IoTelescope,
    category: "space",
  },
  { id: "io-rocket", name: "Fusée IO", component: IoRocket, category: "space" },

  // Divertissement
  {
    id: "gamepad",
    name: "Manette",
    component: FaGamepad,
    category: "entertainment",
  },
  {
    id: "game-controller",
    name: "Contrôleur",
    component: IoGameController,
    category: "entertainment",
  },
  {
    id: "music",
    name: "Musique",
    component: FaMusic,
    category: "entertainment",
  },
  {
    id: "musical-notes",
    name: "Notes",
    component: IoMusicalNotes,
    category: "entertainment",
  },
  { id: "film", name: "Film", component: FaFilm, category: "entertainment" },
  {
    id: "book",
    name: "Livre",
    component: GiBookCover,
    category: "entertainment",
  },
  {
    id: "scroll",
    name: "Parchemin",
    component: GiScrollUnfurled,
    category: "entertainment",
  },

  // Animaux
  { id: "dragon", name: "Dragon", component: FaDragon, category: "animals" },
  { id: "lion", name: "Lion", component: GiLion, category: "animals" },
  { id: "snake", name: "Serpent", component: GiSnake, category: "animals" },
  {
    id: "butterfly",
    name: "Papillon",
    component: GiButterfly,
    category: "animals",
  },

  // Symboles
  { id: "star", name: "Étoile", component: FaStar, category: "symbols" },
  { id: "heart", name: "Cœur", component: FaHeart, category: "symbols" },
  { id: "ghost", name: "Fantôme", component: FaGhost, category: "symbols" },
  { id: "skull", name: "Crâne", component: FaSkull, category: "symbols" },
  {
    id: "diamonds",
    name: "Diamants",
    component: GiDiamonds,
    category: "symbols",
  },
  { id: "feather", name: "Plume", component: GiFeather, category: "symbols" },
  { id: "rose", name: "Rose", component: GiRose, category: "symbols" },
  { id: "io-star", name: "Étoile IO", component: IoStar, category: "symbols" },
  { id: "io-heart", name: "Cœur IO", component: IoHeart, category: "symbols" },
  {
    id: "io-diamond",
    name: "Diamant IO",
    component: IoDiamond,
    category: "symbols",
  },
];

export const getIconById = (iconId: string): IconOption | null => {
  return AVAILABLE_ICONS.find((icon) => icon.id === iconId) || null;
};

export const getIconsByCategory = (categoryId: string): IconOption[] => {
  return AVAILABLE_ICONS.filter((icon) => icon.category === categoryId);
};
