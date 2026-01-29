"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { Work } from "@/types";
import { useGameConfiguration, useCanSelectMoreWorks } from "@/stores";
import { WORKS_PER_ROUND_MIN, WORKS_PER_ROUND_MAX, WORKS_PER_ROUND_DEFAULT } from "@/constants/gameModes";
import { getAllWorks, getSongsByWork, getWorksByUniverse, getActiveUniverses } from "@/services/firebase";
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
    isRandomMode,
    maxWorksAllowed,
    worksPerRound,
    mysteryEffects,
    toggleWork,
    setAllowedWorks,
    setAllowedWorksWithNames,
    setNoSeek,
    setMaxSongs,
    setWorksPerRound,
    closeCustomize,
    setMysteryEffectsEnabled,
    setMysteryEffectsFrequency,
    toggleMysteryEffect,
    setTotalSongsForPreview,
    setTotalWorksInUniverse,
    setEffectiveSongsForPreview,
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
        // Charger les works de l'univers (ou toutes les oeuvres en mode custom / aléatoire)
        const [worksResult, universesResult] = await Promise.all([
          isCustomMode || isRandomMode
            ? getAllWorks()
            : getWorksByUniverse(customizingUniverse.id),
          isCustomMode || isRandomMode
            ? getActiveUniverses()
            : Promise.resolve({ success: true, data: [] }),
        ]);

        if (process.env.NODE_ENV === "development") {
          console.info("[UNIVERS-INCONNU] loadWorksAndCounts après Promise.all", {
            isCustomMode,
            isRandomMode,
            worksSuccess: worksResult.success,
            worksCount: Array.isArray((worksResult as { data?: unknown[] }).data)
              ? (worksResult as { data: unknown[] }).data.length
              : 0,
            universesSuccess: universesResult.success,
            universesDataLength: universesResult.data?.length ?? 0,
            universesError: (universesResult as { error?: string }).error,
            universesSample: universesResult.data?.slice(0, 3).map((u) => ({ id: u.id, name: u.name })),
          });
        }

        if (!worksResult.success || !worksResult.data) {
          throw new Error("Impossible de charger les oeuvres");
        }

        const loadedWorks = worksResult.data;
        setWorks(loadedWorks);

        if (isCustomMode || isRandomMode) {
          if (universesResult.success && universesResult.data) {
            const nextUniverses: Record<string, string> = {};
            for (const universe of universesResult.data) {
              nextUniverses[universe.id] = universe.name;
            }
            if (process.env.NODE_ENV === "development") {
              console.info("[UNIVERS-INCONNU] universesById rempli (mode custom/aléatoire)", {
                count: Object.keys(nextUniverses).length,
                keys: Object.keys(nextUniverses),
                sample: Object.entries(nextUniverses).slice(0, 5),
              });
            }
            setUniversesById(nextUniverses);
          } else {
            if (process.env.NODE_ENV === "development") {
              console.warn("[UNIVERS-INCONNU] universesById vide car getActiveUniverses() a échoué ou data vide", {
                success: universesResult.success,
                hasData: Boolean(universesResult.data),
                dataLength: universesResult.data?.length ?? 0,
                error: (universesResult as { error?: string }).error,
              });
            }
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
        setTotalWorksInUniverse(loadedWorks.length);
        setTotalSongsForPreview(Object.values(counts).reduce((a, b) => a + b, 0));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    };

    loadWorksAndCounts();
  }, [customizingUniverse, isCustomMode, isRandomMode, setTotalSongsForPreview, setTotalWorksInUniverse]);

  // ========== COMPUTED VALUES ==========
  const totalSongsAvailable = useMemo(() => {
    return allowedWorks.reduce((total, workId) => {
      return total + (songCountByWork[workId] || 0);
    }, 0);
  }, [allowedWorks, songCountByWork]);

  // Synchroniser la préview invités avec ce que l'hôte voit (0 si 0 œuvres, sinon maxSongs ?? total sélection)
  useEffect(() => {
    const effective = totalSongsAvailable === 0 ? 0 : (maxSongs ?? totalSongsAvailable);
    setEffectiveSongsForPreview(effective);
  }, [totalSongsAvailable, maxSongs, setEffectiveSongsForPreview]);

  const effectiveMaxSongs = maxSongs ?? totalSongsAvailable;
  const sliderMin = totalSongsAvailable === 0 ? 0 : 1;
  const sliderMax = totalSongsAvailable === 0 ? 0 : totalSongsAvailable;
  const sliderValue =
    totalSongsAvailable === 0 ? 0 : Math.min(sliderMax, Math.max(1, effectiveMaxSongs));
  const sliderDisabled = loading || totalSongsAvailable === 0;

  // 100 % double + nombre impair de musiques = impossible (dernière manche ne peut pas être double)
  const isDouble100Odd =
    mysteryEffects.enabled &&
    mysteryEffects.frequency === 100 &&
    mysteryEffects.selectedEffects.includes("double") &&
    sliderValue > 0 &&
    sliderValue % 2 !== 0;
  const allWorkIds = useMemo(() => works.map((work) => work.id), [works]);
  const allSelectableWorkIds = useMemo(() => {
    // Mode aléatoire : pas de limite d'œuvres
    if (isRandomMode) return allWorkIds;
    if (!maxWorksAllowed || allWorkIds.length <= maxWorksAllowed) {
      return allWorkIds;
    }
    return allWorkIds.slice(0, maxWorksAllowed);
  }, [allWorkIds, maxWorksAllowed, isRandomMode]);
  const allWorksSelected = useMemo(() => {
    if (allSelectableWorkIds.length === 0) return false;
    return allSelectableWorkIds.every((workId) => allowedWorks.includes(workId));
  }, [allSelectableWorkIds, allowedWorks]);
  const selectAllDisabled = loading || allSelectableWorkIds.length === 0;
  const groupedWorks = useMemo(() => {
    if (!isCustomMode && !isRandomMode) return [];
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

      const name = universesById[universeId] || "Univers inconnu";
      if (process.env.NODE_ENV === "development" && name === "Univers inconnu") {
        console.warn("[UNIVERS-INCONNU] groupe sans nom: universeId non trouvé dans universesById", {
          universeId,
          universesByIdKeys: Object.keys(universesById),
          universesByIdCount: Object.keys(universesById).length,
          worksCount: groupWorks.length,
        });
      }

      return {
        universeId,
        universeName: name,
        works: sortedWorks,
      };
    });

    if (process.env.NODE_ENV === "development" && sortedGroups.length > 0) {
      console.info("[UNIVERS-INCONNU] groupedWorks calculé", {
        groupsCount: sortedGroups.length,
        universesByIdCount: Object.keys(universesById).length,
        groupNames: sortedGroups.map((g) => ({ id: g.universeId, name: g.universeName })),
      });
    }

    sortedGroups.sort((a, b) =>
      a.universeName.localeCompare(b.universeName, "fr", { sensitivity: "base" })
    );

    return sortedGroups;
  }, [isCustomMode, isRandomMode, works, universesById]);

  // Mode aléatoire : recaler worksPerRound si le pool a diminué (ex. 5 œuvres puis 2 retirées → max 3)
  useEffect(() => {
    if (!isRandomMode || allowedWorks.length < 2) return;
    const effectiveMax = Math.min(WORKS_PER_ROUND_MAX, allowedWorks.length);
    const current = worksPerRound ?? WORKS_PER_ROUND_DEFAULT;
    if (current > effectiveMax) {
      setWorksPerRound(effectiveMax);
    }
  }, [isRandomMode, allowedWorks.length, worksPerRound, setWorksPerRound]);

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
      if (nextChecked) {
        setAllowedWorksWithNames(
          allSelectableWorkIds,
          allSelectableWorkIds.map((id) => works.find((w) => w.id === id)?.title ?? id)
        );
      } else {
        setAllowedWorks([]);
      }
    },
    [allSelectableWorkIds, works, setAllowedWorksWithNames, setAllowedWorks]
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
            onChange={() => !isDisabled && toggleWork(work.id, work.title)}
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
          isCustomMode || isRandomMode ? "min-h-[70vh] max-h-[85vh]" : "space-y-4"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-center">
          <h3 className="text-xl font-extrabold text-[var(--color-text-primary)]">
            {customizingUniverse.name}
          </h3>
        </div>

        <div className={isCustomMode || isRandomMode ? "flex flex-col gap-4 flex-1 min-h-0" : "space-y-4"}>
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
                    Musique à l&apos;envers
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
          <div className={`space-y-2 ${isCustomMode || isRandomMode ? "flex flex-col flex-1 min-h-0 overflow-hidden" : ""}`}>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-primary)] text-sm font-semibold">Oeuvres incluses</span>
              {!isRandomMode && isCustomMode && maxWorksAllowed && (
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
            {isRandomMode && (
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {allowedWorks.length} œuvre{allowedWorks.length !== 1 ? "s" : ""} dans le pool
                </span>
              )}
            </div>
            {(!isCustomMode || isRandomMode) && (
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
                  isCustomMode || isRandomMode ? "flex-1 min-h-0" : "max-h-48"
                }`}
              >
                {(isCustomMode || isRandomMode) ? (
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

          {/* Œuvres par manche (mode aléatoire) : min 2, max = min(8, taille du pool) */}
          {isRandomMode && (() => {
            const poolSize = allowedWorks.length;
            const effectiveMax = Math.max(WORKS_PER_ROUND_MIN, Math.min(WORKS_PER_ROUND_MAX, poolSize));
            const rawValue = worksPerRound ?? WORKS_PER_ROUND_DEFAULT;
            const clampedValue = Math.max(WORKS_PER_ROUND_MIN, Math.min(effectiveMax, rawValue));
            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-text-primary)] text-sm font-semibold">Œuvres par manche</span>
                  <span className="text-[var(--color-text-secondary)] text-xs">
                    {clampedValue} choix (max {effectiveMax} avec {poolSize} œuvre{poolSize !== 1 ? "s" : ""} dans le pool)
                  </span>
                </div>
                <div className="flex items-center gap-4 min-h-[52px]">
                  <input
                    type="range"
                    min={WORKS_PER_ROUND_MIN}
                    max={effectiveMax}
                    value={clampedValue}
                    onChange={(e) => setWorksPerRound(Math.max(WORKS_PER_ROUND_MIN, Math.min(effectiveMax, Number(e.target.value))))}
                    className="flex-1 h-2 bg-white border-2 border-black rounded-full appearance-none cursor-pointer accent-yellow-400 shadow-[2px_2px_0_#1B1B1B]"
                  />
                  <input
                    type="number"
                    min={WORKS_PER_ROUND_MIN}
                    max={effectiveMax}
                    value={clampedValue}
                    onChange={(e) => setWorksPerRound(Math.max(WORKS_PER_ROUND_MIN, Math.min(effectiveMax, Number(e.target.value))))}
                    className="w-14 px-2 py-1 bg-white border-2 border-black rounded text-[var(--color-text-primary)] text-sm text-center shadow-[2px_2px_0_#1B1B1B]"
                  />
                </div>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  À chaque manche, ce nombre d&apos;œuvres sera proposé comme réponses (dont la bonne). Min 2, max {effectiveMax} avec ce pool.
                </p>
              </div>
            );
          })()}

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

        <div className="flex flex-col items-end gap-2 pt-2">
          {isDouble100Odd && (
            <p className="text-sm text-red-600 w-full text-center sm:text-left">
              Avec « Deux musiques en même temps » à 100 %, le nombre de musiques doit être pair.
            </p>
          )}
          <div className="flex justify-end gap-3 w-full">
            <button
              onClick={closeCustomize}
              className={`px-4 py-2 text-sm font-bold bg-white hover:bg-[var(--color-surface-overlay)] ${pressable}`}
            >
              Annuler
            </button>
            <button
              onClick={onApply}
              className="magic-button px-4 py-2 text-sm font-bold"
              disabled={
                isApplying ||
                allowedWorks.length < 2 ||
                totalSongsAvailable === 0 ||
                isDouble100Odd
              }
            >
              {isApplying ? "Patiente..." : "Appliquer et jouer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const UniverseCustomizeModal = memo(UniverseCustomizeModalComponent);
UniverseCustomizeModal.displayName = "UniverseCustomizeModal";
