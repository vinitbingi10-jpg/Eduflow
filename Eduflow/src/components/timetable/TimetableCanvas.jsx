import { AlertTriangle, CalendarPlus, ChevronDown, FlaskConical, Plus, Sparkles, Users, DoorOpen, CheckCircle2 } from "lucide-react";
import {
  ACADEMIC_YEARS,
  DEPARTMENTS,
  DIVISIONS,
  SEMESTERS,
  WEEKS,
  CATEGORY_COLORS,
} from "@/data/mockData.js";
import { cn } from "@/utils/cn.js";
import { useTimetable } from "@/store/TimetableContext.jsx";
import { Button } from "@/components/common/Button.jsx";
import { Dropdown, MenuItem } from "@/components/common/Dropdown.jsx";
import { Tooltip } from "@/components/common/Tooltip.jsx";
import { TimetableGrid } from "@/components/timetable/TimetableGrid.jsx";
import { ModeIndicator } from "@/components/timetable/ModeIndicator.jsx";

/** Information bar + grid. This is the product's main surface. */
export function TimetableCanvas() {
  const { entries, conflicts, settings } = useTimetable();

  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
      <TimetableInfoBar />

      {/* per-day load meters */}
      <div className="flex items-center gap-3 border-b border-ink-100 bg-ink-50/50 px-4 py-1.5">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-400">Week load</span>
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          {settings.visibleDays.slice(0, 6).map((dayId) => {
            const count = entries.filter((e) => e.day === dayId).reduce((n, e) => n + (e.span || 1), 0);
            const pct = Math.min(100, Math.round((count / 7) * 100));
            const dayConflicts = conflicts.conflicts.filter((c) => c.day === dayId).length;
            return (
              <Tooltip key={dayId} label={`${dayId.toUpperCase()} — ${count} periods scheduled${dayConflicts ? ` · ${dayConflicts} conflict(s)` : ""}`}>
                <div className="group/meter flex min-w-0 flex-1 items-center gap-1.5">
                  <span className="w-7 shrink-0 font-mono text-[10px] uppercase text-ink-400">{dayId}</span>
                  <span className="h-1.5 min-w-8 flex-1 overflow-hidden rounded-full bg-ink-200">
                    <span
                      className={cn(
                        "block h-full rounded-full transition-all duration-500",
                        dayConflicts ? "bg-danger-500" : pct > 85 ? "bg-warn-500" : "bg-brand-500"
                      )}
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </span>
                </div>
              </Tooltip>
            );
          })}
        </div>
        <div className="hidden items-center gap-2 xl:flex">
          {CATEGORY_COLORS.slice(0, 6).map((color) => (
            <span key={color.id} className="flex items-center gap-1 text-[10.5px] text-ink-400">
              <span className="h-2 w-2 rounded-sm" style={{ background: color.hex }} />
              {color.label}
            </span>
          ))}
        </div>
      </div>

      {entries.length === 0 ? <EmptyCanvas /> : <TimetableGrid />}
    </main>
  );
}

