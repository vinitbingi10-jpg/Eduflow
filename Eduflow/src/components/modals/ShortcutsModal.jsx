import { ArrowDown, Blend, Hand, Keyboard, Lock, ScanSearch, Sparkles, Workflow } from "lucide-react";
import { useTimetable } from "@/store/TimetableContext.jsx";
import { Modal } from "@/components/common/Modal.jsx";
import { AI_ARCHITECTURE_STEPS } from "@/services/aiService.js";

const GROUPS = [
  {
    title: "Editing",
    items: [
      { keys: "Ctrl Z", label: "Undo last timetable change" },
      { keys: "Ctrl Y", label: "Redo" },
      { keys: "Ctrl C", label: "Copy selected class" },
      { keys: "Ctrl V", label: "Paste into selected period" },
      { keys: "Ctrl D", label: "Duplicate selected class" },
      { keys: "Del", label: "Delete selected class(es)" },
      { keys: "Ctrl ⏎", label: "Add class in selected period" },
    ],
  },
  {
    title: "Timetable & locking",
    items: [
      { keys: "Ctrl L", label: "Lock / unlock selected cells" },
      { keys: "Ctrl ⇧ L", label: "Lock the whole active day" },
      { keys: "Ctrl S", label: "Save timetable" },
      { keys: "Ctrl G", label: "Generate timetable with AI" },
      { keys: "Esc", label: "Close dialog / clear selection" },
    ],
  },
  {
    title: "View & navigation",
    items: [
      { keys: "Ctrl K", label: "Global search" },
      { keys: "Ctrl F", label: "Global search" },
      { keys: "Ctrl +", label: "Zoom in" },
      { keys: "Ctrl −", label: "Zoom out" },
      { keys: "Ctrl 0", label: "Fit to screen (100%)" },
      { keys: "Ctrl 1 / 2", label: "Week view / Day view" },
      { keys: "Ctrl P", label: "Print timetable" },
    ],
  },
];

export function ShortcutsModal() {
  const { ui, patchUi } = useTimetable();
  return (
    <Modal
      open={ui.shortcuts}
      onClose={() => patchUi({ shortcuts: false })}
      size="lg"
      icon={Keyboard}
      title="Keyboard shortcuts"
      description="Built for people who live inside a timetable all day."
    >
      <div className="grid gap-5 md:grid-cols-3">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-400">{group.title}</h3>
            <ul className="mt-2 space-y-1.5">
              {group.items.map((item) => (
                <li key={item.keys} className="flex items-center justify-between gap-3 rounded border border-ink-100 bg-ink-50/50 px-2 py-1.5">
                  <span className="text-[12px] text-ink-600">{item.label}</span>
                  <kbd className="shrink-0 rounded border border-ink-200 bg-white px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-ink-700">
                    {item.keys}
                  </kbd>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  );
}

const FLOW = [
  { icon: Sparkles, title: "AI generates", detail: "A full draft week from subjects, rooms and constraints." },
  { icon: Hand, title: "User edits", detail: "Drag cards, retype a teacher, drop a lab wherever you like." },
  { icon: ScanSearch, title: "AI checks", detail: "Conflicts appear on the canvas the moment they exist." },
  { icon: Lock, title: "User locks decisions", detail: "Locked cells become hard constraints, never suggestions." },
  { icon: Blend, title: "AI optimizes the rest", detail: "Only unlocked periods are touched — always undoable." },
];

export function WorkflowModal() {
  const { ui, closeModal } = useTimetable();
  return (
    <Modal
      open={ui.modal === "workflow"}
      onClose={closeModal}
      size="lg"
      icon={Workflow}
      title="Hybrid workflow — you stay in control"
      description="Eduflow is not an autopilot. It drafts, checks and proposes; a human approves every structural decision."
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-400">The loop</h3>
          <ol className="mt-2 space-y-2">
            {FLOW.map((step, index) => (
              <li key={step.title}>
                <div className="flex items-start gap-2.5 rounded-md border border-ink-200 bg-white p-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                    <step.icon className="h-3.5 w-3.5" strokeWidth={2.2} />
                  </span>
                  <span>
                    <span className="block text-[12.5px] font-semibold text-ink-900">{step.title}</span>
                    <span className="block text-[11.5px] leading-snug text-ink-500">{step.detail}</span>
                  </span>
                </div>
                {index < FLOW.length - 1 && <ArrowDown className="mx-auto my-0.5 h-3.5 w-3.5 text-ink-300" strokeWidth={2.4} />}
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-400">What happens behind a request</h3>
          <ol className="mt-2 space-y-1.5">
            {AI_ARCHITECTURE_STEPS.map((step, index) => (
              <li key={step.step} className="flex items-start gap-2 rounded-md border border-ink-100 bg-ink-50/50 p-2">
                <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded bg-ink-900 font-mono text-[9.5px] font-bold text-white">
                  {index + 1}
                </span>
                <span>
                  <span className="block text-[12px] font-semibold text-ink-800">{step.step}</span>
                  <span className="block text-[11px] leading-snug text-ink-500">{step.detail}</span>
                </span>
              </li>
            ))}
          </ol>

        </div>
      </div>
    </Modal>
  );
}
