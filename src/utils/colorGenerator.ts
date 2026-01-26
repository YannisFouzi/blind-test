import { lighten, rgba } from "polished";

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
    const lighterColor = lighten(0.25, hexColor);
    const softColor = lighten(0.4, hexColor);

    return {
      // Classes Tailwind statiques (pour rétrocompatibilité)
      gradient: `from-white via-white to-white`,
      border: `border-black`,
      borderHover: `hover:border-black`,
      shadow: `hover:shadow-[6px_6px_0_#1B1B1B]`,
      overlay: `from-transparent via-transparent to-transparent`,
      iconGradient: `from-blue-500 to-blue-400`,
      textGradient: `from-blue-500 to-blue-400`,
      particles: `bg-blue-500`,
      particlesAlt: `bg-blue-400`,
      primaryColor: hexColor,

      // Styles inline fonctionnels
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
