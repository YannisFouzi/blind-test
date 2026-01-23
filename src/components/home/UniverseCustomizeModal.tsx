"use client";

import { memo } from "react";
import type { Universe, Work } from "@/types";

interface UniverseCustomizeModalProps {
  universe: Universe;
  works: Work[];
  allowedWorks: string[];
  noSeek: boolean;
  loading: boolean;
  error: string | null;
  isApplying?: boolean;
  onToggleWork: (workId: string) => void;
  onSetNoSeek: (value: boolean) => void;
  onApply: () => void;
  onClose: () => void;
}

const UniverseCustomizeModalComponent = ({
  universe,
  works,
  allowedWorks,
  noSeek,
  loading,
  error,
  isApplying = false,
  onToggleWork,
  onSetNoSeek,
  onApply,
  onClose,
}: UniverseCustomizeModalProps) => {
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

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-white text-sm">
            <input
              type="checkbox"
              checked={noSeek}
              onChange={(e) => onSetNoSeek(e.target.checked)}
            />
            Activer le mode sans avance (timeline non cliquable)
          </label>

          <div className="text-white text-sm font-semibold">Oeuvres incluses</div>

          {loading ? (
            <div className="text-slate-200 text-sm">Chargement des oeuvres...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
              {works.map((work) => (
                <label
                  key={work.id}
                  className="flex items-center gap-2 text-white text-sm bg-slate-800/60 px-2 py-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={allowedWorks.includes(work.id)}
                    onChange={() => onToggleWork(work.id)}
                  />
                  {work.title}
                </label>
              ))}
            </div>
          )}

          {error && <div className="text-xs text-red-300">{error}</div>}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm"
          >
            Annuler
          </button>
          <button
            onClick={onApply}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm"
            disabled={isApplying || allowedWorks.length === 0}
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
