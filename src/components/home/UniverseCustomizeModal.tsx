"use client";

import { memo, useCallback } from "react";
import type { Universe, Work } from "@/types";

interface UniverseCustomizeModalProps {
  universe: Universe;
  works: Work[];
  allowedWorks: string[];
  noSeek: boolean;
  maxSongs: number | null;
  totalSongsAvailable: number;
  songCountByWork: Record<string, number>;
  loading: boolean;
  error: string | null;
  isApplying?: boolean;
  isCustomMode?: boolean; // Mode custom = toutes les œuvres avec limite
  maxWorksAllowed?: number | null; // Limite d'œuvres sélectionnables (mode custom)
  onToggleWork: (workId: string) => void;
  onSetNoSeek: (value: boolean) => void;
  onSetMaxSongs: (value: number | null) => void;
  onApply: () => void;
  onClose: () => void;
}

const UniverseCustomizeModalComponent = ({
  universe,
  works,
  allowedWorks,
  noSeek,
  maxSongs,
  totalSongsAvailable,
  songCountByWork,
  loading,
  error,
  isApplying = false,
  isCustomMode = false,
  maxWorksAllowed = null,
  onToggleWork,
  onSetNoSeek,
  onSetMaxSongs,
  onApply,
  onClose,
}: UniverseCustomizeModalProps) => {
  // En mode custom, vérifier si on a atteint la limite
  const canSelectMoreWorks = !maxWorksAllowed || allowedWorks.length < maxWorksAllowed;
  // Valeur effective du slider (si null = toutes les musiques = totalSongsAvailable)
  const effectiveMaxSongs = maxSongs ?? totalSongsAvailable;
  
  // Gérer le changement du slider/input
  const handleMaxSongsChange = useCallback((value: number) => {
    // Si la valeur est égale au total, on met null (= toutes)
    if (value >= totalSongsAvailable) {
      onSetMaxSongs(null);
    } else {
      onSetMaxSongs(Math.max(1, Math.min(value, totalSongsAvailable)));
    }
  }, [totalSongsAvailable, onSetMaxSongs]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur">
      <div className="w-full max-w-3xl bg-slate-900/90 border border-purple-500/40 rounded-2xl p-6 space-y-4 mx-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">
            Paramètres avancés – {universe.name}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white text-sm"
          >
            Fermer
          </button>
        </div>

        <div className="space-y-4">
          {/* Mode sans avance */}
          <label className="flex items-center gap-2 text-white text-sm">
            <input
              type="checkbox"
              checked={noSeek}
              onChange={(e) => onSetNoSeek(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            Activer le mode sans avance (timeline non cliquable)
          </label>

          {/* Nombre de musiques */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white text-sm font-semibold">Nombre de musiques</span>
              <span className="text-slate-300 text-xs">
                {totalSongsAvailable} disponible{totalSongsAvailable > 1 ? "s" : ""}
              </span>
            </div>
            
            {!loading && totalSongsAvailable > 0 && (
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={1}
                  max={totalSongsAvailable}
                  value={effectiveMaxSongs}
                  onChange={(e) => handleMaxSongsChange(Number(e.target.value))}
                  className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={totalSongsAvailable}
                    value={effectiveMaxSongs}
                    onChange={(e) => handleMaxSongsChange(Number(e.target.value))}
                    className="w-16 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm text-center"
                  />
                  <span className="text-slate-400 text-xs">
                    {maxSongs === null ? "(toutes)" : ""}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Œuvres incluses */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white text-sm font-semibold">Oeuvres incluses</span>
              {isCustomMode && maxWorksAllowed && (
                <span className={`text-xs ${allowedWorks.length >= maxWorksAllowed ? "text-orange-400" : "text-slate-400"}`}>
                  {allowedWorks.length}/{maxWorksAllowed} sélectionnées
                </span>
              )}
            </div>

            {loading ? (
              <div className="text-slate-200 text-sm">Chargement des oeuvres...</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {works.map((work) => {
                  const songCount = songCountByWork[work.id] || 0;
                  const isSelected = allowedWorks.includes(work.id);
                  const isDisabled = !isSelected && !canSelectMoreWorks;
                  
                  return (
                    <label
                      key={work.id}
                      className={`flex items-center gap-2 text-sm px-2 py-1.5 rounded transition-colors ${
                        isDisabled
                          ? "bg-slate-800/30 text-slate-500 cursor-not-allowed"
                          : "bg-slate-800/60 text-white cursor-pointer hover:bg-slate-700/60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => !isDisabled && onToggleWork(work.id)}
                        disabled={isDisabled}
                        className="w-4 h-4 rounded"
                      />
                      <span className="flex-1 truncate">{work.title}</span>
                      <span className="text-slate-400 text-xs">({songCount})</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {error && <div className="text-xs text-red-300">{error}</div>}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm hover:bg-slate-600 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onApply}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm transition-colors"
            disabled={isApplying || allowedWorks.length === 0 || totalSongsAvailable === 0}
          >
            {isApplying ? "Patiente..." : "Appliquer et jouer"}
          </button>
        </div>
      </div>
    </div>
  );
};

export const UniverseCustomizeModal = memo(UniverseCustomizeModalComponent);
UniverseCustomizeModal.displayName = "UniverseCustomizeModal";
