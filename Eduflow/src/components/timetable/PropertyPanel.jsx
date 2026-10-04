import { AlertTriangle, Copy, Lock, LockOpen, Sparkles, Trash2, X, Layers, Gauge } from "lucide-react";
import { CATEGORY_COLORS, DAYS, SLOTS, CLASS_TYPES } from "@/data/mockData.js";
import { cn } from "@/utils/cn.js";
import { useTimetable } from "@/store/TimetableContext.jsx";
import { Button } from "@/components/common/Button.jsx";
import { Field, Select, inputClass } from "@/components/common/Modal.jsx";
import { slotLabel, dayLabel, format12h } from "@/utils/timetableUtils.js";
import { categoryHex } from "@/components/timetable/TimetableCard.jsx";

const TEACHING = SLOTS.filter((s) => s.kind !== "break");

/** Slide-over inspector for the selected class(es). */
export function PropertyPanel({ onClose }) {
  const {
    entries,
    selection,
    updateEntry,
    deleteEntries,
    duplicateEntry,
    toggleLock,
    conflicts,
    focusEntry,
    runPrompt,
    patchUi,
    summary,
  } = useTimetable();

  const selected = entries.filter((e) => selection.entryIds.includes(e.id));

  if (!selected.length) {
    return (
      <PanelShell title="Nothing selected" subtitle="Click a class card to inspect and edit it" onClose={onClose} icon={Layers}>
        <div className="space-y-4 p-3">
          <Stat label="Scheduled classes" value={summary.classes} tone="brand" />
          <Stat label="Locked cells" value={summary.locked} tone="info" hint="Ignored by AI & drag" />
          <Stat label="Free periods" value={summary.freePeriods} tone="neutral" />
          <div>
            <div className="mb-1 flex items-center justify-between text-[11.5px] font-medium text-ink-500">
              <span>Grid utilisation</span>
              <span className="font-mono text-ink-800">{summary.utilization}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
              <div className="h-full rounded-full bg-brand-500 transition-all duration-500" style={{ width: `${summary.utilization}%` }} />
            </div>
          </div>
          <div className="rounded-md border border-ink-200 bg-ink-50/60 p-3">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-800">
              <Gauge className="h-3.5 w-3.5 text-brand-600" strokeWidth={2.2} /> Tips
            </p>
            <ul className="mt-1.5 space-y-1 text-[11.5px] leading-snug text-ink-500">
              <li>• Drag a card to any empty period — conflicts glow red before you drop.</li>
              <li>• Double-click a card to edit it, right-click for the full menu.</li>
              <li>• Lock a cell and the AI will route around it.</li>
            </ul>
          </div>
        </div>
      </PanelShell>
    );
  }

  if (selected.length > 1) {
    return (
      <PanelShell
        title={`${selected.length} classes selected`}
        subtitle="Bulk actions apply to the whole selection"
        onClose={onClose}
        icon={Layers}
      >
        <div className="space-y-2 p-3">
          <ul className="scroll-slim max-h-52 space-y-1 overflow-y-auto">
            {selected.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => focusEntry(entry.id)}
                  className="flex w-full items-center gap-2 rounded border border-ink-100 bg-white px-2 py-1.5 text-left transition hover:border-brand-200 hover:bg-brand-50/40"
                >
                  <span className="h-6 w-1 rounded-full" style={{ background: categoryHex(entry.color) }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium text-ink-800">
                      {entry.label || conflicts.lookups.subjectById[entry.subjectId]?.short || entry.subjectId || "Free period"}
                    </span>
                    <span className="block truncate text-[11px] text-ink-400">
                      {dayLabel(entry.day, "short")} · {slotLabel(entry.slot)}
                    </span>
                  </span>
                  {entry.locked && <Lock className="h-3 w-3 text-ink-400" />}
                </button>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" icon={Lock} onClick={() => toggleLock(selected.map((e) => e.id), true)}>
              Lock selected
            </Button>
            <Button size="sm" icon={LockOpen} onClick={() => toggleLock(selected.map((e) => e.id), false)}>
              Unlock
            </Button>
            <Button size="sm" icon={Sparkles} variant="subtle" onClick={() => { patchUi({ aiOpen: true }); runPrompt("Explain the current conflicts"); }}>
              Ask AI
            </Button>
            <Button size="sm" variant="danger" icon={Trash2} onClick={() => deleteEntries(selected.map((e) => e.id))}>
              Delete
            </Button>
          </div>
        </div>
      </PanelShell>
    );
  }

  const entry = selected[0];
  const entryConflicts = conflicts.byEntry.get(entry.id) ?? [];
  const set = (patch, label) => updateEntry(entry.id, patch, label);

  return (
    <PanelShell title="Class properties" subtitle={`${dayLabel(entry.day)} · ${slotLabel(entry.slot)}`} onClose={onClose}>
      <div className="space-y-3 p-3">
        {entryConflicts.length > 0 && (
          <div className="rounded-md border border-danger-500/30 bg-danger-50 p-2.5">
            {entryConflicts.map((conflict) => (
              <p key={conflict.id} className="flex gap-1.5 text-[11.5px] leading-snug text-danger-600">
                <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2.2} />
                <span>
                  <strong className="font-semibold">{conflict.title}.</strong> {conflict.message}
                </span>
              </p>
            ))}
            <button
              type="button"
              onClick={() => { patchUi({ aiOpen: true, rightPanel: "conflicts" }); }}
              className="mt-1.5 text-[11.5px] font-semibold text-danger-600 underline underline-offset-2 hover:text-danger-500"
            >
              Open conflict panel →
            </button>
          </div>
        )}

        <Field label="Subject">
          <Select value={entry.subjectId ?? ""} onChange={(e) => set({ subjectId: e.target.value }, "Change subject")}>
            {conflicts.lookups.subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name} ({subject.code})
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Teacher">
          <Select value={entry.teacherId ?? ""} onChange={(e) => set({ teacherId: e.target.value }, "Change teacher")}>
            {conflicts.lookups.teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Room">
          <Select value={entry.roomId ?? ""} onChange={(e) => set({ roomId: e.target.value }, "Change room")}>
            {conflicts.lookups.rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name} · {room.type} ({room.capacity})
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Day">
            <Select value={entry.day} onChange={(e) => set({ day: e.target.value }, "Change day")}>
              {DAYS.map((day) => (
                <option key={day.id} value={day.id}>
                  {day.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Start">
            <Select value={entry.slot} onChange={(e) => set({ slot: e.target.value }, "Change period")}>
              {TEACHING.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {slot.start}–{slot.end}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Class type">
            <Select value={entry.type} onChange={(e) => set({ type: e.target.value }, "Change type")}>
              {CLASS_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Duration" hint={`${entry.span || 1} × 60 min`}>
            <Select value={entry.span || 1} onChange={(e) => set({ span: Number(e.target.value) }, "Change duration")}>
              <option value={1}>1 hour</option>
              <option value={2}>2 hours (lab)</option>
              <option value={3}>3 hours</option>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Field label="Semester">
            <Select value={entry.semester} onChange={(e) => set({ semester: Number(e.target.value) }, "Change semester")}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <option key={sem} value={sem}>
                  {sem}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Division">
            <Select value={entry.division} onChange={(e) => set({ division: e.target.value }, "Change division")}>
              {["A", "B"].map((div) => (
                <option key={div} value={div}>
                  {div}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Dept">
            <Select
              value={entry.departmentId}
              onChange={(e) => set({ departmentId: e.target.value }, "Change department")}
            >
              {conflicts.lookups.departments.map((dep) => (
                <option key={dep.id} value={dep.id}>
                  {dep.code}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Colour / category">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_COLORS.map((color) => (
              <button
                key={color.id}
                type="button"
                onClick={() => set({ color: color.id }, "Recolour class")}
                className={cn(
                  "h-6 w-6 rounded border-2 transition",
                  entry.color === color.id ? "border-ink-900 scale-110" : "border-white ring-1 ring-ink-200 hover:scale-105"
                )}
                style={{ background: color.hex }}
                aria-label={color.label}
                title={color.label}
              />
            ))}
          </div>
        </Field>

        <Field label="Note">
          <textarea
            value={entry.note ?? ""}
            onChange={(e) => set({ note: e.target.value }, "Edit note")}
            rows={2}
            placeholder="Guest lecture, batch split, room change…"
            className={cn(inputClass, "resize-none text-[12.5px]")}
          />
        </Field>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-md border border-ink-100 bg-ink-50/60 p-2.5 text-[11.5px]">
          <Row label="Starts" value={format12h(SLOTS.find((s) => s.id === entry.slot)?.start)} />
          <Row label="Ends" value={format12h(TEACHING[TEACHING.findIndex((s) => s.id === entry.slot) + (entry.span || 1) - 1]?.end)} />
          <Row label="Source" value={entry.source === "ai" ? "AI generated" : "Manual"} />
          <Row label="Status" value={entry.locked ? "Locked" : "Editable"} />
        </dl>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button size="sm" icon={entry.locked ? LockOpen : Lock} onClick={() => toggleLock([entry.id])}>
            {entry.locked ? "Unlock" : "Lock class"}
          </Button>
          <Button size="sm" icon={Copy} onClick={() => duplicateEntry(entry.id)}>
            Duplicate
          </Button>
          <Button size="sm" variant="danger" icon={Trash2} className="col-span-2" onClick={() => deleteEntries([entry.id])}>
            Delete class
          </Button>
        </div>
      </div>
    </PanelShell>
  );
}

function PanelShell({ title, subtitle, onClose, icon: Icon, children }) {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-ink-200 bg-white shadow-panel">
      <header className="flex items-start gap-2 border-b border-ink-100 bg-ink-50/70 px-3 py-2.5">
        {Icon && (
          <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-white text-brand-600 ring-1 ring-ink-200">
            <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[13px] font-semibold uppercase tracking-[0.04em] text-ink-800">{title}</h2>
          {subtitle && <p className="truncate text-[11.5px] text-ink-500">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
          aria-label="Close panel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>
      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">{children}</div>
    </section>
  );
}

function Row({ label, value }) {
  return (
    <>
      <dt className="text-ink-400">{label}</dt>
      <dd className="text-right font-medium text-ink-700">{value ?? "—"}</dd>
    </>
  );
}

function Stat({ label, value, tone = "neutral", hint }) {
  const tones = {
    brand: "text-brand-600 bg-brand-50 ring-brand-100",
    info: "text-info-600 bg-info-50 ring-info-500/20",
    neutral: "text-ink-700 bg-ink-50 ring-ink-200",
  };
  return (
    <div className={cn("flex items-center justify-between rounded-md px-3 py-2 ring-1", tones[tone])}>
      <span>
        <span className="block text-[12px] font-medium">{label}</span>
        {hint && <span className="block text-[10.5px] opacity-70">{hint}</span>}
      </span>
      <span className="font-mono text-[18px] font-semibold">{value}</span>
    </div>
  );
}
