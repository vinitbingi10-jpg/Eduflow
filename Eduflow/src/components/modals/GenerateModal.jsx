import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, Loader2, Sparkles, Wand2, X, Lock, AlertTriangle } from "lucide-react";
import { DAYS, DEPARTMENTS, DIVISIONS, SEMESTERS, SLOTS } from "@/data/mockData.js";
import { cn } from "@/utils/cn.js";
import { useTimetable } from "@/store/TimetableContext.jsx";
import { Modal, Field, Select, Toggle } from "@/components/common/Modal.jsx";
import { Button, Badge } from "@/components/common/Button.jsx";
import { detectConflicts } from "@/utils/conflictDetection.js";

const TEACHING = SLOTS.filter((s) => s.kind !== "break");
const STEP_LABELS = [
  "Loading subjects",
  "Checking teacher availability",
  "Checking rooms & labs",
  "Applying constraints",
  "Optimizing schedule",
];

/** AI timetable generation wizard with a real progress sequence. */
export function GenerateModal() {
  const { ui, closeModal, openModal, generate, entries, data, conflicts, meta, setMeta } = useTimetable();
  const open = ui.modal === "generate";

  const [params, setParams] = useState(null);
  const [phase, setPhase] = useState("form"); // form | running | done
  const [steps, setSteps] = useState([]);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open) return;
    setPhase("form");
    setSteps([]);
    setResult(null);
    setParams({
      departmentId: meta.departmentId,
      courseId: meta.courseId,
      semester: meta.semester,
      division: meta.division,
      days: DAYS.filter((d) => !d.optional).map((d) => d.id),
      periodsPerDay: TEACHING.length,
      startTime: SLOTS[0].start,
      endTime: SLOTS[SLOTS.length - 1].end,
      breakMinutes: 15,
      subjectIds: data.subjects.filter((s) => (s.departmentId === meta.departmentId || s.departmentId === "maths" || s.departmentId === "hss")).map((s) => s.id),
      constraints: {
        keepLocked: true,
        respectAvailability: true,
        avoidBackToBack: true,
        labsAfterLunch: true,
        maxConsecutive: 4,
      },
    });
  }, [open, meta, data.subjects]);

  const totals = useMemo(() => {
    if (!params) return { hours: 0, teachers: 0, rooms: 0 };
    const subjects = data.subjects.filter((s) => params.subjectIds.includes(s.id));
    return {
      hours: subjects.reduce((n, s) => n + s.hoursPerWeek, 0),
      teachers: new Set(subjects.map((s) => s.teacherId)).size,
      rooms: data.rooms.filter((r) => r.available).length,
    };
  }, [params, data.rooms, data.subjects]);

  if (!open || !params) return null;

  const set = (patch) => setParams((prev) => ({ ...prev, ...patch }));
  const setConstraint = (key, value) => setParams((prev) => ({ ...prev, constraints: { ...prev.constraints, [key]: value } }));

  async function run() {
    setPhase("running");
    setSteps([{ label: STEP_LABELS[0], state: "running" }]);
    const outcome = await generate(
      { ...params, slotIds: TEACHING.slice(0, params.periodsPerDay).map((s) => s.id) },
      (progress) => {
        if (progress.done) return;
        setSteps((prev) => {
          const next = [...prev];
          next[progress.step] = { label: progress.label, state: "done" };
          return next;
        });
        if (progress.step + 1 < 5) {
          setSteps((prev) => [...prev.slice(0, progress.step + 1), { label: STEP_LABELS[progress.step + 1], state: "running" }]);
        }
      }
    );
    if (outcome) {
      setResult({
        count: outcome.entries.length,
        locked: outcome.entries.filter((e) => e.locked).length,
        unplaced: outcome.unplaced ?? [],
        conflicts: detectConflicts(outcome.entries, conflicts.lookups).length,
      });
      setPhase("done");
    }
  }

  return (
    <Modal
      open={open}
      onClose={phase === "running" ? undefined : closeModal}
      size="xl"
      icon={Sparkles}
      title="Generate timetable with AI"
      description="Define the week, then let the scheduler fill every unlocked period. Locked cells stay exactly where they are."
      footer={
        phase === "form" ? (
          <>
            <span className="mr-auto text-[11.5px] text-ink-400">
              {totals.hours} teaching hours · {totals.teachers} teachers · {totals.rooms} rooms available
            </span>
            <Button variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button variant="primary" icon={Wand2} onClick={run} disabled={!params.subjectIds.length}>
              Generate with AI
            </Button>
          </>
        ) : phase === "running" ? (
          <span className="mr-auto flex items-center gap-2 text-[12px] text-ink-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" /> Scheduling… do not close this dialog
          </span>
        ) : (
          <>
            <span className="mr-auto text-[11.5px] text-ink-400">Applied to the canvas — Ctrl+Z restores the previous week.</span>
            <Button variant="secondary" icon={Sparkles} onClick={run}>
              Regenerate
            </Button>
            <Button variant="primary" icon={Check} onClick={closeModal}>
              Open timetable
            </Button>
          </>
        )
      }
    >
      {phase !== "done" ? (
        <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
          {/* left: academic context */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-400">Academic context</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Department">
                <Select value={params.departmentId} onChange={(e) => set({ departmentId: e.target.value })}>
                  {DEPARTMENTS.map((dep) => (
                    <option key={dep.id} value={dep.id}>
                      {dep.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Course">
                <Select value={params.courseId} onChange={(e) => set({ courseId: e.target.value })}>
                  <option value="btech-cse">B.Tech Computer Engineering</option>
                  <option value="btech-it">B.Tech Information Technology</option>
                  <option value="mca">Master of Computer Applications</option>
                </Select>
              </Field>
              <Field label="Semester">
                <Select value={params.semester} onChange={(e) => set({ semester: Number(e.target.value), })}>
                  {SEMESTERS.map((sem) => (
                    <option key={sem.id} value={sem.id}>
                      {sem.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Division">
                <Select value={params.division} onChange={(e) => set({ division: e.target.value })}>
                  {DIVISIONS.map((div) => (
                    <option key={div.id} value={div.id}>
                      {div.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <h3 className="pt-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-400">Working days</h3>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((day) => {
                const active = params.days.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() =>
                      set({ days: active ? params.days.filter((d) => d !== day.id) : [...params.days, day.id] })
                    }
                    className={cn(
                      "h-8 rounded-md border px-2.5 text-[12px] font-semibold transition",
                      active ? "border-brand-500 bg-brand-50 text-brand-700" : "border-ink-200 bg-white text-ink-400 hover:border-ink-300"
                    )}
                  >
                    {day.short}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1">
              <Field label="Periods / day">
                <Select value={params.periodsPerDay} onChange={(e) => set({ periodsPerDay: Number(e.target.value) })}>
                  {TEACHING.map((slot, index) => (
                    <option key={slot.id} value={index + 1}>
                      {index + 1}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Working hours" hint="From the grid template">
                <Select value={`${params.startTime}-${params.endTime}`} disabled>
                  <option>{params.startTime} – {params.endTime}</option>
                </Select>
              </Field>
              <Field label="Break" hint="15 min tea · 45 min lunch">
                <Select value={params.breakMinutes} onChange={(e) => set({ breakMinutes: Number(e.target.value) })}>
                  {[10, 15, 20, 30].map((value) => (
                    <option key={value} value={value}>
                      {value} min tea
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <h3 className="pt-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-400">Subjects to schedule</h3>
            <div className="scroll-slim max-h-52 space-y-1 overflow-y-auto rounded-md border border-ink-200 p-1.5">
              {data.subjects.map((subject) => {
                const active = params.subjectIds.includes(subject.id);
                return (
                  <label
                    key={subject.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 transition",
                      active ? "bg-brand-50" : "hover:bg-ink-50"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() =>
                        set({ subjectIds: active ? params.subjectIds.filter((id) => id !== subject.id) : [...params.subjectIds, subject.id] })
                      }
                      className="h-3.5 w-3.5 accent-brand-600"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium text-ink-800">{subject.name}</span>
                      <span className="block truncate text-[11px] text-ink-400">
                        {subject.code} · {data.teachers.find((t) => t.id === subject.teacherId)?.name ?? "Unassigned"}
                      </span>
                    </span>
                    <Badge tone={active ? "brand" : "neutral"}>{subject.hoursPerWeek} h</Badge>
                  </label>
                );
              })}
            </div>
          </div>

          {/* right: constraints + progress */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-400">Constraints</h3>
            <div className="space-y-1.5">
              <Toggle
                checked={params.constraints.keepLocked}
                onChange={(value) => setConstraint("keepLocked", value)}
                label="Preserve locked cells"
                description={`${entries.filter((e) => e.locked).length} locked session(s) will never be moved.`}
              />
              <Toggle
                checked={params.constraints.respectAvailability}
                onChange={(value) => setConstraint("respectAvailability", value)}
                label="Respect teacher availability"
                description="Skips periods a teacher marked as unavailable."
              />
              <Toggle
                checked={params.constraints.avoidBackToBack}
                onChange={(value) => setConstraint("avoidBackToBack", value)}
                label="Avoid same subject back-to-back"
                description="Spread a subject across the week instead of stacking it."
              />
              <Toggle
                checked={params.constraints.labsAfterLunch}
                onChange={(value) => setConstraint("labsAfterLunch", value)}
                label="Prefer labs after lunch"
                description="Two-period practicals land in afternoon slots."
              />
            </div>

            <div className="rounded-md border border-ink-200 bg-ink-50/60 p-3">
              <p className="text-[11.5px] font-semibold text-ink-700">Resources</p>
              <ul className="mt-1.5 space-y-1 text-[11.5px] text-ink-500">
                <li className="flex justify-between">
                  <span>Teachers</span>
                  <span className="font-mono text-ink-800">{totals.teachers}</span>
                </li>
                <li className="flex justify-between">
                  <span>Rooms & labs</span>
                  <span className="font-mono text-ink-800">{totals.rooms}</span>
                </li>
                <li className="flex justify-between">
                  <span>Capacity per week</span>
                  <span className="font-mono text-ink-800">{params.days.length * params.periodsPerDay} periods</span>
                </li>
              </ul>
            </div>

            {phase === "running" && (
              <div className="rounded-md border border-brand-200 bg-white p-3">
                <p className="flex items-center gap-2 text-[12.5px] font-semibold text-brand-700">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating timetable…
                </p>
                <ol className="mt-2 space-y-1.5">
                  {STEP_LABELS.map((label, index) => {
                    const step = steps[index];
                    const done = step?.state === "done";
                    const running = step?.state === "running";
                    return (
                      <li key={label} className="flex items-center gap-2 text-[12px]">
                        <span
                          className={cn(
                            "flex h-4 w-4 items-center justify-center rounded-full ring-1",
                            done ? "bg-ok-500 text-white ring-ok-500" : running ? "bg-white ring-brand-400" : "bg-white ring-ink-200"
                          )}
                        >
                          {done ? <Check className="h-2.5 w-2.5" strokeWidth={3.4} /> : running ? <Loader2 className="h-2.5 w-2.5 animate-spin text-brand-600" /> : null}
                        </span>
                        <span className={cn(done ? "text-ink-700" : running ? "font-medium text-brand-700" : "text-ink-400")}>{label}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {phase === "form" && !data.subjects.length && (
              <div className="flex items-start gap-1.5 rounded-md border border-warn-500/25 bg-warn-50 p-2.5 text-[11.5px] leading-snug text-warn-600">
                <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2.2} />
                <span className="flex-1">No subjects yet. Add subjects (and teachers / rooms) first, then come back here.</span>
                <Button size="xs" variant="primary" onClick={() => openModal("subject")}>
                  Add subject
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="animate-slide-up py-2 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ok-50 text-ok-500 ring-1 ring-ok-500/25">
            <Check className="h-6 w-6" strokeWidth={2.6} />
          </span>
          <h3 className="mt-3 font-display text-[18px] font-bold text-ink-900">Timetable generated successfully</h3>
          <p className="mt-1 text-[13px] text-ink-500">
            {result.count} sessions placed across {params.days.length} working days.
          </p>
          <div className="mx-auto mt-4 grid max-w-lg grid-cols-3 gap-2">
            <SummaryTile label="Sessions" value={result.count} tone="brand" />
            <SummaryTile label="Locked kept" value={result.locked ?? 0} tone="info" />
            <SummaryTile label="Conflicts" value={result.conflicts} tone={result.conflicts ? "danger" : "ok"} />
          </div>
          {result.unplaced?.length > 0 && (
            <p className="mx-auto mt-3 max-w-lg rounded-md border border-warn-500/30 bg-warn-50 p-2.5 text-left text-[11.5px] text-warn-600">
              Not enough capacity for: {result.unplaced.map((u) => `${u.id} (${u.hours}h)`).join(", ")}. Add a working day
              or reduce hours per week.
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Button
              variant="secondary"
              icon={Lock}
              onClick={() => {
                setMeta({ semester: params.semester, division: params.division, departmentId: params.departmentId, courseId: params.courseId });
                closeModal();
              }}
            >
              Keep & edit manually
            </Button>
            <Button variant="primary" icon={ChevronRight} onClick={closeModal}>
              Review on canvas
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function SummaryTile({ label, value, tone }) {
  const tones = {
    brand: "border-brand-200 bg-brand-50 text-brand-700",
    info: "border-info-500/25 bg-info-50 text-info-600",
    ok: "border-ok-500/25 bg-ok-50 text-ok-600",
    danger: "border-danger-500/25 bg-danger-50 text-danger-600",
  };
  return (
    <div className={cn("rounded-md border p-2.5", tones[tone])}>
      <p className="font-mono text-[20px] font-bold leading-none">{value}</p>
      <p className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.06em] opacity-75">{label}</p>
    </div>
  );
}


