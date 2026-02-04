"use client";

import { memo, useCallback, useEffect, useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import type { Work } from "@/types";
import { useGameConfiguration, useCanSelectMoreWorks } from "@/stores";
import {
  CUSTOM_UNIVERSE_ID,
  WORKS_PER_ROUND_MIN,
  WORKS_PER_ROUND_MAX,
  WORKS_PER_ROUND_DEFAULT,
} from "@/constants/gameModes";
import { getAllWorks, getSongCountByWork, getWorksByUniverse } from "@/services/firebase";
import { activeUniversesQueryOptions } from "@/features/home/queries/universes.query";
import { worksKeys } from "@/features/home/queries/works.query";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui";
import { pressable } from "@/styles/ui";

const MYSTERY_INTENSITY_PRESETS = [
  { label: "Leger", value: 10 },
  { label: "Moyen", value: 25 },
  { label: "Beaucoup", value: 50 },
  { label: "Atroce", value: 100 },
] as const;

const WORK_SKELETON_ITEMS = Array.from({ length: 6 }, (_, index) => `work-skeleton-${index}`);
const QUERY_STALE_TIME_MS = 15 * 60 * 1000;
const QUERY_GC_TIME_MS = 30 * 60 * 1000;

interface UniverseCustomizeModalProps {
  onApply: () => void;
  isApplying?: boolean;
}

const UniverseCustomizeModalComponent = ({
  onApply,
  isApplying = false,
}: UniverseCustomizeModalProps) => {
  // Etat depuis Zustand
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
    setUnifiedCustomSubMode,
    closeCustomize,
    setMysteryEffectsEnabled,
    setMysteryEffectsFrequency,
    toggleMysteryEffect,
    setTotalSongsForPreview,
    setTotalWorksInUniverse,
    setEffectiveSongsForPreview,
  } = useGameConfiguration();

  const canSelectMoreWorks = useCanSelectMoreWorks();

  const isCustomOrRandom = isCustomMode || isRandomMode;

  const worksQuery = useQuery<Work[], Error>({
    queryKey:
      customizingUniverse && !isCustomOrRandom
        ? worksKeys.universe(customizingUniverse.id)
        : worksKeys.allWorks(),
    queryFn: async () => {
      const result =
        customizingUniverse && !isCustomOrRandom
          ? await getWorksByUniverse(customizingUniverse.id)
          : await getAllWorks();

      if (!result.success || !result.data) {
        throw new Error(result.error || "Impossible de charger les oeuvres");
      }

      return result.data;
    },
    staleTime: QUERY_STALE_TIME_MS,
    gcTime: QUERY_GC_TIME_MS,
    retry: 1,
    enabled: Boolean(customizingUniverse),
  });

  const works = useMemo(() => worksQuery.data ?? [], [worksQuery.data]);
  const worksLoading = worksQuery.isLoading;
  const shouldUseScrollableLayout = isCustomMode || isRandomMode || works.length > 8;

  const universesQuery = useQuery({
    ...activeUniversesQueryOptions,
    enabled: Boolean(customizingUniverse) && isCustomOrRandom,
  });

  const universesById = useMemo(() => {
    if (!isCustomOrRandom || !universesQuery.data) return {};
    const next: Record<string, string> = {};
    for (const universe of universesQuery.data) {
      next[universe.id] = universe.name;
    }
    return next;
  }, [isCustomOrRandom, universesQuery.data]);

  const countQueries = useQueries({
    queries: works.map((work) => ({
      queryKey: ["work-song-count", work.id],
      queryFn: async () => {
        const result = await getSongCountByWork(work.id);
        if (!result.success || typeof result.data !== "number") {
          throw new Error(result.error || "Impossible de compter les chansons");
        }
        return result.data;
      },
      staleTime: QUERY_STALE_TIME_MS,
      gcTime: QUERY_GC_TIME_MS,
      enabled: Boolean(customizingUniverse),
      retry: 1,
    })),
  });

  const countsLoading = countQueries.some((query) => query.isLoading);
  const countsError = countQueries.find((query) => query.isError)?.error;

  const songCountByWork = useMemo(() => {
    const counts: Record<string, number> = {};
    works.forEach((work, index) => {
      const query = countQueries[index];
      if (!query) return;
      if (typeof query.data === "number") {
        counts[work.id] = query.data;
      }
    });
    return counts;
  }, [countQueries, works]);

  const errorMessage =
    worksQuery.error instanceof Error
      ? worksQuery.error.message
      : countsError instanceof Error
        ? countsError.message
        : null;

  useEffect(() => {
    if (!customizingUniverse) return;
    setTotalWorksInUniverse(works.length);
  }, [customizingUniverse, works.length, setTotalWorksInUniverse]);

  useEffect(() => {
    if (!customizingUniverse || countsLoading) {
      setTotalSongsForPreview(0);
      return;
    }
    const total = Object.values(songCountByWork).reduce((a, b) => a + b, 0);
    setTotalSongsForPreview(total);
  }, [customizingUniverse, countsLoading, songCountByWork, setTotalSongsForPreview]);

  const totalSongsAvailable = useMemo(() => {
    if (countsLoading) return 0;
    return allowedWorks.reduce((total, workId) => {
      return total + (songCountByWork[workId] ?? 0);
    }, 0);
  }, [allowedWorks, songCountByWork, countsLoading]);

  // Synchroniser la preview invites avec ce que l'hote voit (0 si 0 oeuvres, sinon maxSongs ou total selection)
  useEffect(() => {
    const effective = totalSongsAvailable === 0 ? 0 : (maxSongs ?? totalSongsAvailable);
    setEffectiveSongsForPreview(effective);
  }, [totalSongsAvailable, maxSongs, setEffectiveSongsForPreview]);

  const effectiveMaxSongs = maxSongs ?? totalSongsAvailable;
  const sliderMin = totalSongsAvailable === 0 ? 0 : 1;
  const sliderMax = totalSongsAvailable === 0 ? 0 : totalSongsAvailable;
  const sliderValue =
    totalSongsAvailable === 0 ? 0 : Math.min(sliderMax, Math.max(1, effectiveMaxSongs));
  const sliderDisabled = worksLoading || countsLoading || totalSongsAvailable === 0;

  // 100% double + nombre impair de musiques = impossible (derniere manche ne peut pas etre double)
  const isDouble100Odd =
    mysteryEffects.enabled &&
    mysteryEffects.frequency === 100 &&
    mysteryEffects.selectedEffects.includes("double") &&
    sliderValue > 0 &&
    sliderValue % 2 !== 0;

  const allWorkIds = useMemo(() => works.map((work) => work.id), [works]);
  const allSelectableWorkIds = useMemo(() => {
    // Mode aleatoire: pas de limite d'oeuvres
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

  const selectAllDisabled = worksLoading || allSelectableWorkIds.length === 0;
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
        console.warn("[UNIVERS-INCONNU] groupe sans nom: universeId non trouve dans universesById", {
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
      console.info("[UNIVERS-INCONNU] groupedWorks calcule", {
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

  // Mode aleatoire: recaler worksPerRound si le pool a diminue (ex. 5 oeuvres puis 2 retirees -> max 3)
  useEffect(() => {
    if (!isRandomMode || allowedWorks.length < 2) return;
    const effectiveMax = Math.min(WORKS_PER_ROUND_MAX, allowedWorks.length);
    const current = worksPerRound ?? WORKS_PER_ROUND_DEFAULT;
    if (current > effectiveMax) {
      setWorksPerRound(effectiveMax);
    }
  }, [isRandomMode, allowedWorks.length, worksPerRound, setWorksPerRound]);

  const handleMaxSongsChange = useCallback(
    (value: number) => {
      // Si la valeur est egale au total, on met null (= toutes)
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
      const songCount = songCountByWork[work.id];
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
            ({songCount === undefined ? "…" : songCount})
          </span>
        </label>
      );
    },
    [allowedWorks, canSelectMoreWorks, songCountByWork, toggleWork]
  );

  const showWorksSkeleton = worksLoading && works.length === 0;

  if (!customizingUniverse) {
    return null;
  }

  return (
    <Dialog open onOpenChange={(open) => !open && closeCustomize()}>
      <DialogContent
        className={`w-[calc(100%-2rem)] max-w-3xl flex flex-col gap-3 ${
          shouldUseScrollableLayout ? "min-h-[70vh] max-h-[85vh]" : ""
        }`}
      >
        <div className="flex items-center justify-center">
          <DialogTitle className="text-xl font-extrabold text-[var(--color-text-primary)]">
            {customizingUniverse.name}
          </DialogTitle>
        </div>

        {customizingUniverse.id === CUSTOM_UNIVERSE_ID && (
          <div className="flex items-center justify-center gap-3">
            <span className={`text-sm font-semibold ${!isRandomMode ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"}`}>
              Personnalise
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isRandomMode}
              aria-label={isRandomMode ? "Mode aleatoire actif" : "Mode personnalise actif"}
              onClick={() => setUnifiedCustomSubMode(isRandomMode ? "custom" : "random")}
              className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full border-2 border-black transition-colors ${
                isRandomMode ? "bg-[#10B981]" : "bg-[#8B5CF6]"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full border-2 border-black bg-white shadow-[2px_2px_0_#1B1B1B] transition-transform ${
                  isRandomMode ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className={`text-sm font-semibold ${isRandomMode ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"}`}>
              Aleatoire
            </span>
          </div>
        )}

        <div
          className={
            shouldUseScrollableLayout
              ? "flex flex-col gap-3 flex-1 min-h-0"
              : "flex flex-col gap-3"
          }
        >
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
              Impossible de se deplacer pendant la lecture du morceau.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-[var(--color-text-primary)] text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={mysteryEffects.enabled}
                  onChange={(e) => setMysteryEffectsEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-2 border-black accent-yellow-400"
                />
                Activer les effets mysteres
              </label>
              {mysteryEffects.enabled && (
                <span className="text-[var(--color-text-secondary)] text-xs">
                  Frequence : {mysteryEffects.frequency}%
                </span>
              )}
            </div>

            {mysteryEffects.enabled && (
              <div className="space-y-3 pl-1">
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
                    Deux musiques en meme temps
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
                    Musique a l&apos;envers
                  </button>
                </div>
                {mysteryEffects.selectedEffects.length === 0 && (
                  <p className="text-[var(--color-text-secondary)] text-xs">
                    Selectionne au moins un effet a activer.
                  </p>
                )}
              </div>
            )}
          </div>

          <div
            className={
              shouldUseScrollableLayout
                ? "flex flex-col flex-1 min-h-0 overflow-hidden gap-2"
                : "flex flex-col gap-2"
            }
          >
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
                  {allowedWorks.length}/{maxWorksAllowed} selectionnees
                </span>
              )}
              {isRandomMode && (
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {allowedWorks.length} oeuvre{allowedWorks.length !== 1 ? "s" : ""} dans le pool
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

            {showWorksSkeleton ? (
              <div
                className={`grid grid-cols-2 md:grid-cols-3 gap-2 animate-pulse ${
                  shouldUseScrollableLayout ? "flex-1 min-h-0" : ""
                }`}
                aria-hidden="true"
              >
                {WORK_SKELETON_ITEMS.map((key) => (
                  <div
                    key={key}
                    className="h-10 rounded border-2 border-black/30 bg-[var(--color-surface-overlay)]/70"
                  />
                ))}
              </div>
            ) : (
              <div
                className={`pr-2 pb-2 pt-1 space-y-4 scrollbar-dark ${
                  shouldUseScrollableLayout ? "overflow-y-auto flex-1 min-h-0" : ""
                }`}
              >
                {isCustomMode || isRandomMode ? (
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

        </div>

        <div className="space-y-2">
          {isRandomMode && (() => {
            const poolSize = allowedWorks.length;
            const effectiveMax = Math.max(WORKS_PER_ROUND_MIN, Math.min(WORKS_PER_ROUND_MAX, poolSize));
            const rawValue = worksPerRound ?? WORKS_PER_ROUND_DEFAULT;
            const clampedValue = Math.max(WORKS_PER_ROUND_MIN, Math.min(effectiveMax, rawValue));
            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-text-primary)] text-sm font-semibold">Oeuvres par manche</span>
                  <span className="text-[var(--color-text-secondary)] text-xs">
                    {clampedValue} choix (max {effectiveMax} avec {poolSize} oeuvre{poolSize !== 1 ? "s" : ""} dans le pool)
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
                  A chaque manche, ce nombre d&apos;oeuvres sera propose comme reponses (dont la bonne). Min 2, max {effectiveMax} avec ce pool.
                </p>
              </div>
            );
          })()}

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

          {errorMessage && <div className="text-xs text-red-600">{errorMessage}</div>}

          {isDouble100Odd && (
            <p className="text-sm text-red-600 w-full text-center sm:text-left">
              Avec &quot;Deux musiques en meme temps&quot; a 100 %, le nombre de musiques doit etre pair.
            </p>
          )}
          <div className="flex justify-end gap-3 w-full">
            <DialogClose asChild>
              <button
                className={`px-4 py-2 text-sm font-bold bg-white hover:bg-[var(--color-surface-overlay)] ${pressable}`}
              >
                Annuler
              </button>
            </DialogClose>
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
      </DialogContent>
    </Dialog>
  );
};

export const UniverseCustomizeModal = memo(UniverseCustomizeModalComponent);
UniverseCustomizeModal.displayName = "UniverseCustomizeModal";
