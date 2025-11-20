import { darken, lighten, rgba, saturate } from "polished";

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
  // Styles inline pour remplacer les classes Tailwind dynamiques
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

/**
 * Génère tous les styles à partir d'une couleur hex
 * Utilise la bibliothèque polished pour les manipulations de couleurs
 *
 * @param hexColor - Couleur hex (ex: "#3B82F6")
 * @returns Object contenant tous les styles générés
 */
export const generateStylesFromColor = (hexColor: string): GeneratedStyles => {
  // Validation basique de la couleur
  if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hexColor)) {
    // Couleur par défaut si invalide
    return generateStylesFromColor("#3B82F6");
  }

  try {
    // Générer des variations de la couleur avec polished
    const lighterColor = lighten(0.15, hexColor); // +15% lightness
    const veryDarkColor = darken(0.40, hexColor); // -40% lightness

    // Couleurs pour les gradients de fond
    const bgColor1 = "#1c1c35"; // Couleur sombre de base
    const bgColor2 = darken(0.30, saturate(0.10, hexColor)); // +10% saturation, -30% lightness
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

      // Styles inline fonctionnels
      inlineStyles: {
        background: `linear-gradient(135deg,
          ${rgba(bgColor1, 0.8)} 0%,
          ${rgba(bgColor2, 0.8)} 35%,
          ${rgba(bgColor3, 0.4)} 100%
        )`,
        borderColor: rgba(hexColor, 0.2),
        boxShadow: `0 10px 30px ${rgba(hexColor, 0.25)}, 0 0 0 1px ${rgba(
          hexColor,
          0.125
        )}`,
      },
      overlayStyles: {
        background: `linear-gradient(135deg,
          ${rgba(hexColor, 0.1)} 0%,
          transparent 50%,
          ${rgba(veryDarkColor, 0.1)} 100%
        )`,
      },
      iconStyles: {
        background: `linear-gradient(135deg,
          ${hexColor} 0%,
          ${lighterColor} 100%
        )`,
      },
    };
  } catch (error) {
    // En cas d'erreur de parsing, retourner la couleur par défaut
    if (process.env.NODE_ENV === "development") {
      console.error(
        `Erreur lors de la génération des styles pour la couleur "${hexColor}":`,
        error
      );
    }
    return generateStylesFromColor("#3B82F6");
  }
};
