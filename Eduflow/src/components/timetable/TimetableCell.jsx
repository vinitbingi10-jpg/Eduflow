import { memo, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/utils/cn.js";
import { useTimetable } from "@/store/TimetableContext.jsx";
import { TimetableCard } from "@/components/timetable/TimetableCard.jsx";
import { previewMove } from "@/utils/conflictDetection.js";

function TimetableCellBase({ day, slot, entries, style, compact, highlighted }) {
  const {
    entries: allEntries,
    selection,
    ui,
    patchUi,
    selectCell,
    openModal,
    moveEntry,
    addEntry,
    conflicts: { byEntry, lookups },
  } = useTimetable();

  const [over, setOver] = useState(false);
  const drag = ui.drag;
  const cellSelected = selection.cell?.day === day && selection.cell?.slot === slot;

  /** Live conflict preview while a card hovers this cell. */
  const preview = useMemo(() => {
    if (!over || !drag || drag.kind !== "entry") return null;
    const moving = allEntries.find((e) => e.id === drag.id);
    if (!moving || (moving.day === day && moving.slot === slot)) return null;
    return previewMove(allEntries, moving, { day, slot }, lookups);
  }, [over, drag, allEntries, day, slot, lookups]);

  const dropBlocked = Boolean(entries.find((e) => e.locked)) && drag?.kind === "entry" && entries.length > 0;

  function handleDrop(event) {
    event.preventDefault();
    setOver(false);
    patchUi({ drag: null });
    if (!drag) return;

    if (drag.kind === "entry") {
      moveEntry(drag.id, day, slot);
      return;
    }
    if (drag.kind === "subject") {
      addEntry({ subjectId: drag.id, day, slot, type: drag.type });
      return;
    }
    if (drag.kind === "teacher") {
      const subject = lookups.subjects.find((s) => s.teacherId === drag.id);
      addEntry({ subjectId: subject?.id ?? null, teacherId: drag.id, label: subject ? undefined : "Unassigned class", day, slot });
      return;
    }
    if (drag.kind === "room") {
      addEntry({ subjectId: null, roomId: drag.id, label: "Room reserved", day, slot });
      return;
    }
    if (drag.kind === "element") {
      addEntry({
        subjectId: null,
        label: drag.label,
        type: drag.type,
        color: drag.color,
        span: drag.type === "Practical" || drag.type === "Laboratory" ? 2 : 1,
        day,
        slot,
      });
    }
  }

  return (
    <div
      style={style}
      onClick={(event) => selectCell({ day, slot }, { keepEntries: event.metaKey || event.ctrlKey })}
      onDoubleClick={() => openModal("add", { day, slot })}
      onContextMenu={(event) => {
        event.preventDefault();
        selectCell({ day, slot });
        patchUi({ contextMenu: { x: event.clientX, y: event.clientY, day, slot, entryId: entries[0]?.id ?? null } });
      }}
      onDragOver={(event) => {
        if (!drag) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = drag.kind === "entry" ? "move" : "copy";
        if (!over) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      className={cn(
        "group/cell relative min-w-0 rounded-[5px] border border-dashed border-transparent bg-white/60 p-1 transition-colors duration-150",
        "hover:border-ink-200 hover:bg-white",
        cellSelected && "border-solid border-brand-400 bg-brand-50/50",
        over && !preview?.length && "border-solid border-brand-400 bg-brand-50",
        over && preview?.length && "border-solid border-danger-500 bg-danger-50",
        dropBlocked && over && "border-ink-300 bg-ink-50",
        highlighted && "border-solid border-info-500 bg-info-50 ring-2 ring-info-500/30"
      )}
    >
      {entries.length > 0 ? (
        <div className="flex h-full min-h-0 gap-1">
          {entries.slice(0, 2).map((entry) => (
            <div key={entry.id} className="min-w-0 flex-1">
              <TimetableCard
                entry={entry}
                compact={compact || entries.length > 1}
                selected={selection.entryIds.includes(entry.id)}
                conflicts={byEntry.get(entry.id) ?? []}
                onContextMenu={(event, target) =>
                  patchUi({ contextMenu: { x: event.clientX, y: event.clientY, day, slot, entryId: target.id } })
                }
              />
            </div>
          ))}
          {entries.length > 2 && (
            <span className="flex items-center rounded bg-danger-50 px-1 text-[10px] font-bold text-danger-600">
              +{entries.length - 2}
            </span>
          )}
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openModal("add", { day, slot });
            }}
            className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover/cell:opacity-100"
            aria-label="Add class in this period"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-white shadow-panel">
              <Plus className="h-3 w-3" strokeWidth={3} />
            </span>
          </button>
          {preview?.length > 0 && (
            <span className="pointer-events-none absolute inset-x-1 bottom-1 rounded bg-danger-500 px-1 py-0.5 text-center text-[10px] font-semibold text-white">
              Conflict
            </span>
          )}
        </>
      )}
    </div>
  );
}

export const TimetableCell = memo(TimetableCellBase);
