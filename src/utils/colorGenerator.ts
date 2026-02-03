import { lighten, rgba } from "polished";

const DEFAULT_HEX_COLOR = "#3B82F6";
const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

const isValidHexColor = (value: string): boolean => HEX_COLOR_REGEX.test(value);

export interface GeneratedStyles {
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
  inlineStyles: {
    background: string;
    borderColor: string;
    boxShadow: string;
  };
  overlayStyles: {
    background: string;
  };
  iconStyles: {
    background: string;
  };
}

const buildStyles = (hexColor: string): GeneratedStyles => {
  const lighterColor = lighten(0.25, hexColor);
  const softColor = lighten(0.4, hexColor);

  return {
    // Legacy Tailwind class tokens (static).
    gradient: "from-white via-white to-white",
    border: "border-black",
    borderHover: "hover:border-black",
    shadow: "hover:shadow-[6px_6px_0_#1B1B1B]",
    overlay: "from-transparent via-transparent to-transparent",
    iconGradient: "from-blue-500 to-blue-400",
    textGradient: "from-blue-500 to-blue-400",
    particles: "bg-blue-500",
    particlesAlt: "bg-blue-400",
    primaryColor: hexColor,

    inlineStyles: {
      background: `linear-gradient(180deg,
        ${rgba(softColor, 0.65)} 0%,
        rgba(255, 255, 255, 0.95) 55%,
        rgba(255, 255, 255, 1) 100%
      )`,
      borderColor: "#1B1B1B",
      boxShadow: "4px 4px 0 #1B1B1B",
    },
    overlayStyles: {
      background: `radial-gradient(circle at top,
        ${rgba(hexColor, 0.25)} 0%,
        transparent 65%
      )`,
    },
    iconStyles: {
      background: `linear-gradient(135deg,
        ${hexColor} 0%,
        ${lighterColor} 100%
      )`,
    },
  };
};

export const generateStylesFromColor = (hexColor: string): GeneratedStyles => {
  if (!isValidHexColor(hexColor)) {
    return buildStyles(DEFAULT_HEX_COLOR);
  }

  try {
    return buildStyles(hexColor);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(`Error generating styles for color "${hexColor}":`, error);
    }
    return buildStyles(DEFAULT_HEX_COLOR);
  }
};
