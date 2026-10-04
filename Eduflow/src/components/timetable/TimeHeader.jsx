import { Clock } from "lucide-react";
import { cn } from "@/utils/cn.js";
import { useTimetable } from "@/store/TimetableContext.jsx";

/** Sticky time column: period range, index and quick period lock. */
export function TimeHeader({ slot, style, index }) {
  const { lockColumn } = useTimetable();
  const isBreak = slot.kind === "break";

  return (
    <div
      style={style}
      onDoubleClick={() => !isBreak && lockColumn(slot.id)}
      title={isBreak ? slot.label : `Double-click to lock ${slot.label} for every day`}
      className={cn(
        "sticky left-0 z-10 flex flex-col items-end justify-center gap-0.5 rounded-md border px-2 py-1 text-right transition-colors",
        isBreak
          ? "border-warn-500/25 bg-warn-50/70"
          : "border-ink-200 bg-white hover:border-brand-200 hover:bg-brand-50/40"
      )}
    >
      <span className="font-mono text-[11.5px] font-semibold leading-none text-ink-800">
        {slot.start}–{slot.end}
      </span>
      <span className={cn("text-[10px] uppercase tracking-[0.06em] leading-none", isBreak ? "text-warn-600" : "text-ink-400")}>
        {isBreak ? slot.label : `Period ${index}`}
      </span>
    </div>
  );
}

/** Full-width strip rendered across all day columns for tea break / lunch. */
export function BreakStrip({ slot, style }) {
  return (
    <div
      style={style}
      className="flex items-center justify-center gap-2 rounded-md border border-warn-500/25 bg-[repeating-linear-gradient(135deg,#fdf5e7_0_8px,#fbf1de_8px_16px)] text-warn-600"
    >
      <Clock className="h-3 w-3" strokeWidth={2.4} />
      <span className="text-[10.5px] font-bold uppercase tracking-[0.14em]">
        {slot.label} · {slot.start}–{slot.end}
      </span>
    </div>
  );
}
