import { Variants } from "framer-motion";

/**
 * Variants Framer Motion réutilisables
 * Pattern professionnel pour gérer les animations de manière déclarative
 * https://www.framer.com/motion/animation/#variants
 */

/**
 * Animation de fade in depuis le bas
 * Utilisé pour les cards de la homepage
 */
export const fadeInUp: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.25, 0.46, 0.45, 0.94], // Easing personnalisé (easeOutQuad)
    },
  },
};

/**
 * Animation de fade in simple
 * Utilisé pour les textes et éléments légers
 */
export const fadeIn: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

/**
 * Animation de slide depuis la gauche
 * Utilisé pour les titres principaux
 */
export const slideInLeft: Variants = {
  hidden: {
    opacity: 0,
    x: -50,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.8,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

/**
 * Container variant pour animer les enfants en cascade (stagger)
 * Utilisé pour la liste des cards
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15, // Délai entre chaque enfant
      delayChildren: 0.3, // Délai avant de commencer les animations des enfants
    },
  },
};

/**
 * Variant pour les items d'un container stagger
 */
export const staggerItem: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

/**
 * Animation de scale au hover
 * Utilisé pour les interactions sur les cards
 */
export const scaleOnHover = {
  rest: {
    scale: 1,
  },
  hover: {
    scale: 1.05,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
  tap: {
    scale: 0.98,
  },
};

/**
 * Transition par défaut douce
 */
export const smoothTransition = {
  type: "spring" as const,
  stiffness: 260,
  damping: 20,
};

/**
 * Configuration de page pour les animations de page
 * Utilisé avec AnimatePresence pour les transitions de routes
 */
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
      ease: "easeIn",
    },
  },
};
