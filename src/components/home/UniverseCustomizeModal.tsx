"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { Work } from "@/types";
import { useGameConfiguration, useCanSelectMoreWorks } from "@/stores";
import { getAllWorks, getSongsByWork, getWorksByUniverse, getUniverses } from "@/services/firebase";
import { pressable } from "@/styles/ui";

const MYSTERY_INTENSITY_PRESETS = [
  { label: "Léger", value: 10 },
  { label: "Moyen", value: 25 },
  { label: "Beaucoup", value: 50 },
  { label: "Atroce", value: 100 },
] as const;

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
    mysteryEffects,
    toggleWork,
    setAllowedWorks,
    setNoSeek,
    setMaxSongs,
    closeCustomize,
    setMysteryEffectsEnabled,
    setMysteryEffectsFrequency,
    toggleMysteryEffect,
  } = useGameConfiguration();

  const canSelectMoreWorks = useCanSelectMoreWorks();

  // ========== DATA FETCHING LOCAL ==========
  const [works, setWorks] = useState<Work[]>([]);
  const [songCountByWork, setSongCountByWork] = useState<Record<string, number>>({});
  const [universesById, setUniversesById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les works quand l'univers change
  useEffect(() => {
    if (!customizingUniverse) {
      setWorks([]);
      setSongCountByWork({});
      setUniversesById({});
      setError(null);
      return;
    }

    const loadWorksAndCounts = async () => {
      setLoading(true);
      setError(null);

      try {
        // Charger les works de l'univers (ou toutes les oeuvres en mode custom)
        const [worksResult, universesResult] = await Promise.all([
          isCustomMode
            ? getAllWorks()
            : getWorksByUniverse(customizingUniverse.id),
          isCustomMode
            ? getUniverses()
            : Promise.resolve({ success: true, data: [] }),
        ]);

        if (!worksResult.success || !worksResult.data) {
          throw new Error("Impossible de charger les oeuvres");
        }

        const loadedWorks = worksResult.data;
        setWorks(loadedWorks);

        if (isCustomMode) {
          if (universesResult.success && universesResult.data) {
            const nextUniverses: Record<string, string> = {};
            for (const universe of universesResult.data) {
              nextUniverses[universe.id] = universe.name;
            }
            setUniversesById(nextUniverses);
          } else {
            setUniversesById({});
          }
        } else {
          setUniversesById({});
        }


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
  }, [customizingUniverse, isCustomMode]);

  // ========== COMPUTED VALUES ==========
  const totalSongsAvailable = useMemo(() => {
    return allowedWorks.reduce((total, workId) => {
      return total + (songCountByWork[workId] || 0);
    }, 0);
  }, [allowedWorks, songCountByWork]);

  const effectiveMaxSongs = maxSongs ?? totalSongsAvailable;
  const sliderMin = totalSongsAvailable === 0 ? 0 : 1;
  const sliderMax = totalSongsAvailable === 0 ? 0 : totalSongsAvailable;
  const sliderValue = totalSongsAvailable === 0
    ? 0
    : Math.min(sliderMax, Math.max(1, effectiveMaxSongs));
  const sliderDisabled = loading || totalSongsAvailable === 0;
  const allWorkIds = useMemo(() => works.map((work) => work.id), [works]);
  const allSelectableWorkIds = useMemo(() => {
    if (!maxWorksAllowed || allWorkIds.length <= maxWorksAllowed) {
      return allWorkIds;
    }
    return allWorkIds.slice(0, maxWorksAllowed);
  }, [allWorkIds, maxWorksAllowed]);
  const allWorksSelected = useMemo(() => {
    if (allSelectableWorkIds.length === 0) return false;
    return allSelectableWorkIds.every((workId) => allowedWorks.includes(workId));
  }, [allSelectableWorkIds, allowedWorks]);
  const selectAllDisabled = loading || allSelectableWorkIds.length === 0;
  const groupedWorks = useMemo(() => {
    if (!isCustomMode) return [];
    const groups = new Map<string, Work[]>();

    for (const work of works) {
      const group = groups.get(work.universeId);
      if (group) {
        group.push(work);
      } else {
        groups.set(work.universeId, [work]);
      }
    }

    const sortedGroups = Array.from(groups.entries()).map(([universeId, groupWorks]) => {
      const sortedWorks = [...groupWorks].sort((a, b) => {
        const orderDiff = (a.order ?? 0) - (b.order ?? 0);
        if (orderDiff !== 0) return orderDiff;
        return a.title.localeCompare(b.title, "fr", { sensitivity: "base" });
      });

      return {
        universeId,
        universeName: universesById[universeId] || "Univers inconnu",
        works: sortedWorks,
      };
    });

    sortedGroups.sort((a, b) =>
      a.universeName.localeCompare(b.universeName, "fr", { sensitivity: "base" })
    );

    return sortedGroups;
  }, [isCustomMode, works, universesById]);

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
  const handleSelectAllWorks = useCallback(
    (nextChecked: boolean) => {
      if (allSelectableWorkIds.length === 0) return;
      setAllowedWorks(nextChecked ? allSelectableWorkIds : []);
    },
    [allSelectableWorkIds, setAllowedWorks]
  );
  const renderWorkItem = useCallback(
    (work: Work) => {
      const songCount = songCountByWork[work.id] || 0;
      const isSelected = allowedWorks.includes(work.id);
      const isDisabled = !isSelected && !canSelectMoreWorks;

      return (
        <label
          key={work.id}
          className={`flex items-start gap-2 text-sm px-2 py-2 rounded ${
            isDisabled
              ? "bg-[var(--color-surface-overlay)]/70 text-[var(--color-text-secondary)] border-2 border-black/30 cursor-not-allowed"
              : "bg-[var(--color-surface-overlay)] text-[var(--color-text-primary)] border-2 border-black cursor-pointer shadow-[2px_2px_0_#1B1B1B]"
          }`}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => !isDisabled && toggleWork(work.id)}
            disabled={isDisabled}
            className="w-4 h-4 mt-0.5 rounded border-2 border-black accent-yellow-400"
          />
          <span className="flex-1 min-w-0 leading-snug break-words">
            {work.title}
          </span>
          <span className="text-[var(--color-text-secondary)] text-xs shrink-0">
            ({songCount})
          </span>
        </label>
      );
    },
    [allowedWorks, canSelectMoreWorks, songCountByWork, toggleWork]
  );

  // Si pas d'univers, ne rien afficher
  if (!customizingUniverse) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={closeCustomize}
    >
      <div
        className={`w-full max-w-3xl bg-white border-[3px] border-black rounded-3xl p-6 mx-4 shadow-[6px_6px_0_#1B1B1B] flex flex-col ${
          isCustomMode ? "min-h-[70vh] max-h-[85vh]" : "space-y-4"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-extrabold text-[var(--color-text-primary)]">
            {customizingUniverse.name}
          </h3>
          <button
            type="button"
            onClick={closeCustomize}
            className="magic-button px-3 py-2 text-xs font-bold bg-[#fca5a5] hover:bg-[#f87171]"
          >
            Fermer
          </button>
        </div>

        <div className={isCustomMode ? "flex flex-col gap-4 flex-1 min-h-0" : "space-y-4"}>
          {/* Mode sans avance */}
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-[var(--color-text-primary)] text-sm font-semibold">
              <input
                type="checkbox"
                checked={noSeek}
                onChange={(e) => setNoSeek(e.target.checked)}
                className="w-4 h-4 rounded border-2 border-black accent-yellow-400"
              />
              Mode sans avance rapide
            </label>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Impossible de se déplacer pendant la lecture du morceau.
            </p>
          </div>

          {/* Effets mystères */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-[var(--color-text-primary)] text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={mysteryEffects.enabled}
                  onChange={(e) => setMysteryEffectsEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-2 border-black accent-yellow-400"
                />
                Activer les effets mystères
              </label>
              {mysteryEffects.enabled && (
                <span className="text-[var(--color-text-secondary)] text-xs">
                  Fréquence : {mysteryEffects.frequency}%
                </span>
              )}
            </div>

            {mysteryEffects.enabled && (
              <div className="space-y-3 pl-1">
                {/* Niveaux fixes de fréquence */}
                <div className="flex flex-wrap gap-2">
                  {MYSTERY_INTENSITY_PRESETS.map((preset) => {
                    const isActive = mysteryEffects.frequency === preset.value;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setMysteryEffectsFrequency(preset.value)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-full border-2 border-black shadow-[2px_2px_0_#1B1B1B] transition-colors ${
                          isActive
                            ? "bg-[#FDE68A] text-[var(--color-text-primary)]"
                            : "bg-white text-[var(--color-text-secondary)]"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {/* Choix des effets */}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => toggleMysteryEffect("double")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-full border-2 border-black shadow-[2px_2px_0_#1B1B1B] transition-colors ${
                      mysteryEffects.selectedEffects.includes("double")
                        ? "bg-[#FDE68A] text-[var(--color-text-primary)]"
                        : "bg-white text-[var(--color-text-secondary)]"
                    }`}
                  >
                    Deux musiques en même temps
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleMysteryEffect("reverse")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-full border-2 border-black shadow-[2px_2px_0_#1B1B1B] transition-colors ${
                      mysteryEffects.selectedEffects.includes("reverse")
                        ? "bg-[#FDE68A] text-[var(--color-text-primary)]"
                        : "bg-white text-[var(--color-text-secondary)]"
                    }`}
                  >
                    Musique à l'envers
                  </button>
                </div>
                {mysteryEffects.selectedEffects.length === 0 && (
                  <p className="text-[var(--color-text-secondary)] text-xs">
                    Sélectionne au moins un effet à activer.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Œuvres incluses */}
          <div className={`space-y-2 ${isCustomMode ? "flex flex-col flex-1 min-h-0" : ""}`}>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-primary)] text-sm font-semibold">Oeuvres incluses</span>
              {isCustomMode && maxWorksAllowed && (
                <span
                  className={`text-xs ${
                    allowedWorks.length >= maxWorksAllowed
                      ? "text-orange-600"
                      : "text-[var(--color-text-secondary)]"
                  }`}
                >
                  {allowedWorks.length}/{maxWorksAllowed} sélectionnées
                </span>
              )}
            </div>
            {!isCustomMode && (
              <div className="flex items-center">
                <label
                  className={`flex items-center gap-2 text-xs font-bold ${
                    selectAllDisabled
                      ? "text-[var(--color-text-secondary)] cursor-not-allowed"
                      : "text-[var(--color-text-primary)] cursor-pointer"
                  }`}
                >
                  <span>Toutes</span>
                  <span
                    className={`relative inline-flex h-5 w-9 items-center rounded-full border-2 border-black transition-colors ${
                      allWorksSelected ? "bg-[#FDE68A]" : "bg-white"
                    } ${selectAllDisabled ? "opacity-60" : ""}`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={allWorksSelected}
                      onChange={(event) => handleSelectAllWorks(event.target.checked)}
                      disabled={selectAllDisabled}
                      aria-label="Selectionner toutes les oeuvres"
                    />
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full border-2 border-black bg-white transition-transform ${
                        allWorksSelected ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </span>
                </label>
              </div>
            )}



            {loading ? (
              <div className="text-[var(--color-text-secondary)] text-sm">Chargement des oeuvres...</div>
            ) : (
              <div
                className={`overflow-y-auto pr-2 pb-2 pt-1 space-y-4 scrollbar-dark ${
                  isCustomMode ? "flex-1 min-h-0" : "max-h-48"
                }`}
              >
                {isCustomMode ? (
                  groupedWorks.map((group) => (
                    <div key={group.universeId} className="space-y-2">
                      <div className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--color-text-secondary)]">
                        {group.universeName}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {group.works.map(renderWorkItem)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {works.map(renderWorkItem)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Nombre de musiques */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-primary)] text-sm font-semibold">Nombre de musiques</span>
              <span className="text-[var(--color-text-secondary)] text-xs">
                {totalSongsAvailable} disponible{totalSongsAvailable > 1 ? "s" : ""}
              </span>
            </div>

            <div className={`flex items-center gap-4 min-h-[52px] ${sliderDisabled ? "opacity-60" : ""}`}>
              <input
                type="range"
                min={sliderMin}
                max={sliderMax}
                value={sliderValue}
                onChange={(e) => handleMaxSongsChange(Number(e.target.value))}
                disabled={sliderDisabled}
                className="flex-1 h-2 bg-white border-2 border-black rounded-full appearance-none cursor-pointer accent-yellow-400 shadow-[2px_2px_0_#1B1B1B] disabled:cursor-not-allowed"
              />
              <input
                type="number"
                min={sliderMin}
                max={sliderMax}
                value={sliderValue}
                onChange={(e) => handleMaxSongsChange(Number(e.target.value))}
                disabled={sliderDisabled}
                className="w-16 px-2 py-1 bg-white border-2 border-black rounded text-[var(--color-text-primary)] text-sm text-center shadow-[2px_2px_0_#1B1B1B] disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {error && <div className="text-xs text-red-600">{error}</div>}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={closeCustomize}
            className={`px-4 py-2 text-sm font-bold bg-white hover:bg-[var(--color-surface-overlay)] ${pressable}`}
          >
            Annuler
          </button>
          <button
            onClick={onApply}
            className="magic-button px-4 py-2 text-sm font-bold"
            disabled={isApplying || allowedWorks.length < 2 || totalSongsAvailable === 0}
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
