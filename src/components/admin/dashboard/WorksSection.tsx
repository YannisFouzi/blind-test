"use client";

import { Plus } from "lucide-react";
import { Work } from "@/types";
import { Button } from "../../ui/Button";
import { WorksTable } from "../../admin/WorksTable";

interface WorksSectionProps {
  universeName?: string;
  works: Work[];
  loading: boolean;
  onBack: () => void;
  onCreateWork: () => void;
  onEditWork: (work: Work) => void;
  onDeleteWork: (work: Work) => void;
  onManageSongs: (work: Work) => void;
  onMoveUp: (work: Work) => void;
  onMoveDown: (work: Work) => void;
  onReorder: (items: Array<{ id: string; order: number }>) => void;
}

export const WorksSection = ({
  universeName,
  works,
  loading,
  onBack,
  onCreateWork,
  onEditWork,
  onDeleteWork,
  onManageSongs,
  onMoveUp,
  onMoveDown,
  onReorder,
}: WorksSectionProps) => {
  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">
          Œuvres - {universeName || "Sélection"}
        </h2>
        <div className="flex space-x-2">
          <Button variant="secondary" onClick={onBack}>
            Retour aux univers
          </Button>
          <Button
            variant="primary"
            onClick={onCreateWork}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle œuvre</span>
          </Button>
        </div>
      </div>

      <WorksTable
        works={works}
        loading={loading}
        onEdit={onEditWork}
        onDelete={onDeleteWork}
        onManageSongs={onManageSongs}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onReorder={onReorder}
      />
    </section>
  );
};
