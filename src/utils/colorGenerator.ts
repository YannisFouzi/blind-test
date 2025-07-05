// Fonction pour convertir une couleur hex en RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

// Fonction pour convertir RGB en HSL
const rgbToHsl = (
  r: number,
  g: number,
  b: number
): { h: number; s: number; l: number } => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
      default:
        h = 0;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
};

// Fonction pour convertir HSL en hex
const hslToHex = (h: number, s: number, l: number): string => {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

// Interface pour les styles générés
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
  // Nouveaux styles inline pour remplacer les classes Tailwind dynamiques
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

// Fonction principale pour générer tous les styles à partir d'une couleur
export const generateStylesFromColor = (hexColor: string): GeneratedStyles => {
  const rgb = hexToRgb(hexColor);
  if (!rgb) {
    // Couleur par défaut si invalide
    return generateStylesFromColor("#3B82F6");
  }

  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  // Générer des variations de la couleur
  const darkerColor = hslToHex(hsl.h, hsl.s, Math.max(hsl.l - 20, 10));
  const lighterColor = hslToHex(hsl.h, hsl.s, Math.min(hsl.l + 15, 90));
  const veryDarkColor = hslToHex(hsl.h, hsl.s, Math.max(hsl.l - 40, 5));

  // Couleurs pour les gradients de fond
  const bgColor1 = "#1c1c35"; // Couleur sombre de base
  const bgColor2 = hslToHex(
    hsl.h,
    Math.min(hsl.s + 10, 100),
    Math.max(hsl.l - 30, 15)
  );
  const bgColor3 = veryDarkColor;

  return {
    // Classes Tailwind statiques (pour rétrocompatibilité)
    gradient: `from-slate-800/80 via-slate-700/80 to-slate-600/40`,
    border: `border-slate-600/20`,
    borderHover: `hover:border-slate-400/60`,
    shadow: `hover:shadow-xl`,
    overlay: `from-white/10 via-transparent to-black/10`,
    iconGradient: `from-blue-500 to-blue-400`,
    textGradient: `from-blue-500 to-blue-400`,
    particles: `bg-blue-500`,
    particlesAlt: `bg-blue-400`,
    primaryColor: hexColor,

    // Nouveaux styles inline fonctionnels
    inlineStyles: {
      background: `linear-gradient(135deg, 
        ${bgColor1}cc 0%, 
        ${bgColor2}cc 35%, 
        ${bgColor3}66 100%
      )`,
      borderColor: `${hexColor}33`,
      boxShadow: `0 10px 30px ${hexColor}40, 0 0 0 1px ${hexColor}20`,
    },
    overlayStyles: {
      background: `linear-gradient(135deg, 
        ${hexColor}1a 0%, 
        transparent 50%, 
        ${veryDarkColor}1a 100%
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
