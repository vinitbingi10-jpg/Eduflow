import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2, Inbox, ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn.js";
import { Button, IconButton, Badge } from "@/components/common/Button.jsx";
import { inputClass } from "@/components/common/Modal.jsx";

/**
 * Shared table shell for the data-management pages
 * (Subjects / Teachers / Rooms / Departments).
 */
export function DataTable({
  title,
  subtitle,
  columns,
  rows,
  searchKeys = [],
  searchPlaceholder = "Search…",
  filters = [],
  onAdd,
  onEdit,
  onDelete,
  addLabel = "Add",
  icon: Icon,
  toolbarExtra,
  emptyLabel = "Nothing here yet",
  rowTone,
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery =
        !q ||
        searchKeys.some((key) => String(row[key] ?? "").toLowerCase().includes(q)) ||
        columns.some((col) => col.searchable && String(col.value?.(row) ?? "").toLowerCase().includes(q));
      if (!matchesQuery) return false;
      return filters.every((filter) => {
        const value = active[filter.key];
        if (!value || value === "all") return true;
        return String(filter.value?.(row) ?? row[filter.key]) === value;
      });
    });
  }, [rows, query, searchKeys, columns, filters, active]);

  return (
    <section className="overflow-hidden rounded-lg border border-ink-200 bg-white shadow-panel">
      <header className="flex flex-wrap items-center gap-3 border-b border-ink-100 px-4 py-3">
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-50 text-brand-600 ring-1 ring-brand-100">
            <Icon className="h-4 w-4" strokeWidth={2} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-semibold text-ink-900">{title}</h2>
          {subtitle && <p className="text-[12px] text-ink-500">{subtitle}</p>}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className={cn(inputClass, "h-8 w-52 pl-8 text-[12.5px]")}
          />
        </div>
        {filters.map((filter) => (
          <div key={filter.key} className="relative">
            <select
              value={active[filter.key] ?? "all"}
              onChange={(event) => setActive((prev) => ({ ...prev, [filter.key]: event.target.value }))}
              className={cn(inputClass, "h-8 cursor-pointer appearance-none py-0 pl-2.5 pr-7 text-[12.5px]")}
            >
              <option value="all">{filter.label}: all</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          </div>
        ))}
        {toolbarExtra}
        {onAdd && (
          <Button size="sm" variant="primary" icon={Plus} onClick={onAdd}>
            {addLabel}
          </Button>
        )}
      </header>

      <div className="scroll-slim max-h-[min(62vh,44rem)] overflow-auto">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-ink-50/95 backdrop-blur">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "whitespace-nowrap border-b border-ink-200 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-500",
                    column.width,
                    column.align === "right" && "text-right"
                  )}
                >
                  {column.header}
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th className="w-20 border-b border-ink-200 px-3 py-2 text-right text-[11px] font-bold uppercase tracking-[0.06em] text-ink-500">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr
                key={row.id}
                className={cn("group border-b border-ink-100 transition-colors last:border-0 hover:bg-brand-50/40", rowTone?.(row))}
              >
                {columns.map((column) => (
                  <td key={column.key} className={cn("px-3 py-2 align-middle text-[13px] text-ink-700", column.align === "right" && "text-right")}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
                {(onEdit || onDelete) && (
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      {onEdit && <IconButton icon={Pencil} size="xs" label={`Edit ${title}`} tooltip="Edit" onClick={() => onEdit(row)} />}
                      {onDelete && (
                        <IconButton
                          icon={Trash2}
                          size="xs"
                          variant="ghost"
                          className="text-danger-500 hover:bg-danger-50"
                          label={`Delete ${title}`}
                          tooltip="Delete"
                          onClick={() => onDelete(row)}
                        />
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-12 text-center">
                  <Inbox className="mx-auto h-6 w-6 text-ink-300" strokeWidth={1.8} />
                  <p className="mt-2 text-[13px] font-medium text-ink-600">{emptyLabel}</p>
                  <p className="text-[12px] text-ink-400">Adjust the search or filters to see more records.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="flex items-center justify-between border-t border-ink-100 bg-ink-50/60 px-4 py-2 text-[11.5px] text-ink-500">
        <span>
          Showing <strong className="font-semibold text-ink-700">{filtered.length}</strong> of {rows.length} records
        </span>

      </footer>
    </section>
  );
}
