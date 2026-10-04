import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarPlus, Lock, Plus, Save } from "lucide-react";
import { CATEGORY_COLORS, CLASS_TYPES, DAYS, SLOTS } from "@/data/mockData.js";
import { cn } from "@/utils/cn.js";
import { useTimetable } from "@/store/TimetableContext.jsx";
import { Modal, Field, Select, TextInput, inputClass } from "@/components/common/Modal.jsx";
import { Button } from "@/components/common/Button.jsx";
import { createEntry, slotLabel, dayLabel } from "@/utils/timetableUtils.js";
import { detectConflicts } from "@/utils/conflictDetection.js";

const TEACHING = SLOTS.filter((s) => s.kind !== "break");

/** Add / edit a single class — the manual half of the hybrid workflow. */
export function AddClassModal() {
  const { ui, closeModal, entries, addEntry, updateEntry, conflicts, meta, saveRecord } = useTimetable();
  const open = ui.modal === "add";
  const payload = ui.modalPayload ?? {};
  const editing = payload.entry ?? null;

  const [form, setForm] = useState({});
  const [lockAfter, setLockAfter] = useState(false);
  const [newSubject, setNewSubject] = useState(null); // { name, code, hoursPerWeek } while the inline form is open

  function createSubjectInline() {
    if (!newSubject?.name?.trim() || !newSubject?.code?.trim()) return;
    const code = newSubject.code.trim().toUpperCase();
    const record = {
      id: code.replace(/\s+/g, "-"),
      name: newSubject.name.trim(),
      code,
      short: newSubject.name.trim().split(" ").slice(0, 2).join(" "),
      teacherId: form.teacherId || null,
      hoursPerWeek: Number(newSubject.hoursPerWeek) || 4,
      type: "Theory",
      color: form.color || "teal",
      credits: 3,
      departmentId: form.departmentId || "cse",
      semester: form.semester || 3,
    };
    saveRecord("subjects", record);
    setForm((prev) => ({ ...prev, subjectId: record.id, label: "" }));
    setNewSubject(null);
  }

  useEffect(() => {
    if (!open) return;
    setNewSubject(null);
    setForm(
      editing
        ? { ...editing }
        : {
            subjectId: conflicts.lookups.subjects[0]?.id ?? "",
            teacherId: conflicts.lookups.subjects[0]?.teacherId ?? "",
            roomId: conflicts.lookups.rooms[0]?.id ?? "",
            day: payload.day ?? "mon",
            slot: payload.slot ?? "p1",
            span: 1,
            type: payload.type === "Break" ? "Break" : "Lecture",
            color: conflicts.lookups.subjects[0]?.color ?? "teal",
            departmentId: meta.departmentId,
            semester: meta.semester,
            division: meta.division,
            courseId: meta.courseId,
            label: payload.type === "Break" ? "Break" : "",
            note: "",
            locked: false,
          }
    );
    setLockAfter(false);
  }, [open, editing, payload.day, payload.slot, payload.type, meta, conflicts.lookups]);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  /** Live preview: what would this booking break? */
  const preview = useMemo(() => {
    if (!open || !form.day || !form.slot) return [];
    const candidate = createEntry({ ...form, id: "preview" });
    const others = entries.filter((e) => e.id !== editing?.id);
    return detectConflicts([...others, candidate], conflicts.lookups).filter((c) => c.entryIds.includes("preview"));
  }, [open, form, entries, editing, conflicts.lookups]);

  if (!open) return null;

  const isBreak = form.type === "Break";

  function submit() {
    if (editing) {
      updateEntry(editing.id, { ...form }, "Edit class");
      closeModal();
      return;
    }
    addEntry({ ...form, locked: lockAfter });
    closeModal();
  }

  return (
    <Modal
      open={open}
      onClose={closeModal}
      size="lg"
      icon={CalendarPlus}
      title={editing ? "Edit class" : "Add class"}
      description={
        editing
          ? `${dayLabel(editing.day)} · ${slotLabel(editing.slot)} — changes apply to the canvas immediately`
          : "Place a session on the canvas. Conflicts are checked while you type."
      }
      footer={
        <>
          <span className="mr-auto flex items-center gap-1.5 text-[11.5px] text-ink-400">
            {preview.length > 0 ? (
              <>
                <AlertTriangle className="h-3.5 w-3.5 text-danger-500" strokeWidth={2.3} />
                <span className="font-medium text-danger-600">{preview.length} conflict(s) — you can still save</span>
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5 text-ok-500" strokeWidth={2.3} />
                <span className="text-ok-600">Slot is free</span>
              </>
            )}
          </span>
          {!editing && (
            <label className="mr-auto flex items-center gap-1.5 text-[11.5px] text-ink-500">
              <input type="checkbox" checked={lockAfter} onChange={(e) => setLockAfter(e.target.checked)} className="h-3.5 w-3.5 accent-brand-600" />
              Lock after adding
            </label>
          )}
          <Button variant="ghost" onClick={closeModal}>
            Cancel
          </Button>
          <Button variant="primary" icon={Save} onClick={submit} disabled={!form.subjectId && !form.label}>
            {editing ? "Save changes" : "Add to timetable"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {preview.length > 0 && (
          <div className="rounded-md border border-danger-500/30 bg-danger-50 p-2.5">
            <p className="flex items-center gap-1.5 text-[12px] font-bold text-danger-600">
              <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.4} /> Scheduling conflict
            </p>
            <ul className="mt-1 space-y-0.5 pl-5 text-[11.5px] leading-snug text-danger-600">
              {preview.flatMap((c) => c.reasons).map((reason, index) => (
                <li key={index} className="list-disc">
                  {reason.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!conflicts.lookups.subjects.length && !newSubject && (
          <p className="flex items-center justify-between gap-2 rounded-md border border-ink-200 bg-ink-50 p-2.5 text-[11.5px] text-ink-500">
            <span>No subjects added yet — create one here or use a custom label.</span>
            <Button size="xs" variant="primary" icon={Plus} onClick={() => setNewSubject({ name: "", code: "", hoursPerWeek: 4 })}>
              New subject
            </Button>
          </p>
        )}
        {newSubject && (
          <div className="rounded-md border border-brand-200 bg-brand-50/50 p-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.06em] text-brand-700">New subject</p>
            <div className="grid gap-2 sm:grid-cols-[1.6fr_1fr_0.8fr]">
              <TextInput
                autoFocus
                placeholder="Subject name"
                value={newSubject.name}
                onChange={(e) => setNewSubject((p) => ({ ...p, name: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), createSubjectInline())}
              />
              <TextInput
                placeholder="Code (CS201)"
                value={newSubject.code}
                onChange={(e) => setNewSubject((p) => ({ ...p, code: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), createSubjectInline())}
              />
              <TextInput
                type="number"
                min={1}
                placeholder="Hrs/week"
                value={newSubject.hoursPerWeek}
                onChange={(e) => setNewSubject((p) => ({ ...p, hoursPerWeek: e.target.value }))}
              />
            </div>
            <div className="mt-2 flex justify-end gap-1.5">
              <Button size="xs" variant="ghost" onClick={() => setNewSubject(null)}>
                Cancel
              </Button>
              <Button size="xs" variant="primary" icon={Plus} onClick={createSubjectInline} disabled={!newSubject.name.trim() || !newSubject.code.trim()}>
                Create & select
              </Button>
            </div>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Subject" required className="sm:col-span-2">
            <Select
              value={form.subjectId ?? ""}
              onChange={(e) => {
                const subject = conflicts.lookups.subjectById[e.target.value];
                set({
                  subjectId: e.target.value,
                  teacherId: subject?.teacherId ?? form.teacherId,
                  color: subject?.color ?? form.color,
                  departmentId: subject?.departmentId ?? form.departmentId,
                  type: subject?.type === "Theory" ? "Lecture" : subject?.type ?? form.type,
                  span: subject?.type === "Practical" ? 2 : form.span,
                  label: "",
                });
              }}
            >
              <option value="">— none (use custom label) —</option>
              {conflicts.lookups.subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} — {subject.code}
                </option>
              ))}
            </Select>
            {!newSubject && conflicts.lookups.subjects.length > 0 && (
              <button
                type="button"
                onClick={() => setNewSubject({ name: "", code: "", hoursPerWeek: 4 })}
                className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand-600 hover:text-brand-700"
              >
                <Plus className="h-3 w-3" strokeWidth={2.6} /> New subject
              </button>
            )}
          </Field>

          <Field label="Teacher">
            <Select value={form.teacherId ?? ""} onChange={(e) => set({ teacherId: e.target.value || null })}>
              <option value="">— none —</option>
              {conflicts.lookups.teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Room">
            <Select value={form.roomId ?? ""} onChange={(e) => set({ roomId: e.target.value || null })}>
              <option value="">— none —</option>
              {conflicts.lookups.rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} — {room.type} ({room.capacity})
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Department">
            <Select value={form.departmentId ?? "cse"} onChange={(e) => set({ departmentId: e.target.value })}>
              {conflicts.lookups.departments.map((dep) => (
                <option key={dep.id} value={dep.id}>
                  {dep.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Course">
            <Select value={form.courseId ?? "btech-cse"} onChange={(e) => set({ courseId: e.target.value })}>
              <option value="btech-cse">B.Tech Computer Engineering</option>
              <option value="btech-it">B.Tech Information Technology</option>
              <option value="btech-ece">B.Tech Electronics & Communication</option>
              <option value="mca">Master of Computer Applications</option>
            </Select>
          </Field>

          <Field label="Semester">
            <Select value={form.semester ?? 3} onChange={(e) => set({ semester: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <option key={sem} value={sem}>
                  Semester {sem}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Division">
            <Select value={form.division ?? "A"} onChange={(e) => set({ division: e.target.value })}>
              <option value="A">Division A</option>
              <option value="B">Division B</option>
            </Select>
          </Field>

          <Field label="Day">
            <Select value={form.day ?? "mon"} onChange={(e) => set({ day: e.target.value })}>
              {DAYS.map((day) => (
                <option key={day.id} value={day.id}>
                  {day.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Start time" hint={form.slot ? `${slotLabel(form.slot)} · ${TEACHING.findIndex((s) => s.id === form.slot) + 1} periods` : undefined}>
            <Select value={form.slot ?? "p1"} onChange={(e) => set({ slot: e.target.value })}>
              {TEACHING.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {slot.label} · {slot.start}–{slot.end}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="End time" hint="Duration in periods">
            <Select value={form.span ?? 1} onChange={(e) => set({ span: Number(e.target.value) })}>
              <option value={1}>1 period (60 min)</option>
              <option value={2}>2 periods (120 min)</option>
              <option value={3}>3 periods (180 min)</option>
            </Select>
          </Field>

          <Field label="Class type">
            <Select value={form.type ?? "Lecture"} onChange={(e) => set({ type: e.target.value })}>
              {CLASS_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Custom label" hint="Overrides the subject name on the card (breaks, exams, guest lectures)">
            <TextInput value={form.label ?? ""} onChange={(e) => set({ label: e.target.value })} placeholder={isBreak ? "Tea Break" : "e.g. Guest Lecture"} />
          </Field>

          <Field label="Colour / category" className="sm:col-span-2">
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => set({ color: color.id })}
                  className={cn(
                    "flex h-8 items-center gap-1.5 rounded-md border px-2 text-[11.5px] font-medium transition",
                    form.color === color.id ? "border-ink-900 bg-ink-50 text-ink-900" : "border-ink-200 text-ink-500 hover:border-ink-300"
                  )}
                >
                  <span className="h-3.5 w-3.5 rounded" style={{ background: color.hex }} />
                  {color.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Note" className="sm:col-span-2">
            <textarea
              value={form.note ?? ""}
              onChange={(e) => set({ note: e.target.value })}
              rows={2}
              placeholder="Batch split, guest lecturer, projector needed…"
              className={cn(inputClass, "resize-none text-[12.5px]")}
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
