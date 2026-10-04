import { useState } from "react";
import { AlertTriangle, ArrowRight, Crosshair, Lightbulb, ShieldCheck, Sparkles, X, ScanSearch } from "lucide-react";
import { cn } from "@/utils/cn.js";
import { useTimetable } from "@/store/TimetableContext.jsx";
import { Button, Badge } from "@/components/common/Button.jsx";
import { dayLabel, slotLabel } from "@/utils/timetableUtils.js";
import { resolveConflictsLocally } from "@/services/aiService.js";

const TYPE_META = {
  teacher: { label: "Teacher", tone: "danger" },
  room: { label: "Room", tone: "warn" },
  lab: { label: "Lab", tone: "warn" },
  division: { label: "Class", tone: "danger" },
  availability: { label: "Availability", tone: "info" },
};

const SEVERITY = {
  critical: { bar: "bg-danger-500", chip: "bg-danger-50 text-danger-600 ring-danger-500/25", label: "Critical" },
  high: { bar: "bg-warn-500", chip: "bg-warn-50 text-warn-600 ring-warn-500/25", label: "High" },
  warning: { bar: "bg-info-500", chip: "bg-info-50 text-info-600 ring-info-500/25", label: "Advisory" },
};

/** Every detected problem, with one-click resolution paths. */
export function ConflictPanel({ onClose }) {
  const { conflicts, entries, focusEntry, runPrompt, replaceEntries, patchUi } = useTimetable();
  const [filter, setFilter] = useState("all");
  const list = conflicts.conflicts.filter((c) => filter === "all" || c.types.includes(filter));

  function fixAll() {
    const result = resolveConflictsLocally(entries, conflicts.lookups);
    if (!result.moves.length) {
      runPrompt("Fix all conflicts in the timetable");
      return;
    }
    replaceEntries(result.entries, "Resolve conflicts", {
      description: `${result.moves.length} unlocked session(s) relocated. Locked cells untouched.`,
    });
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-ink-200 bg-white shadow-panel">
      <header className="flex items-start gap-2 border-b border-ink-100 bg-danger-50/50 px-3 py-2.5">
        <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-white text-danger-500 ring-1 ring-danger-500/25">
          <ScanSearch className="h-3.5 w-3.5" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.04em] text-ink-800">Conflict engine</h2>
          <p className="text-[11.5px] text-ink-500">
            {conflicts.total === 0
              ? "No conflicts — teachers, rooms and divisions are all clear."
              : `${conflicts.total} open · ${conflicts.critical} critical`}
          </p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="rounded p-1 text-ink-400 transition hover:bg-white hover:text-ink-700" aria-label="Close conflict panel">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </header>

      <div className="flex flex-wrap gap-1 border-b border-ink-100 px-3 py-2">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" count={conflicts.total} />
        {Object.entries(TYPE_META).map(([type, meta]) => (
          <FilterChip
            key={type}
            active={filter === type}
            onClick={() => setFilter(type)}
            label={meta.label}
            count={conflicts.counts[type] ?? 0}
          />
        ))}
      </div>

      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto p-3">
        {conflicts.total > 0 && (
          <Button size="sm" variant="primary" icon={Sparkles} className="mb-3 w-full" onClick={fixAll}>
            Fix all resolvable conflicts
          </Button>
        )}

        <ul className="space-y-2">
          {list.map((conflict) => {
            const severity = SEVERITY[conflict.severity] ?? SEVERITY.high;
            const involved = conflict.entryIds
              .map((id) => entries.find((e) => e.id === id))
              .filter(Boolean);
            return (
              <li
                key={conflict.id}
                className="relative overflow-hidden rounded-md border border-ink-200 bg-white pl-3.5 transition hover:border-ink-300 hover:shadow-panel"
              >
                <span className={cn("absolute inset-y-0 left-0 w-[3px]", severity.bar)} />
                <div className="p-2.5 pl-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", conflict.severity === "critical" ? "text-danger-500" : "text-warn-500")}
                      strokeWidth={2.3}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-semibold leading-tight text-ink-900">{conflict.title}</p>
                      <p className="mt-1 text-[11.5px] leading-snug text-ink-500">{conflict.message}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        {conflict.types.map((type) => (
                          <Badge key={type} tone={TYPE_META[type]?.tone ?? "neutral"}>
                            {TYPE_META[type]?.label ?? type}
                          </Badge>
                        ))}
                        <span className={cn("rounded px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.05em] ring-1 ring-inset", severity.chip)}>
                          {severity.label}
                        </span>
                        {conflict.locked && <Badge tone="neutral">Locked involved</Badge>}
                      </div>

                      <ul className="mt-2 space-y-1">
                        {involved.map((entry) => (
                          <li key={entry.id}>
                            <button
                              type="button"
                              onClick={() => focusEntry(entry.id)}
                              className="group flex w-full items-center gap-1.5 rounded border border-ink-100 bg-ink-50/60 px-2 py-1 text-left transition hover:border-brand-200 hover:bg-brand-50"
                            >
                              <Crosshair className="h-3 w-3 shrink-0 text-ink-400 group-hover:text-brand-600" strokeWidth={2.2} />
                              <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink-600">
                                <strong className="font-semibold text-ink-800">{entry.label || entry.subjectId}</strong>{" "}
                                · {dayLabel(entry.day, "short")} {slotLabel(entry.slot)}
                              </span>
                              <ArrowRight className="h-3 w-3 shrink-0 text-ink-300 group-hover:text-brand-600" />
                            </button>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-2 flex gap-1.5">
                        <Button size="xs" variant="secondary" icon={Sparkles} onClick={() => { patchUi({ aiOpen: true }); runPrompt("Explain the current conflicts"); }}>
                          Ask AI
                        </Button>
                        {involved.some((e) => !e.locked) && (
                          <Button size="xs" variant="ghost" icon={ShieldCheck} onClick={fixAll}>
                            Auto-resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {conflicts.total === 0 && (
          <div className="rounded-md border border-ok-500/25 bg-ok-50 p-4 text-center">
            <ShieldCheck className="mx-auto h-6 w-6 text-ok-500" strokeWidth={2} />
            <p className="mt-2 text-[13px] font-semibold text-ok-600">Timetable is clean</p>
            <p className="mt-0.5 text-[11.5px] text-ink-500">
              Every teacher, room and division has a single booking per period.
            </p>
          </div>
        )}

        <div className="mt-4">
          <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-400">
            <Lightbulb className="h-3.5 w-3.5 text-warn-500" strokeWidth={2.2} />
            AI improvements ({conflicts.improvements.length})
          </h3>
          <ul className="mt-2 space-y-1.5">
            {conflicts.improvements.map((item) => (
              <li key={item.id} className="rounded-md border border-ink-200 bg-ink-50/50 p-2.5">
                <p className="text-[12px] font-semibold text-ink-800">{item.title}</p>
                <p className="mt-0.5 text-[11.5px] leading-snug text-ink-500">{item.detail}</p>
                <button
                  type="button"
                  onClick={() => { patchUi({ aiOpen: true }); runPrompt(`Optimize the timetable — ${item.title}`); }}
                  className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand-600 hover:text-brand-700"
                >
                  Apply suggestion <ArrowRight className="h-3 w-3" />
                </button>
              </li>
            ))}
            {!conflicts.improvements.length && (
              <li className="rounded-md border border-ink-100 bg-ink-50/40 p-3 text-[11.5px] text-ink-500">
                No improvements pending. Balanced load, full coverage, no idle rooms.
              </li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}

function FilterChip({ active, onClick, label, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition",
        active ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white text-ink-500 hover:border-ink-300 hover:text-ink-700"
      )}
    >
      {label}
      <span className={cn("font-mono text-[10px]", active ? "text-white/70" : "text-ink-400")}>{count}</span>
    </button>
  );
}
