import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { Work } from "@/types";
import { Button } from "../ui/Button";
import { LoadingSpinner } from "../ui/LoadingSpinner";

interface WorksTableProps {
  works: Work[];
  loading: boolean;
  onEdit: (work: Work) => void;
  onDelete: (work: Work) => void;
  onManageSongs: (work: Work) => void;
  onMoveUp: (work: Work) => void;
  onMoveDown: (work: Work) => void;
  onReorder: (works: Array<{ id: string; order: number }>) => void;
}

// Composant pour une ligne draggable
const SortableWorkRow = ({
  work,
  isFirst,
  isLast,
  onEdit,
  onDelete,
  onManageSongs,
  onMoveUp,
  onMoveDown,
}: {
  work: Work;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onEdit: (work: Work) => void;
  onDelete: (work: Work) => void;
  onManageSongs: (work: Work) => void;
  onMoveUp: (work: Work) => void;
  onMoveDown: (work: Work) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: work.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b border-black/10 ${
        isDragging ? "bg-[var(--color-surface-overlay)]" : ""
      }`}
    >
      {/* Colonne drag handle */}
      <td className="px-4 py-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-[var(--color-text-secondary)] p-1"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      </td>

      {/* Colonne ordre */}
      <td className="px-4 py-3">
        <span className="bg-[var(--color-brand-primary)] text-[#1B1B1B] px-2 py-1 rounded border-2 border-[#1B1B1B] text-sm font-bold shadow-[2px_2px_0_#1B1B1B]">
          {work.order || 0}
        </span>
      </td>

      {/* Colonne titre */}
      <td className="px-4 py-3 text-[var(--color-text-primary)] font-semibold">{work.title}</td>

      {/* Colonne playlist */}
      <td className="px-4 py-3 text-[var(--color-text-secondary)]">
        {work.playlistId || "Non définie"}
      </td>

      {/* Colonne actions */}
      <td className="px-4 py-3">
        <div className="flex items-center space-x-2">
          {/* Boutons flèches */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onMoveUp(work)}
            disabled={isFirst}
            className="flex items-center space-x-1"
          >
            <ArrowUp className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onMoveDown(work)}
            disabled={isLast}
            className="flex items-center space-x-1"
          >
            <ArrowDown className="w-4 h-4" />
          </Button>

          {/* Bouton gérer chansons */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onManageSongs(work)}
          >
            Gérer les chansons
          </Button>

          {/* Bouton modifier */}
          <Button variant="secondary" size="sm" onClick={() => onEdit(work)}>
            Modifier
          </Button>

          {/* Bouton supprimer */}
          <Button variant="danger" size="sm" onClick={() => onDelete(work)}>
            Supprimer
          </Button>
        </div>
      </td>
    </tr>
  );
};

export const WorksTable = ({
  works,
  loading,
  onEdit,
  onDelete,
  onManageSongs,
  onMoveUp,
  onMoveDown,
  onReorder,
}: WorksTableProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = works.findIndex((work) => work.id === active.id);
    const newIndex = works.findIndex((work) => work.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(works, oldIndex, newIndex);

      // Recalculer les ordres
      const reorderData = newOrder.map((work, index) => ({
        id: work.id,
        order: index + 1,
      }));

      onReorder(reorderData);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (works.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--color-text-secondary)]">
        Aucune oeuvre creee
      </div>
    );
  }

  // Trier les œuvres par ordre
  const sortedWorks = [...works].sort(
    (a, b) => (a.order || 0) - (b.order || 0)
  );

  return (
    <div className="bg-white rounded-2xl overflow-hidden border-[3px] border-[#1B1B1B] shadow-[4px_4px_0_#1B1B1B]">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--color-surface-overlay)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-extrabold text-[var(--color-text-primary)] uppercase tracking-wider"></th>
                <th className="px-4 py-3 text-left text-xs font-extrabold text-[var(--color-text-primary)] uppercase tracking-wider">
                  Ordre
                </th>
                <th className="px-4 py-3 text-left text-xs font-extrabold text-[var(--color-text-primary)] uppercase tracking-wider">
                  Titre
                </th>
                <th className="px-4 py-3 text-left text-xs font-extrabold text-[var(--color-text-primary)] uppercase tracking-wider">
                  Playlist ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-extrabold text-[var(--color-text-primary)] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <SortableContext
                items={sortedWorks.map((work) => work.id)}
                strategy={verticalListSortingStrategy}
              >
                {sortedWorks.map((work, index) => (
                  <SortableWorkRow
                    key={work.id}
                    work={work}
                    index={index}
                    isFirst={index === 0}
                    isLast={index === sortedWorks.length - 1}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onManageSongs={onManageSongs}
                    onMoveUp={onMoveUp}
                    onMoveDown={onMoveDown}
                  />
                ))}
              </SortableContext>
            </tbody>
          </table>
        </div>
      </DndContext>
    </div>
  );
};
