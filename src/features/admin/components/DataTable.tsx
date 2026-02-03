import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type Column<T> = {
  key: keyof T;
  label: string;
  render?: (value: unknown, item: T) => ReactNode;
};

type DataTableProps<T> = {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyMessage?: string;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  actions?: (item: T) => ReactNode;
};

const EMPTY_STATE_CLASSES =
  "bg-white rounded-2xl p-8 text-center border-[3px] border-[#1B1B1B] shadow-[4px_4px_0_#1B1B1B]";
const TABLE_WRAPPER_CLASSES =
  "bg-white rounded-2xl border-[3px] border-[#1B1B1B] overflow-hidden shadow-[4px_4px_0_#1B1B1B]";
const TABLE_HEAD_CELL_CLASSES =
  "px-6 py-3 text-left text-xs font-extrabold text-[var(--color-text-primary)] uppercase tracking-wider";

export function DataTable<T extends { id: string }>({
  data,
  columns,
  loading = false,
  emptyMessage = "Aucune donnee disponible",
  onEdit,
  onDelete,
  actions,
}: DataTableProps<T>) {
  const hasActions = Boolean(onEdit || onDelete || actions);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={EMPTY_STATE_CLASSES}>
        <p className="text-[var(--color-text-secondary)] text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={TABLE_WRAPPER_CLASSES}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[var(--color-surface-overlay)]">
            <tr>
              {columns.map((column) => (
                <th key={String(column.key)} className={TABLE_HEAD_CELL_CLASSES}>
                  {column.label}
                </th>
              ))}
              {hasActions && (
                <th className={`${TABLE_HEAD_CELL_CLASSES} text-right`}>Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {data.map((item, index) => (
              <tr
                key={item.id}
                className={index % 2 === 0 ? "bg-white" : "bg-[var(--color-surface-overlay)]"}
              >
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-primary)]"
                  >
                    {column.render
                      ? column.render(item[column.key], item)
                      : String(item[column.key] || "-")}
                  </td>
                ))}
                {hasActions && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      {actions?.(item)}
                      {onEdit && (
                        <Button variant="secondary" size="sm" onClick={() => onEdit(item)}>
                          Modifier
                        </Button>
                      )}
                      {onDelete && (
                        <Button variant="danger" size="sm" onClick={() => onDelete(item)}>
                          Supprimer
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

