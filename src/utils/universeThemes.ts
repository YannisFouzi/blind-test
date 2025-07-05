import { FaJedi } from "react-icons/fa";
import { FaWandMagicSparkles } from "react-icons/fa6";
import { GiRing, GiSwordsPower } from "react-icons/gi";

export interface UniverseTheme {
  id: string;
  name: string;
  gradient: string;
  border: string;
  borderHover: string;
  shadow: string;
  overlay: string;
  iconGradient: string;
  textGradient: string;
  particles: string;
  particlesAlt: string;
  primaryColor: string;
  icon: React.ComponentType<{ className: string }>;
  defaultEmoji: string;
}

export const UNIVERSE_THEMES: UniverseTheme[] = [
  {
    id: "harry-potter",
    name: "Harry Potter",
    gradient: "from-[#1c1c35]/80 via-[#2d1b2d]/80 to-[#6d1e1e]/40",
    border: "border-[#e9be56]/20",
    borderHover: "hover:border-[#e9be56]/60",
    shadow: "hover:shadow-[#e9be56]/25",
    overlay: "from-[#e9be56]/10 via-transparent to-[#6d1e1e]/10",
    iconGradient: "from-[#e9be56] to-[#f0e3bc]",
    textGradient: "from-[#e9be56] to-[#f0e3bc]",
    particles: "bg-[#e9be56]",
    particlesAlt: "bg-[#f0e3bc]",
    primaryColor: "#e9be56",
    icon: FaWandMagicSparkles,
    defaultEmoji: "🪄",
  },
  {
    id: "star-wars",
    name: "Star Wars",
    gradient: "from-[#1c1c35]/80 via-[#1a2635]/80 to-[#276f91]/40",
    border: "border-[#42a5f5]/20",
    borderHover: "hover:border-[#42a5f5]/60",
    shadow: "hover:shadow-[#42a5f5]/25",
    overlay: "from-[#42a5f5]/10 via-transparent to-[#276f91]/10",
    iconGradient: "from-[#42a5f5] to-[#64b5f6]",
    textGradient: "from-[#42a5f5] to-[#64b5f6]",
    particles: "bg-[#42a5f5]",
    particlesAlt: "bg-[#64b5f6]",
    primaryColor: "#42a5f5",
    icon: FaJedi,
    defaultEmoji: "⚔️",
  },
  {
    id: "lord-of-rings",
    name: "Seigneur des Anneaux",
    gradient: "from-[#1c1c35]/80 via-[#1d3520]/80 to-[#2d5016]/40",
    border: "border-[#9fbd2a]/20",
    borderHover: "hover:border-[#9fbd2a]/60",
    shadow: "hover:shadow-[#9fbd2a]/25",
    overlay: "from-[#9fbd2a]/10 via-transparent to-[#2d5016]/10",
    iconGradient: "from-[#9fbd2a] to-[#7d9b21]",
    textGradient: "from-[#9fbd2a] to-[#7d9b21]",
    particles: "bg-[#9fbd2a]",
    particlesAlt: "bg-[#7d9b21]",
    primaryColor: "#9fbd2a",
    icon: GiRing,
    defaultEmoji: "💍",
  },
  {
    id: "from-software",
    name: "From Software",
    gradient: "from-[#1c1c35]/80 via-[#3d1a1a]/80 to-[#7f1d1d]/40",
    border: "border-[#dc2626]/20",
    borderHover: "hover:border-[#dc2626]/60",
    shadow: "hover:shadow-[#dc2626]/25",
    overlay: "from-[#dc2626]/10 via-transparent to-[#7f1d1d]/10",
    iconGradient: "from-[#dc2626] to-[#b91c1c]",
    textGradient: "from-[#dc2626] to-[#b91c1c]",
    particles: "bg-[#dc2626]",
    particlesAlt: "bg-[#b91c1c]",
    primaryColor: "#dc2626",
    icon: GiSwordsPower,
    defaultEmoji: "⚔️",
  },
  {
    id: "custom-blue",
    name: "Bleu Classique",
    gradient: "from-[#1c1c35]/80 via-[#1e3a8a]/80 to-[#1d4ed8]/40",
    border: "border-[#3b82f6]/20",
    borderHover: "hover:border-[#3b82f6]/60",
    shadow: "hover:shadow-[#3b82f6]/25",
    overlay: "from-[#3b82f6]/10 via-transparent to-[#1d4ed8]/10",
    iconGradient: "from-[#3b82f6] to-[#60a5fa]",
    textGradient: "from-[#3b82f6] to-[#60a5fa]",
    particles: "bg-[#3b82f6]",
    particlesAlt: "bg-[#60a5fa]",
    primaryColor: "#3b82f6",
    icon: FaWandMagicSparkles,
    defaultEmoji: "🎵",
  },
  {
    id: "custom-purple",
    name: "Violet Mystique",
    gradient: "from-[#1c1c35]/80 via-[#581c87]/80 to-[#7c2d12]/40",
    border: "border-[#a855f7]/20",
    borderHover: "hover:border-[#a855f7]/60",
    shadow: "hover:shadow-[#a855f7]/25",
    overlay: "from-[#a855f7]/10 via-transparent to-[#7c2d12]/10",
    iconGradient: "from-[#a855f7] to-[#c084fc]",
    textGradient: "from-[#a855f7] to-[#c084fc]",
    particles: "bg-[#a855f7]",
    particlesAlt: "bg-[#c084fc]",
    primaryColor: "#a855f7",
    icon: FaWandMagicSparkles,
    defaultEmoji: "🔮",
  },
];

export const getUniverseTheme = (themeId: string): UniverseTheme => {
  return (
    UNIVERSE_THEMES.find((theme) => theme.id === themeId) || UNIVERSE_THEMES[0]
  );
};

export const getUniverseThemeByName = (name: string): UniverseTheme => {
  const nameMap: { [key: string]: string } = {
    "harry potter": "harry-potter",
    "star wars": "star-wars",
    "seigneur des anneaux": "lord-of-rings",
    "from software": "from-software",
  };

  const themeId = nameMap[name.toLowerCase()];
  return themeId ? getUniverseTheme(themeId) : UNIVERSE_THEMES[0];
};
