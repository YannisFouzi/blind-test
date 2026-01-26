import { ReactNode } from "react";
import { Button } from "../ui/Button";
import { LoadingSpinner } from "../ui/LoadingSpinner";

interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: unknown, item: T) => ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyMessage?: string;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  actions?: (item: T) => ReactNode;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  loading = false,
  emptyMessage = "Aucune donnée disponible",
  onEdit,
  onDelete,
  actions,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border-[3px] border-[#1B1B1B] shadow-[4px_4px_0_#1B1B1B]">
        <p className="text-[var(--color-text-secondary)] text-lg">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border-[3px] border-[#1B1B1B] overflow-hidden shadow-[4px_4px_0_#1B1B1B]">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[var(--color-surface-overlay)]">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className="px-6 py-3 text-left text-xs font-extrabold text-[var(--color-text-primary)] uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
              {(onEdit || onDelete || actions) && (
                <th className="px-6 py-3 text-right text-xs font-extrabold text-[var(--color-text-primary)] uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {data.map((item, index) => (
              <tr
                key={item.id}
                className={`${
                  index % 2 === 0
                    ? "bg-white"
                    : "bg-[var(--color-surface-overlay)]"
                }`}
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
                {(onEdit || onDelete || actions) && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      {actions && actions(item)}
                      {onEdit && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onEdit(item)}
                        >
                          Modifier
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => onDelete(item)}
                        >
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
