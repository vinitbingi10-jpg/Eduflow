import { Check, Copy, RotateCcw, Sparkles, User } from "lucide-react";
import { useState } from "react";
import { cn } from "@/utils/cn.js";

const INTENT_LABEL = {
  "fix-conflicts": "Conflict resolution",
  generate: "Generation plan",
  optimize: "Optimization",
  workload: "Workload analysis",
  "regenerate-day": "Day rebuild",
  "explain-conflicts": "Explanation",
  "free-slot": "Slot search",
  move: "Move request",
  lock: "Lock request",
  status: "Timetable status",
  help: "Assistant",
};

export function ChatMessage({ message, onChoice, onRegenerate }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  async function copy() {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={cn("flex animate-slide-up gap-2", isUser && "flex-row-reverse")}>
      <span
        className={cn(
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1",
          isUser ? "bg-ink-900 text-white ring-ink-900" : "bg-brand-50 text-brand-600 ring-brand-100"
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5" strokeWidth={2.2} /> : <Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} />}
      </span>

      <div className={cn("group/msg min-w-0 max-w-[85%] flex-1", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "relative rounded-lg px-3 py-2 text-[12.5px] leading-relaxed shadow-[0_1px_1px_rgba(19,23,29,0.04)]",
            isUser
              ? "rounded-tr-sm bg-brand-600 text-white"
              : "rounded-tl-sm border border-ink-200 bg-white text-ink-700"
          )}
        >
          {!isUser && message.intent && (
            <span className="mb-1.5 inline-flex items-center gap-1 rounded bg-ink-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-ink-500 ring-1 ring-ink-200">
              <Sparkles className="h-2.5 w-2.5 text-brand-500" strokeWidth={2.6} />
              {INTENT_LABEL[message.intent] ?? message.intent}
            </span>
          )}
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
          {message.note && (
            <p className={cn("mt-1.5 border-t pt-1.5 text-[11.5px]", isUser ? "border-white/25 text-white/80" : "border-ink-100 text-ink-400")}>
              {message.note}
            </p>
          )}
        </div>

        {message.choices?.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {message.choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => onChoice(choice)}
                className="rounded-md border border-brand-200 bg-brand-50 px-2 py-1 text-[11.5px] font-semibold text-brand-700 transition hover:border-brand-400 hover:bg-brand-100 active:scale-[0.98]"
              >
                {choice.label}
              </button>
            ))}
          </div>
        )}

        <div className={cn("mt-1 flex items-center gap-2 text-[10.5px] text-ink-400", isUser && "flex-row-reverse")}>
          <span className="font-mono">{message.time}</span>
          {!isUser && (
            <span className="flex items-center gap-1 opacity-0 transition-opacity group-hover/msg:opacity-100">
              <button type="button" onClick={copy} className="inline-flex items-center gap-0.5 hover:text-ink-600" title="Copy reply">
                {copied ? <Check className="h-3 w-3 text-ok-500" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
              {onRegenerate && (
                <button type="button" onClick={onRegenerate} className="inline-flex items-center gap-0.5 hover:text-ink-600" title="Regenerate reply">
                  <RotateCcw className="h-3 w-3" /> Regenerate
                </button>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
