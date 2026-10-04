import { useState } from "react";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  Database,
  Keyboard,
  Network,
  RefreshCw,
  Save,
  Settings as SettingsIcon,
  Sparkles,
  TriangleAlert,
  Trash2,
} from "lucide-react";
import { cn } from "@/utils/cn.js";
import { useNavigate } from "react-router-dom";
import { useTimetable } from "@/store/TimetableContext.jsx";
import { useToast } from "@/components/common/Toast.jsx";
import { PageShell } from "@/components/layout/PageShell.jsx";
import { Button, Badge } from "@/components/common/Button.jsx";
import { Field, Select, TextInput, Toggle } from "@/components/common/Modal.jsx";
import { ACADEMIC_YEARS, DAYS, DEPARTMENTS, DIVISIONS, SLOTS, SEMESTERS } from "@/data/mockData.js";
import { AI_ARCHITECTURE_STEPS } from "@/services/aiService.js";
import { API_URL, isBackendOnline } from "@/services/timetableService.js";

const RULES = [
  { id: "teacher", label: "Teacher conflicts", detail: "One teacher cannot run two sessions in the same period." },
  { id: "room", label: "Room conflicts", detail: "A room can hold only one booking per period." },
  { id: "lab", label: "Lab conflicts", detail: "Practicals need a lab that is not already occupied." },
  { id: "division", label: "Class / division conflicts", detail: "A division attends exactly one session at a time." },
  { id: "availability", label: "Availability conflicts", detail: "Respect teacher unavailability and closed rooms." },
];

