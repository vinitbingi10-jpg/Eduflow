import { memo } from "react";
import { AlertTriangle, Copy, Lock, LockOpen, Pencil, Sparkles, Trash2, GripVertical } from "lucide-react";
import { CATEGORY_COLORS } from "@/data/mockData.js";
import { cn } from "@/utils/cn.js";
import { useTimetable } from "@/store/TimetableContext.jsx";
import { Tooltip } from "@/components/common/Tooltip.jsx";

const HEX = Object.fromEntries(CATEGORY_COLORS.map((c) => [c.id, c.hex]));

export function categoryHex(id) {
  return HEX[id] ?? HEX.slate;
}

export function withAlpha(hex, alpha) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function TimetableCardBase({ entry, conflicts = [], selected, compact, onContextMenu }) {
  const { selectEntry, openModal, toggleLock, duplicateEntry, deleteEntries, patchUi, conflicts: { lookups } } = useTimetable();

  const subject = entry.subjectId ? lookups.subjectById[entry.subjectId] : null;
  const teacher = lookups.teacherById[entry.teacherId];
  const room = lookups.roomById[entry.roomId];
  const hex = categoryHex(entry.color ?? subject?.color);
  const hasConflict = conflicts.length > 0;
  const title = entry.label || subject?.short || subject?.name || entry.type || "Free period";

  return (
    <article
      draggable={!entry.locked}
      onDragStart={(event) => {
        if (entry.locked) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", entry.id);
        patchUi({ drag: { kind: "entry", id: entry.id, span: entry.span || 1 } });
        selectEntry(entry.id);
      }}
      onDragEnd={() => patchUi({ drag: null })}
      onClick={(event) => {
        event.stopPropagation();
        selectEntry(entry.id, { multi: event.metaKey || event.ctrlKey });
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        if (entry.locked) return;
        openModal("add", { entry });
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        selectEntry(entry.id);
        onContextMenu?.(event, entry);
      }}
      style={{
        background: hasConflict ? "#fff8f7" : `linear-gradient(180deg, ${withAlpha(hex, 0.1)} 0%, ${withAlpha(hex, 0.05)} 100%)`,
        borderColor: hasConflict ? "rgba(195,60,52,0.45)" : withAlpha(hex, 0.3),
        boxShadow: selected
          ? `0 0 0 2px ${withAlpha("#17837a", 0.55)}, 0 6px 14px -8px rgba(19,23,29,0.4)`
          : hasConflict
            ? "0 0 0 1px rgba(195,60,52,0.35)"
            : "0 1px 1px rgba(19,23,29,0.04)",
      }}
      className={cn(
        "group/card relative flex h-full min-w-0 cursor-grab flex-col overflow-hidden rounded-[5px] border py-1.5 pl-2.5 pr-1.5 text-left transition-all duration-150",
        "hover:-translate-y-px hover:shadow-[0_6px_16px_-8px_rgba(19,23,29,0.45)] active:cursor-grabbing",
        entry.locked && "cursor-default saturate-[0.72]",
        hasConflict && "animate-conflict"
      )}
      title={hasConflict ? conflicts.map((c) => c.message).join(" ") : `${title} · ${teacher?.name ?? "Unassigned"}`}
    >
      {/* category bar */}
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: hex }} />
      {entry.locked && (
        <span
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage: `repeating-linear-gradient(135deg, ${withAlpha(hex, 0.06)} 0 6px, transparent 6px 12px)`,
          }}
        />
      )}

      <div className="relative flex items-start gap-1">
        <h4
          className="min-w-0 flex-1 truncate text-[12px] font-semibold leading-tight tracking-[-0.01em] text-ink-900"
          style={{ fontSize: compact ? "11.5px" : undefined }}
        >
          {title}
        </h4>
        <span className="flex shrink-0 items-center gap-0.5">
          {entry.source === "ai" && !hasConflict && (
            <Sparkles className="h-3 w-3 text-brand-500" strokeWidth={2.2} aria-label="AI generated" />
          )}
          {entry.locked ? (
            <Lock className="h-3 w-3 text-ink-500" strokeWidth={2.4} aria-label="Locked" />
          ) : (
            <GripVertical className="h-3 w-3 text-ink-300 opacity-0 transition group-hover/card:opacity-100" strokeWidth={2.4} />
          )}
          {hasConflict && <AlertTriangle className="h-3 w-3 text-danger-500" strokeWidth={2.4} aria-label="Conflict" />}
        </span>
      </div>

      {!compact && (
        <>
          <p className="relative mt-0.5 truncate text-[11.5px] leading-tight text-ink-600">
            {teacher?.name ?? "Unassigned"}
          </p>
          <p className="relative truncate text-[11px] leading-tight text-ink-400">
            {room?.name ?? "No room"}
            {entry.type && entry.type !== "Lecture" ? ` · ${entry.type}` : ""}
          </p>
          <p
            className="relative mt-auto truncate pt-1 text-[10px] font-semibold uppercase tracking-[0.05em]"
            style={{ color: hex }}
          >
            {lookups.departmentById[entry.departmentId]?.code ?? "CSE"} • Sem {entry.semester} • Div {entry.division}
          </p>
        </>
      )}
      {compact && (
        <p className="relative mt-0.5 truncate text-[11px] leading-tight text-ink-500">{teacher?.name ?? "Unassigned"}</p>
      )}

      {/* hover actions */}
      <div className="absolute bottom-1 right-1 z-10 flex items-center gap-0.5 rounded border border-ink-200 bg-white/95 p-0.5 opacity-0 shadow-panel backdrop-blur transition-opacity duration-150 group-hover/card:opacity-100 focus-within:opacity-100">
        <CardAction
          icon={entry.locked ? LockOpen : Lock}
          label={entry.locked ? "Unlock cell" : "Lock cell"}
          onClick={(event) => {
            event.stopPropagation();
            toggleLock([entry.id]);
          }}
        />
        <CardAction
          icon={Pencil}
          label="Edit class"
          onClick={(event) => {
            event.stopPropagation();
            openModal("add", { entry });
          }}
        />
        <CardAction
          icon={Copy}
          label="Duplicate"
          onClick={(event) => {
            event.stopPropagation();
            duplicateEntry(entry.id);
          }}
        />
        <CardAction
          icon={Trash2}
          label="Delete"
          danger
          onClick={(event) => {
            event.stopPropagation();
            deleteEntries([entry.id]);
          }}
        />
      </div>

    </article>
  );
}

function CardAction({ icon: Icon, label, onClick, danger }) {
  return (
    <Tooltip label={label} side="top" delay={200}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded transition-colors",
          danger ? "text-danger-500 hover:bg-danger-50" : "text-ink-500 hover:bg-ink-100 hover:text-ink-800"
        )}
      >
        <Icon className="h-3 w-3" strokeWidth={2.2} />
      </button>
    </Tooltip>
  );
}

export const TimetableCard = memo(TimetableCardBase);
