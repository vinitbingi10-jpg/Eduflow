import { useEffect, useState } from "react";
import { BrainCircuit, ScanSearch, Sparkles, Wrench } from "lucide-react";

const STAGES = [
  { icon: BrainCircuit, label: "Understanding request" },
  { icon: ScanSearch, label: "Reading timetable & constraints" },
  { icon: Wrench, label: "Testing candidate placements" },
  { icon: Sparkles, label: "Drafting reply" },
];

/** Typing indicator that also narrates what the assistant is doing. */
export function TypingIndicator() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setStage((s) => (s + 1) % STAGES.length), 900);
    return () => clearInterval(timer);
  }, []);

  const Active = STAGES[stage].icon;

  return (
    <div className="flex animate-fade-in items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-50 text-brand-600 ring-1 ring-brand-100">
        <Active className="h-3.5 w-3.5" strokeWidth={2.2} />
      </span>
      <span className="flex items-center gap-1">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-brand-400"
            style={{ animationDelay: `${dot * 0.18}s` }}
          />
        ))}
      </span>
      <span className="text-[11.5px] text-ink-500">{STAGES[stage].label}…</span>
    </div>
  );
}
