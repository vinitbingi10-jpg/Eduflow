import { Hand, Sparkles, Blend, ChevronDown, ArrowDown, Lock, ScanSearch } from "lucide-react";
import { cn } from "@/utils/cn.js";
import { useTimetable } from "@/store/TimetableContext.jsx";
import { Dropdown, MenuStatic } from "@/components/common/Dropdown.jsx";
import { Tooltip } from "@/components/common/Tooltip.jsx";

const MODES = [
  { id: "manual", label: "Manual", icon: Hand, hint: "You build every cell yourself. AI stays quiet." },
  { id: "hybrid", label: "Hybrid", icon: Blend, hint: "AI drafts, you edit and lock, AI re-optimizes the rest." },
  { id: "ai", label: "AI", icon: Sparkles, hint: "AI fills every unlocked period. Locked cells still win." },
];

const WORKFLOW = [
  { icon: Sparkles, label: "AI generates", detail: "Draft week from subjects, rooms & constraints" },
  { icon: Hand, label: "User edits", detail: "Drag, retype, reassign — anything can change" },
  { icon: ScanSearch, label: "AI checks", detail: "Teacher, room, division, lab, availability" },
  { icon: Lock, label: "User locks decisions", detail: "Frozen cells become hard constraints" },
  { icon: Blend, label: "AI optimizes the rest", detail: "Only unlocked periods are touched" },
];

/** Manual / Hybrid / AI switch — the visible promise that the user stays in control. */
export function ModeIndicator({ className }) {
  const { mode, setMode } = useTimetable();

  return (
    <Dropdown
      width="w-80"
      align="right"
      closeOnSelect={false}
      trigger={
        <div className={cn("flex items-center gap-1 rounded-md border border-ink-200 bg-white p-0.5", className)}>
          {MODES.map((item) => {
            const Icon = item.icon;
            const active = mode === item.id;
            return (
              <Tooltip key={item.id} label={item.hint} side="bottom">
                <button
                  type="button"
                  onClick={() => setMode(item.id)}
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded px-2 text-[11.5px] font-semibold uppercase tracking-[0.05em] transition-all duration-150",
                    active ? "bg-brand-600 text-white shadow-[0_1px_2px_rgba(19,23,29,0.25)]" : "text-ink-500 hover:bg-ink-100 hover:text-ink-700"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
                  {item.label}
                </button>
              </Tooltip>
            );
          })}
          <span className="pl-0.5 pr-1 text-ink-400">
            <ChevronDown className="h-3.5 w-3.5" />
          </span>
        </div>
      }
    >
      <MenuStatic>
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-400">How hybrid mode works</p>
        <p className="mt-1 text-[12px] leading-snug text-ink-500">
          Eduflow never takes the pen from you. Every AI change is previewed, reversible and blocked by locked cells.
        </p>
        <ol className="mt-3 space-y-2">
          {WORKFLOW.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.label}>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                    <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-semibold text-ink-800">
                      {index + 1}. {step.label}
                    </span>
                    <span className="block text-[11.5px] leading-snug text-ink-500">{step.detail}</span>
                  </span>
                </div>
                {index < WORKFLOW.length - 1 && (
                  <ArrowDown className="ml-[7px] mt-1 h-3 w-3 text-ink-300" strokeWidth={2.4} />
                )}
              </li>
            );
          })}
        </ol>
      </MenuStatic>
    </Dropdown>
  );
}
