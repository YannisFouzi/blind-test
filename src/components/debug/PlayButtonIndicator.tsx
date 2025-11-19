"use client";

interface PlayButtonIndicatorProps {
  isPreloaded: boolean;
  isPreloading: boolean;
  className?: string;
}

export const PlayButtonIndicator = ({
  isPreloaded,
  isPreloading,
  className = "",
}: PlayButtonIndicatorProps) => {
  const getIndicatorStyle = () => {
    if (isPreloading) {
      return "bg-orange-500 animate-pulse";
    }
    if (isPreloaded) {
      return "bg-green-500 animate-ping";
    }
    return "bg-red-500";
  };

  const getTooltip = () => {
    if (isPreloading) {
      return "Préchargement en cours...";
    }
    if (isPreloaded) {
      return "🚀 Lecture instantanée disponible !";
    }
    return "Chargement nécessaire";
  };

  return (
    <div className={`relative ${className}`} title={getTooltip()}>
      {/* Indicateur principal */}
      <div
        className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getIndicatorStyle()} border-2 border-white shadow-lg z-10`}
      />

      {/* Effet de pulsation pour le préchargé */}
      {isPreloaded && !isPreloading && (
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 animate-ping opacity-75" />
      )}
    </div>
  );
};
