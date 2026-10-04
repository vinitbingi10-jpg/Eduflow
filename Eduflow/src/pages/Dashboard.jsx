import { AlertTriangle, ArrowRight, BookOpen, CalendarDays, DoorOpen, GraduationCap, Lock, Plus, Sparkles, Timer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/utils/cn.js";
import { useTimetable } from "@/store/TimetableContext.jsx";
import { PageShell } from "@/components/layout/PageShell.jsx";
import { Button, Badge } from "@/components/common/Button.jsx";
import { classesPerDay, roomUsage, teacherLoad, DAY_LABELS } from "@/utils/timetableUtils.js";

export default function Dashboard() {
  const navigate = useNavigate();
  const { entries, summary, conflicts, meta, data, openModal, patchUi, focusEntry } = useTimetable();

  const load = teacherLoad(entries, conflicts.lookups);
  const usage = roomUsage(entries, conflicts.lookups);
  const perDay = classesPerDay(entries);

  const stats = [
    { label: "Classes", value: summary.classes, icon: CalendarDays },
    { label: "Subjects", value: data.subjects.length, icon: BookOpen },
    { label: "Teachers", value: data.teachers.length, icon: GraduationCap },
    { label: "Rooms", value: data.rooms.length, icon: DoorOpen },
    { label: "Conflicts", value: conflicts.total, icon: AlertTriangle, danger: conflicts.total > 0 },
  ];

  const actions = [
    { icon: Plus, label: "New Timetable", hint: "Open the editor", run: () => navigate("/editor") },
    { icon: Sparkles, label: "Generate with AI", hint: "Needs subjects first", run: () => { navigate("/editor"); setTimeout(() => openModal("generate"), 250); } },
    { icon: BookOpen, label: "Add Subjects", hint: `${data.subjects.length} added`, run: () => navigate("/subjects") },
    { icon: GraduationCap, label: "Add Teachers", hint: `${data.teachers.length} added`, run: () => navigate("/teachers") },
  ];

  const teacherRows = data.teachers.map((t) => ({ ...t, hours: load[t.id] ?? 0 })).sort((a, b) => b.hours - a.hours).slice(0, 8);
  const roomRows = data.rooms.map((r) => ({ ...r, hours: usage[r.id] ?? 0 })).sort((a, b) => b.hours - a.hours).slice(0, 8);

  return (
    <PageShell
      eyebrow="Overview"
      title="Dashboard"
      subtitle={`${meta.title} · ${meta.academicYear} · ${meta.week}`}
      wide
      actions={
        <Button variant="primary" icon={CalendarDays} onClick={() => navigate("/editor")}>
          Open editor
        </Button>
      }
    >
      <section className="mb-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={a.run}
            className="group flex items-center gap-3 rounded-lg border border-ink-200 bg-white p-3 text-left transition hover:border-brand-300 hover:shadow-panel"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ink-100 text-ink-600 group-hover:bg-brand-50 group-hover:text-brand-600">
              <a.icon className="h-4 w-4" strokeWidth={2.1} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-ink-900">{a.label}</span>
              <span className="block truncate text-[11.5px] text-ink-400">{a.hint}</span>
            </span>
            <ArrowRight className="h-4 w-4 text-ink-300 group-hover:text-brand-600" />
          </button>
        ))}
      </section>

      <section className="mb-5 grid gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {stats.map((s) => (
          <article key={s.label} className={cn("rounded-lg border bg-white p-3.5", s.danger ? "border-danger-500/30" : "border-ink-200")}>
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-ink-400">
              <s.icon className={cn("h-3.5 w-3.5", s.danger && "text-danger-500")} strokeWidth={2.2} />
              {s.label}
            </p>
            <p className={cn("mt-1.5 font-display text-[28px] font-extrabold leading-none tracking-[-0.04em]", s.danger ? "text-danger-600" : "text-ink-900")}>
              {s.value}
            </p>
          </article>
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <section className="rounded-lg border border-ink-200 bg-white p-4 shadow-panel">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-ink-900">Periods per day</h2>
              <div className="flex gap-1.5">
                <Badge tone={conflicts.total ? "danger" : "ok"}>{conflicts.total} conflicts</Badge>
                <Badge tone="info">{summary.locked} locked</Badge>
              </div>
            </div>
            {entries.length ? (
              <div className="mt-3 flex items-end gap-2">
                {Object.entries(perDay).map(([dayId, count]) => (
                  <div key={dayId} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="font-mono text-[10.5px] text-ink-500">{count}</span>
                    <span className="flex h-24 w-full items-end overflow-hidden rounded bg-ink-100">
                      <span className="w-full rounded bg-brand-500 transition-all duration-500" style={{ height: `${Math.max(4, (count / 7) * 100)}%` }} />
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-400">{DAY_LABELS[dayId]}</span>
                  </div>
                ))}
              </div>
            ) : (
              <Empty text="No classes yet. Open the editor to add some or generate with AI." />
            )}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Mini icon={Timer} label="Free periods" value={summary.freePeriods} />
              <Mini icon={Lock} label="Utilisation" value={`${summary.utilization}%`} />
              <Mini icon={CalendarDays} label="Labs" value={summary.labs} />
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-ink-200 bg-white p-4 shadow-panel">
              <h3 className="text-[13px] font-semibold text-ink-900">Teacher workload</h3>
              {teacherRows.length ? (
                <ul className="mt-3 space-y-2">
                  {teacherRows.map((t) => {
                    const pct = t.maxWeeklyLoad ? Math.round((t.hours / t.maxWeeklyLoad) * 100) : 0;
                    return (
                      <li key={t.id}>
                        <div className="flex justify-between text-[12px]">
                          <span className="truncate font-medium text-ink-700">{t.name}</span>
                          <span className="font-mono text-[11px] text-ink-400">{t.hours}/{t.maxWeeklyLoad}h</span>
                        </div>
                        <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-ink-100">
                          <span className={cn("block h-full rounded-full", pct > 90 ? "bg-danger-500" : pct > 70 ? "bg-warn-500" : "bg-brand-500")} style={{ width: `${Math.max(pct, 3)}%` }} />
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <Empty text="Add teachers to see their load." action="Add teachers" onAction={() => navigate("/teachers")} />
              )}
            </div>
            <div className="rounded-lg border border-ink-200 bg-white p-4 shadow-panel">
              <h3 className="text-[13px] font-semibold text-ink-900">Room utilization</h3>
              {roomRows.length ? (
                <ul className="mt-3 space-y-2.5">
                  {roomRows.map((r) => {
                    const pct = Math.round((r.hours / 35) * 100);
                    return (
                      <li key={r.id} className="flex items-center gap-2.5">
                        <span className="w-28 shrink-0 truncate text-[12px] font-medium text-ink-700">{r.name}</span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                          <span className="block h-full rounded-full bg-info-500" style={{ width: `${Math.max(pct, 2)}%` }} />
                        </span>
                        <span className="w-9 text-right font-mono text-[11px] text-ink-400">{pct}%</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <Empty text="Add rooms to see utilization." action="Add rooms" onAction={() => navigate("/rooms")} />
              )}
            </div>
          </section>
        </div>

        <section className="rounded-lg border border-ink-200 bg-white p-4 shadow-panel">
          <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-900">
            <AlertTriangle className="h-3.5 w-3.5 text-danger-500" strokeWidth={2.3} />
            Conflicts
          </h3>
          {conflicts.total ? (
            <ul className="mt-3 space-y-1.5">
              {conflicts.conflicts.map((c) => {
                const entry = entries.find((e) => e.id === c.entryIds[0]);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        navigate("/editor");
                        if (entry) focusEntry(entry.id);
                        patchUi({ rightPanel: "conflicts" });
                      }}
                      className="w-full rounded-md border border-danger-500/25 bg-danger-50 p-2.5 text-left text-[12px] text-danger-600 hover:bg-danger-100"
                    >
                      <strong className="font-semibold">{c.title}</strong>
                      <span className="mt-0.5 block text-[11.5px]">{c.message}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty text="No conflicts." />
          )}

          <h3 className="mt-5 text-[13px] font-semibold text-ink-900">Suggestions</h3>
          <ul className="mt-2 space-y-1.5">
            {conflicts.improvements.map((item) => (
              <li key={item.id} className="rounded-md border border-ink-200 bg-ink-50/50 p-2.5">
                <p className="text-[12px] font-semibold text-ink-800">{item.title}</p>
                <p className="mt-0.5 text-[11px] text-ink-500">{item.detail}</p>
              </li>
            ))}
            {!conflicts.improvements.length && <Empty text="Nothing to suggest right now." />}
          </ul>
        </section>
      </div>
    </PageShell>
  );
}

function Mini({ icon: Icon, label, value }) {
  return (
    <div className="rounded-md bg-ink-50 p-2.5 ring-1 ring-ink-200">
      <Icon className="h-3.5 w-3.5 text-ink-500" strokeWidth={2.2} />
      <p className="mt-1.5 font-display text-[20px] font-bold leading-none tracking-[-0.03em] text-ink-900">{value}</p>
      <p className="mt-1 text-[10.5px] font-semibold uppercase tracking-[0.05em] text-ink-400">{label}</p>
    </div>
  );
}

function Empty({ text, action, onAction }) {
  return (
    <div className="mt-3 rounded-md border border-dashed border-ink-200 p-4 text-center text-[12px] text-ink-400">
      {text}
      {action && (
        <button type="button" onClick={onAction} className="ml-1.5 font-semibold text-brand-600 hover:underline">
          {action}
        </button>
      )}
    </div>
  );
}
