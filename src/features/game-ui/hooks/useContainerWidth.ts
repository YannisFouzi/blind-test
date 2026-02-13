import { useEffect, useState, RefObject } from "react";

/**
 * Hook pour observer la largeur d'un container via ResizeObserver
 * Retourne la largeur actuelle en pixels
 */
export const useContainerWidth = (ref: RefObject<HTMLElement | null>): number => {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Initialiser avec la largeur actuelle
    setWidth(element.offsetWidth);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === element) {
          // Utiliser borderBoxSize pour plus de précision si disponible
          if (entry.borderBoxSize && entry.borderBoxSize.length > 0) {
            setWidth(entry.borderBoxSize[0].inlineSize);
          } else {
            setWidth(element.offsetWidth);
          }
        }
      }
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [ref]);

  return width;
};
