"use client";

import { Plus } from "lucide-react";
import type { Universe } from "@/types";
import { getIconById } from "@/constants/icons";
import { DataTable } from "@/features/admin/components/DataTable";
import { Button } from "@/components/ui/Button";

interface UniverseSectionProps {
  universes: Universe[];
  loading: boolean;
  onCreate: () => void;
  onEdit: (universe: Universe) => void;
  onDelete: (universe: Universe) => void;
  onManageWorks: (universe: Universe) => void;
}

const DEFAULT_COLOR = "#3B82F6";

const renderThemeCell = (value: unknown, universe: Universe) => {
  const colorValue = String(value);
  const color = colorValue.startsWith("#") ? colorValue : DEFAULT_COLOR;
  const iconData = getIconById(universe.icon) || getIconById("wand");
  const IconComponent = iconData?.component;
  const hasValidColor = colorValue.startsWith("#");

  return (
    <div className="flex items-center space-x-3">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center"
        style={{ backgroundColor: color }}
      >
        {IconComponent && <IconComponent className="text-sm text-[#1c1c35]" />}
      </div>
      <div>
        <div className="text-[var(--color-text-primary)] font-medium">
          {universe.name || "Couleur personnalisee"}
        </div>
        <div className="text-[var(--color-text-secondary)] text-xs">{color}</div>
        {!hasValidColor && <div className="text-red-600 text-xs">Format invalide</div>}
      </div>
    </div>
  );
};

const renderActiveCell = (value: unknown) => {
  const isActive = Boolean(value);
  return (
    <span
      className={`px-2 py-1 rounded text-xs ${
        isActive
          ? "bg-[#86efac] text-[#1B1B1B] border-2 border-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B]"
          : "bg-[#fca5a5] text-[#1B1B1B] border-2 border-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B]"
      }`}
    >
      {isActive ? "Actif" : "Inactif"}
    </span>
  );
};

const universeColumns = [
  { key: "name" as keyof Universe, label: "Nom" },
  { key: "description" as keyof Universe, label: "Description" },
  { key: "color" as keyof Universe, label: "Theme", render: renderThemeCell },
  { key: "active" as keyof Universe, label: "Actif", render: renderActiveCell },
];

export const UniverseSection = ({
  universes,
  loading,
  onCreate,
  onEdit,
  onDelete,
  onManageWorks,
}: UniverseSectionProps) => {
  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Univers</h2>
        <Button variant="primary" onClick={onCreate} className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Nouveau</span>
        </Button>
      </div>

      <DataTable
        data={universes}
        columns={universeColumns}
        loading={loading}
        emptyMessage="Aucun univers cree"
        onEdit={onEdit}
        onDelete={onDelete}
        actions={(universe) => (
          <Button variant="secondary" size="sm" onClick={() => onManageWorks(universe)}>
            Gerer les oeuvres
          </Button>
        )}
      />
    </section>
  );
};