const PIPELINE = [
  { label: "React frontend", detail: "This app", status: "connected", icon: CircleDashed },
  { label: "FastAPI backend", detail: "backend/main.py", status: isBackendOnline() ? "connected" : "offline", icon: Network },
  { label: "Storage", detail: "backend/data.json", status: isBackendOnline() ? "connected" : "offline", icon: Database },
  { label: "Gemini", detail: "Optional, set GEMINI_API_KEY on the server", status: "optional", icon: Sparkles },
];

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings, setSettings, meta, setMeta, mode, setMode, patchUi, replaceEntries, clearTimetable, entries, conflicts } = useTimetable();
  const [institution, setInstitution] = useState({ name: "", coordinator: "", baseUrl: API_URL });

  const rules = settings.conflictRules ?? { teacher: true, room: true, lab: true, division: true, availability: true };

  return (
    <PageShell
      eyebrow="Workspace"
      title="Settings"
      subtitle="Institution profile, working-hours template, assistant behaviour and the conflict rules the engine applies."
      actions={
        <>
          <Button variant="secondary" icon={Keyboard} onClick={() => patchUi({ shortcuts: true })}>
            Keyboard shortcuts
          </Button>
          <Button
            variant="primary"
            icon={Save}
            onClick={() => toast("Settings saved", { tone: "success" })}
          >
            Save changes
          </Button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-4">
          <Card icon={Building2} title="Institution profile" subtitle="Appears on exports, print headers and shared links">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Institution" className="sm:col-span-2">
                <TextInput placeholder="College name" value={institution.name} onChange={(e) => setInstitution((p) => ({ ...p, name: e.target.value }))} />
              </Field>
              <Field label="Timetable coordinator">
                <TextInput placeholder="Your name" value={institution.coordinator} onChange={(e) => setInstitution((p) => ({ ...p, coordinator: e.target.value }))} />
              </Field>
              <Field label="Academic year">
                <Select value={meta.academicYear} onChange={(e) => setMeta({ academicYear: e.target.value })}>
                  {ACADEMIC_YEARS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Default department">
                <Select value={meta.departmentId} onChange={(e) => setMeta({ departmentId: e.target.value })}>
                  {DEPARTMENTS.map((dep) => (
                    <option key={dep.id} value={dep.id}>
                      {dep.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Default semester">
                <Select value={meta.semester} onChange={(e) => setMeta({ semester: Number(e.target.value) })}>
                  {SEMESTERS.map((sem) => (
                    <option key={sem.id} value={sem.id}>
                      {sem.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Default division">
                <Select value={meta.division} onChange={(e) => setMeta({ division: e.target.value })}>
                  {DIVISIONS.map((div) => (
                    <option key={div.id} value={div.id}>
                      {div.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Working week">
                <Select value={meta.week} onChange={(e) => setMeta({ week: e.target.value })}>
                  {["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6"].map((week) => (
                    <option key={week} value={week}>
                      {week}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Card>

          <Card icon={CalendarDays} title="Working days & grid" subtitle="Which days the canvas shows and how dense the grid feels">
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((day) => {
                const active = settings.visibleDays.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() =>
                      setSettings({
                        visibleDays: active ? settings.visibleDays.filter((d) => d !== day.id) : [...settings.visibleDays, day.id],
                      })
                    }
                    className={cn(
                      "h-9 rounded-md border px-3 text-[12.5px] font-semibold transition",
                      active ? "border-brand-500 bg-brand-50 text-brand-700" : "border-ink-200 bg-white text-ink-400 hover:border-ink-300"
                    )}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Field label="Default view">
                <Select value={settings.view} onChange={(e) => setSettings({ view: e.target.value })}>
                  <option value="week">Week view</option>
                  <option value="day">Day view</option>
                </Select>
              </Field>
              <Field label="Row height">
                <Select value={settings.rowHeight} onChange={(e) => setSettings({ rowHeight: e.target.value })}>
                  <option value="comfortable">Comfortable</option>
                  <option value="compact">Compact</option>
                </Select>
              </Field>
              <Field label="Zoom">
                <Select value={settings.zoom} onChange={(e) => setSettings({ zoom: Number(e.target.value) })}>
                  {[70, 85, 100, 115, 130, 150].map((value) => (
                    <option key={value} value={value}>
                      {value}%
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="mt-3 rounded-md border border-ink-200 bg-ink-50/60 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-ink-400">Period template</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {SLOTS.map((slot) => (
                  <li
                    key={slot.id}
                    className={cn(
                      "rounded border px-2 py-1 font-mono text-[11px]",
                      slot.kind === "break" ? "border-warn-500/25 bg-warn-50 text-warn-600" : "border-ink-200 bg-white text-ink-600"
                    )}
                  >
                    {slot.start}–{slot.end} {slot.kind === "break" ? `· ${slot.label}` : ""}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11.5px] text-ink-400">
                To change the periods edit SLOTS in src/data/mockData.js and backend/scheduler.py.
              </p>
            </div>
          </Card>

          <Card icon={TriangleAlert} title="Conflict rules" subtitle={`${conflicts.total} conflict(s) detected under the current rule set`}>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {RULES.map((rule) => (
                <Toggle
                  key={rule.id}
                  checked={rules[rule.id] !== false}
                  onChange={(value) => setSettings({ conflictRules: { ...rules, [rule.id]: value } })}
                  label={rule.label}
                  description={rule.detail}
                />
              ))}
              <Toggle
                checked={settings.showConflicts}
                onChange={(value) => setSettings({ showConflicts: value })}
                label="Highlight on canvas"
                description="Paint conflicting cells red while editing."
              />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card icon={Sparkles} title="AI assistant" subtitle="How much initiative the assistant is allowed to take">
            <div className="space-y-1.5">
              <Toggle checked={mode === "hybrid"} onChange={() => setMode("hybrid")} label="Hybrid mode (recommended)" description="AI drafts and re-optimizes; you edit and lock." />
              <Toggle checked={mode === "manual"} onChange={() => setMode("manual")} label="Manual mode" description="The assistant only answers questions, never edits." />
              <Toggle checked={mode === "ai"} onChange={() => setMode("ai")} label="AI-first mode" description="Generation fills every unlocked period by default." />
            </div>
            <div className="mt-3 space-y-1.5">
              <Toggle checked={settings.aiOpenPanel !== false} onChange={(value) => setSettings({ aiOpenPanel: value }) || patchUi({ aiOpen: value })} label="Keep assistant panel docked" description="Pinned to the right of the canvas." />
              <Toggle checked={settings.respectLocked !== false} onChange={(value) => setSettings({ respectLocked: value })} label="Always respect locked cells" description="Locked cells are hard constraints for every AI action." />
              <Toggle checked={settings.confirmMoves !== false} onChange={(value) => setSettings({ confirmMoves: value })} label="Ask before conflicting moves" description="Show the “move anyway?” dialog on drag & drop." />
            </div>
          </Card>

          <Card icon={Network} title="Backend" subtitle="Connection status">
            <ul className="space-y-2">
              {PIPELINE.map((item) => (
                <li key={item.label} className="flex items-start gap-2.5 rounded-md border border-ink-200 bg-white p-2.5">
                  <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded", item.status === "connected" ? "bg-ok-50 text-ok-600" : "bg-ink-100 text-ink-500")}>
                    {item.status === "connected" ? <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.2} /> : <item.icon className="h-3.5 w-3.5" strokeWidth={2.2} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-semibold text-ink-900">{item.label}</span>
                    <span className="block text-[11.5px] leading-snug text-ink-500">{item.detail}</span>
                  </span>
                  <Badge tone={item.status === "connected" ? "ok" : item.status === "optional" ? "neutral" : "warn"}>
                    {item.status === "connected" ? "Online" : item.status === "optional" ? "Optional" : "Offline"}
                  </Badge>
                </li>
              ))}
            </ul>
            <Field label="API base URL" hint="Set VITE_API_URL in .env to change it" className="mt-3">
              <TextInput value={institution.baseUrl} onChange={(e) => setInstitution((p) => ({ ...p, baseUrl: e.target.value }))} className="font-mono text-[12px]" />
            </Field>
            <div className="mt-3 rounded-md border border-ink-200 bg-ink-50/60 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-ink-400">Request pipeline</p>
              <ol className="mt-2 space-y-1">
                {AI_ARCHITECTURE_STEPS.map((step, index) => (
                  <li key={step.step} className="flex items-center gap-2 text-[11.5px] text-ink-600">
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-ink-900 font-mono text-[9px] font-bold text-white">{index + 1}</span>
                    {step.step}
                  </li>
                ))}
              </ol>
            </div>
          </Card>

          <Card icon={RefreshCw} title="Timetable data" subtitle="Clear the current week">
            <div className="flex flex-wrap gap-2">
              <Button variant="danger" icon={Trash2} onClick={clearTimetable}>
                Clear timetable
              </Button>
              <Button variant="ghost" onClick={() => navigate("/editor")}>
                Back to editor
              </Button>
            </div>
            <p className="mt-2.5 text-[11.5px] leading-snug text-ink-400">
              Current board: {entries.length} classes, {entries.filter((e) => e.locked).length} locked, {conflicts.total} conflicts.
              Undo (Ctrl+Z) still works after clearing.
            </p>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

function Card({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="overflow-hidden rounded-lg border border-ink-200 bg-white shadow-panel">
      <header className="flex items-start gap-2.5 border-b border-ink-100 px-4 py-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600 ring-1 ring-brand-100">
          <Icon className="h-4 w-4" strokeWidth={2.1} />
        </span>
        <div>
          <h2 className="text-[14px] font-semibold text-ink-900">{title}</h2>
          <p className="text-[12px] text-ink-500">{subtitle}</p>
        </div>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