function TimetableInfoBar() {
  const { meta, setMeta, summary, conflicts, openModal, settings, setSettings } = useTimetable();
  const department = DEPARTMENTS.find((d) => d.id === meta.departmentId);

  const chips = [
    { icon: CalendarPlus, label: "Classes", value: summary.classes },
    { icon: FlaskConical, label: "Labs", value: summary.labs },
    { icon: Users, label: "Teachers", value: summary.teachers },
    { icon: DoorOpen, label: "Rooms", value: summary.rooms },
  ];

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-ink-200 bg-white px-4 py-2.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="truncate font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">
            {department?.code ?? "CSE"} • Semester {meta.semester} • Division {meta.division}
          </h1>
          <span className="hidden rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[10.5px] font-medium text-ink-500 sm:inline">
            {meta.title}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <BarSelect
            value={meta.departmentId}
            onChange={(value) => setMeta({ departmentId: value })}
            options={DEPARTMENTS.map((d) => ({ value: d.id, label: d.code }))}
            label="Dept"
          />
          <BarSelect
            value={meta.semester}
            onChange={(value) => setMeta({ semester: Number(value) })}
            options={SEMESTERS.map((s) => ({ value: s.id, label: `Sem ${s.id}` }))}
            label="Sem"
          />
          <BarSelect
            value={meta.division}
            onChange={(value) => setMeta({ division: value })}
            options={DIVISIONS.map((d) => ({ value: d.id, label: `Div ${d.id}` }))}
            label="Div"
          />
          <BarSelect
            value={meta.academicYear}
            onChange={(value) => setMeta({ academicYear: value })}
            options={ACADEMIC_YEARS.map((y) => ({ value: y, label: y }))}
            label="Year"
          />
          <Dropdown
            width="w-44"
            trigger={
              <button
                type="button"
                className="inline-flex h-7 items-center gap-1 rounded border border-ink-200 bg-white px-2 text-[11.5px] font-medium text-ink-600 transition hover:border-ink-300 hover:bg-ink-50"
              >
                {meta.week}
                <ChevronDown className="h-3 w-3 text-ink-400" />
              </button>
            }
          >
            {WEEKS.map((week) => (
              <MenuItem key={week} label={week} checked={week === meta.week} onClick={() => setMeta({ week })} />
            ))}
          </Dropdown>
        </div>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <div className="hidden items-center gap-1 md:flex">
          {chips.map((chip) => (
            <Tooltip key={chip.label} label={`${chip.label} used in this timetable`}>
              <span className="flex items-center gap-1.5 rounded-md border border-ink-100 bg-ink-50/70 px-2 py-1">
                <chip.icon className="h-3.5 w-3.5 text-ink-400" strokeWidth={2} />
                <span className="font-mono text-[12px] font-semibold text-ink-800">{chip.value}</span>
                <span className="text-[10.5px] uppercase tracking-[0.05em] text-ink-400">{chip.label}</span>
              </span>
            </Tooltip>
          ))}
        </div>

        {conflicts.total > 0 ? (
          <button
            type="button"
            onClick={() => openModal("conflicts")}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-danger-500/30 bg-danger-50 px-2.5 text-[12px] font-semibold text-danger-600 transition hover:bg-danger-500 hover:text-white"
          >
            <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.3} />
            {conflicts.total} conflict{conflicts.total === 1 ? "" : "s"}
          </button>
        ) : (
          <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-ok-500/25 bg-ok-50 px-2.5 text-[12px] font-semibold text-ok-600">
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.3} />
            No conflicts
          </span>
        )}

        <ModeIndicator />

        <Button size="sm" variant="secondary" icon={Plus} onClick={() => openModal("add", {})}>
          Add Class
        </Button>
        <Button size="sm" variant="primary" icon={Sparkles} onClick={() => openModal("generate")}>
          Generate
        </Button>
      </div>
    </header>
  );
}

function BarSelect({ value, onChange, options, label }) {
  return (
    <span className="relative inline-flex items-center">
      <span className="pointer-events-none absolute left-2 text-[10px] font-bold uppercase tracking-[0.06em] text-ink-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-7 cursor-pointer appearance-none rounded border border-ink-200 bg-white pl-[2.6rem] pr-5 text-[11.5px] font-medium text-ink-700 transition hover:border-ink-300 hover:bg-ink-50 focus:border-brand-400 focus:outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 h-3 w-3 text-ink-400" />
    </span>
  );
}

function EmptyCanvas() {
  const { openModal, data } = useTimetable();
  return (
    <div className="grid-paper flex flex-1 items-center justify-center p-8">
      <div className="max-w-md animate-slide-up rounded-lg border border-ink-200 bg-white/90 p-7 text-center shadow-panel">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-md bg-brand-50 text-brand-600 ring-1 ring-brand-100">
          <CalendarPlus className="h-5 w-5" strokeWidth={2} />
        </span>
        <h2 className="mt-3 font-display text-[17px] font-bold text-ink-900">This week is empty</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
          {data.subjects.length
            ? "Add classes one by one, or let the AI fill the week and edit whatever you want to change."
            : "Start by adding your subjects. Then add classes by hand or let the AI generate the week."}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {!data.subjects.length && (
            <Button variant="primary" icon={Plus} onClick={() => openModal("subject")}>
              Add subject
            </Button>
          )}
          <Button variant="secondary" icon={Plus} onClick={() => openModal("add", {})}>
            Add class
          </Button>
          <Button variant={data.subjects.length ? "primary" : "secondary"} icon={Sparkles} onClick={() => openModal("generate")}>
            Generate with AI
          </Button>
        </div>
      </div>
    </div>
  );
}
