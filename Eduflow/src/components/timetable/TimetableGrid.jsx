import { useEffect, useMemo, useRef } from "react";
import { CalendarClock } from "lucide-react";
import { DAYS, SLOTS } from "@/data/mockData.js";
import { cn } from "@/utils/cn.js";
import { useTimetable } from "@/store/TimetableContext.jsx";
import { cellKey, gridSpan } from "@/utils/timetableUtils.js";
import { DayHeader } from "@/components/timetable/DayHeader.jsx";
import { TimeHeader, BreakStrip } from "@/components/timetable/TimeHeader.jsx";
import { TimetableCell } from "@/components/timetable/TimetableCell.jsx";

/**
 * The editable timetable canvas grid.
 * Explicit grid placement (not auto-flow) so multi-period labs never punch
 * holes in the layout, while headers stay sticky in both axes.
 */
export function TimetableGrid() {
  const { entries, settings, selection, highlight, conflicts, ui } = useTimetable();
  const scrollRef = useRef(null);

  const days = useMemo(
    () =>
      DAYS.filter(
        (day) => settings.visibleDays.includes(day.id) && (settings.view === "day" ? day.id === settings.activeDay : true)
      ),
    [settings.visibleDays, settings.view, settings.activeDay]
  );

  const zoom = settings.zoom / 100;
  const compact = settings.rowHeight === "compact";
  const rowH = Math.round((compact ? 58 : 80) * zoom);
  const breakH = Math.round(30 * zoom);
  const dayW = Math.round(186 * zoom);
  const timeW = Math.round(96 * zoom);
  const headH = Math.round(52 * zoom);
  const gap = Math.round(6 * zoom);

  /** anchor cell -> entries, resolving overlaps created by spanning labs */
  const cells = useMemo(() => {
    const coverOwner = new Map();
    entries.forEach((entry) => {
      gridSpan(entry).slots.slice(1).forEach((slot) => coverOwner.set(cellKey(entry.day, slot), entry));
    });

    const map = new Map();
    entries.forEach((entry) => {
      const key = cellKey(entry.day, entry.slot);
      const owner = coverOwner.get(key);
      const target = owner && owner.id !== entry.id ? cellKey(owner.day, owner.slot) : key;
      if (!map.has(target)) map.set(target, []);
      map.get(target).push(entry);
    });

    map.forEach((list, key) => {
      const spanning = list.find((e) => (e.span || 1) > 1);
      const [day, slot] = key.split("|");
      map.set(key, {
        day,
        slot,
        entries: list,
        rowSpan: spanning ? gridSpan(spanning).rowSpan : 1,
      });
    });

    return { map, covered: coverOwner };
  }, [entries]);

  const stats = useMemo(() => {
    const perDay = {};
    days.forEach((day) => {
      const list = entries.filter((e) => e.day === day.id);
      perDay[day.id] = {
        count: list.reduce((n, e) => n + (e.span || 1), 0),
        locked: list.filter((e) => e.locked).length,
        conflicts: conflicts.conflicts.filter((c) => c.day === day.id).length,
      };
    });
    return perDay;
  }, [days, entries, conflicts.conflicts]);

  // Keep the selected / searched cell in view.
  useEffect(() => {
    const key = highlight?.key ?? (selection.cell ? cellKey(selection.cell.day, selection.cell.slot) : null);
    if (!key || !scrollRef.current) return;
    const node = scrollRef.current.querySelector(`[data-cell="${key}"]`);
    node?.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
  }, [highlight, selection.cell]);

  const teachingSlots = SLOTS.filter((s) => s.kind !== "break");

  return (
    <div ref={scrollRef} className="scroll-slim print-area relative flex-1 overflow-auto bg-white">
      <div
        className="grid p-3"
        style={{
          gridTemplateColumns: `${timeW}px repeat(${days.length}, minmax(${dayW}px, 1fr))`,
          gridTemplateRows: `${headH}px ${SLOTS.map((s) => (s.kind === "break" ? breakH : rowH)).join(" ")}`,
          gap: `${gap}px`,
          minWidth: timeW + days.length * dayW + gap * (days.length + 1) + 24,
          width: "100%",
        }}
      >
        {/* corner */}
        <div
          style={{ gridColumn: 1, gridRow: 1 }}
          className="sticky left-0 top-0 z-30 flex items-center justify-end gap-1.5 rounded-md border border-ink-200 bg-ink-50 px-2 py-1.5"
        >
          <CalendarClock className="h-3.5 w-3.5 text-ink-400" strokeWidth={2} />
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-500">Time</span>
        </div>

        {/* day headers */}
        {days.map((day, dayIndex) => (
          <DayHeader
            key={day.id}
            day={day}
            style={{ gridColumn: dayIndex + 2, gridRow: 1 }}
            classCount={stats[day.id]?.count ?? 0}
            lockedCount={stats[day.id]?.locked ?? 0}
            conflictCount={stats[day.id]?.conflicts ?? 0}
          />
        ))}

        {/* rows */}
        {SLOTS.map((slot, index) => {
          const row = index + 2;
          const isBreak = slot.kind === "break";
          const periodNumber = teachingSlots.findIndex((s) => s.id === slot.id) + 1;

          return (
            <div key={slot.id} className="contents">
              <TimeHeader
                slot={slot}
                index={periodNumber}
                style={{ gridColumn: 1, gridRow: row }}
              />
              {isBreak ? (
                <BreakStrip
                  slot={slot}
                  style={{ gridColumn: `2 / span ${days.length}`, gridRow: row }}
                />
              ) : (
                days.map((day, dayIndex) => {
                  const key = cellKey(day.id, slot.id);
                  if (cells.covered.has(key)) return null;
                  const cell = cells.map.get(key);
                  return (
                    <TimetableCell
                      key={key}
                      day={day.id}
                      slot={slot.id}
                      entries={cell?.entries ?? []}
                      compact={compact}
                      highlighted={highlight?.key === key}
                      style={{
                        gridColumn: dayIndex + 2,
                        gridRow: row,
                        gridRowEnd: cell ? `span ${cell.rowSpan}` : undefined,
                      }}
                    />
                  );
                })
              )}
            </div>
          );
        })}
      </div>

      {/* drag hint */}
      <div
        className={cn(
          "pointer-events-none sticky bottom-3 mx-auto mb-3 flex w-fit items-center gap-2 rounded-full border border-ink-200 bg-white/95 px-3 py-1.5 text-[11.5px] text-ink-500 shadow-panel backdrop-blur transition-opacity duration-200",
          ui.drag ? "opacity-100" : "opacity-0"
        )}
      >
        <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-brand-500" />
        Drop to place · conflicting slots glow red · locked cells are skipped
      </div>
    </div>
  );
}


