"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { Work } from "@/types";
import { useGameConfiguration, useCanSelectMoreWorks } from "@/stores";
import { getWorksByUniverse, getSongsByWork } from "@/services/firebase";

/**
 * Props pour UniverseCustomizeModal
 *
 * AVANT : 17 props ❌
 * APRÈS : 2 props ✅ (-88% de props!)
 */
interface UniverseCustomizeModalProps {
  /**
   * Callback appelé quand on clique sur "Appliquer et jouer"
   * Contient la logique de navigation (solo vs multi)
   */
  onApply: () => void;

  /**
   * Indique si l'application est en cours (création de room, etc.)
   */
  isApplying?: boolean;
}

const UniverseCustomizeModalComponent = ({
  onApply,
  isApplying = false,
}: UniverseCustomizeModalProps) => {
  // ========== STATE DEPUIS ZUSTAND ==========
  const {
    customizingUniverse,
    allowedWorks,
    noSeek,
    maxSongs,
    isCustomMode,
    maxWorksAllowed,
    toggleWork,
    setNoSeek,
    setMaxSongs,
    closeCustomize,
  } = useGameConfiguration();

  const canSelectMoreWorks = useCanSelectMoreWorks();

  // ========== DATA FETCHING LOCAL ==========
  const [works, setWorks] = useState<Work[]>([]);
  const [songCountByWork, setSongCountByWork] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les works quand l'univers change
  useEffect(() => {
    if (!customizingUniverse) {
      setWorks([]);
      setSongCountByWork({});
      setError(null);
      return;
    }

    const loadWorksAndCounts = async () => {
      setLoading(true);
      setError(null);

      try {
        // Charger les works de l'univers
        const worksResult = await getWorksByUniverse(customizingUniverse.id);

        if (!worksResult.success || !worksResult.data) {
          throw new Error("Impossible de charger les œuvres");
        }

        const loadedWorks = worksResult.data;
        setWorks(loadedWorks);

        // Charger le nombre de songs par work
        const songCounts = await Promise.all(
          loadedWorks.map(async (work) => {
            const songsResult = await getSongsByWork(work.id);
            const count = songsResult.success && songsResult.data
              ? songsResult.data.length
              : 0;
            return { workId: work.id, count };
          })
        );

        const counts: Record<string, number> = {};
        for (const { workId, count } of songCounts) {
          counts[workId] = count;
        }
        setSongCountByWork(counts);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    };

    loadWorksAndCounts();
  }, [customizingUniverse]);

  // ========== COMPUTED VALUES ==========
  const totalSongsAvailable = useMemo(() => {
    return allowedWorks.reduce((total, workId) => {
      return total + (songCountByWork[workId] || 0);
    }, 0);
  }, [allowedWorks, songCountByWork]);

  const effectiveMaxSongs = maxSongs ?? totalSongsAvailable;

  // ========== HANDLERS ==========
  const handleMaxSongsChange = useCallback(
    (value: number) => {
      // Si la valeur est égale au total, on met null (= toutes)
      if (value >= totalSongsAvailable) {
        setMaxSongs(null);
      } else {
        setMaxSongs(Math.max(1, Math.min(value, totalSongsAvailable)));
      }
    },
    [totalSongsAvailable, setMaxSongs]
  );

  // Si pas d'univers, ne rien afficher
  if (!customizingUniverse) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur">
      <div className="w-full max-w-3xl bg-slate-900/90 border border-purple-500/40 rounded-2xl p-6 space-y-4 mx-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">
            Paramètres avancés – {customizingUniverse.name}
          </h3>
          <button
            onClick={closeCustomize}
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
              onChange={(e) => setNoSeek(e.target.checked)}
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
                <span
                  className={`text-xs ${
                    allowedWorks.length >= maxWorksAllowed
                      ? "text-orange-400"
                      : "text-slate-400"
                  }`}
                >
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
                        onChange={() => !isDisabled && toggleWork(work.id)}
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
            onClick={closeCustomize}
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
