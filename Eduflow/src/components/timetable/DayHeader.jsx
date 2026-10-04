import { CalendarDays, Lock, ScanEye, Sparkles } from "lucide-react";
import { cn } from "@/utils/cn.js";
import { useTimetable } from "@/store/TimetableContext.jsx";
import { Tooltip } from "@/components/common/Tooltip.jsx";

/** Sticky day column header with per-day stats and quick actions. */
export function DayHeader({ day, style, classCount, lockedCount, conflictCount }) {
  const { settings, setSettings, lockRow, runPrompt, patchUi } = useTimetable();
  const isActive = settings.activeDay === day.id;

  return (
    <div
      style={style}
      onContextMenu={(event) => {
        event.preventDefault();
        patchUi({ contextMenu: { x: event.clientX, y: event.clientY, day: day.id, slot: "p1", entryId: null } });
      }}
      className={cn(
        "sticky top-0 z-20 flex items-center gap-2 rounded-md border bg-white px-2.5 py-1.5 shadow-[0_1px_2px_rgba(19,23,29,0.05)] transition-colors",
        isActive ? "border-brand-300 bg-brand-50" : "border-ink-200",
        day.optional && "border-dashed"
      )}
    >
      <button
        type="button"
        onClick={() => setSettings({ activeDay: day.id })}
        onDoubleClick={() => setSettings({ view: settings.view === "day" && isActive ? "week" : "day", activeDay: day.id })}
        className="min-w-0 flex-1 text-left"
        title="Click to focus · double-click for day view"
      >
        <span className="flex items-center gap-1.5">
          <span className="truncate font-display text-[12.5px] font-semibold uppercase tracking-[0.06em] text-ink-900">
            {day.short}
          </span>
          {conflictCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[9.5px] font-bold text-white">
              {conflictCount}
            </span>
          )}
        </span>
        <span className="mt-px flex items-center gap-1 text-[10.5px] text-ink-400">
          <CalendarDays className="h-3 w-3" strokeWidth={2} />
          {day.date} · {classCount} class{classCount === 1 ? "" : "es"}
          {lockedCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-ink-500">
              <Lock className="h-2.5 w-2.5" strokeWidth={2.6} />
              {lockedCount}
            </span>
          )}
        </span>
      </button>

      <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 hover:opacity-100 focus-within:opacity-100">
        <Tooltip label="Focus this day">
          <button
            type="button"
            onClick={() => setSettings({ view: "day", activeDay: day.id })}
            className="flex h-6 w-6 items-center justify-center rounded text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
          >
            <ScanEye className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </Tooltip>
        <Tooltip label={`Lock all of ${day.label}`}>
          <button
            type="button"
            onClick={() => lockRow(day.id)}
            className="flex h-6 w-6 items-center justify-center rounded text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
          >
            <Lock className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </Tooltip>
        <Tooltip label={`Regenerate ${day.label} with AI`}>
          <button
            type="button"
            onClick={() => {
              patchUi({ aiOpen: true });
              runPrompt(`Regenerate ${day.label}`);
            }}
            className="flex h-6 w-6 items-center justify-center rounded text-brand-500 transition hover:bg-brand-50"
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </Tooltip>
      </span>
    </div>
  );
}
