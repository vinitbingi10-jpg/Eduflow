import { QUICK_ACTIONS } from "@/data/mockData.js";
import { cn } from "@/utils/cn.js";

/** One-tap prompts above the composer. */
export function QuickActions({ onPick, disabled, className }) {
  return (
    <div className={cn("scroll-slim flex gap-1.5 overflow-x-auto px-3 pb-2 pt-1", className)}>
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action.id}
          type="button"
          disabled={disabled}
          onClick={() => onPick(action.prompt)}
          className="shrink-0 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[11.5px] font-medium text-ink-600 transition hover:-translate-y-px hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
