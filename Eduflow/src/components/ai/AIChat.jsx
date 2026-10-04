import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Eraser,
  Info,
  Lock,
  Minimize2,
  Network,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/utils/cn.js";
import { useTimetable } from "@/store/TimetableContext.jsx";
import { ChatMessage } from "@/components/ai/ChatMessage.jsx";
import { TypingIndicator } from "@/components/ai/TypingIndicator.jsx";
import { QuickActions } from "@/components/ai/QuickActions.jsx";
import { Dropdown, MenuStatic } from "@/components/common/Dropdown.jsx";
import { AI_ARCHITECTURE_STEPS } from "@/services/aiService.js";

export function AIChat({ onClose, className, compactHeader }) {
  const { chat, runPrompt, applyChoice, clearChat, regenerateLast, mode, summary, entries } = useTimetable();
  const [draft, setDraft] = useState("");
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat.messages.length, chat.typing]);

  const lockedCount = useMemo(() => entries.filter((e) => e.locked).length, [entries]);

  function send(text = draft) {
    const value = text.trim();
    if (!value || chat.typing) return;
    setDraft("");
    runPrompt(value);
  }

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-ink-200 bg-ink-50/40 shadow-panel",
        className
      )}
    >
      {/* header */}
      <header className="flex items-start gap-2.5 border-b border-ink-200 bg-white px-3 py-2.5">
        <span className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-600 text-white shadow-[0_2px_6px_rgba(15,108,100,0.35)]">
          <Sparkles className="h-4 w-4" strokeWidth={2.2} />
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-ok-500" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-1.5 font-display text-[13.5px] font-bold tracking-[-0.01em] text-ink-900">
            Eduflow
            <span className="rounded bg-brand-50 px-1 py-px text-[9.5px] font-bold uppercase tracking-[0.06em] text-brand-600 ring-1 ring-brand-100">
              {mode}
            </span>
          </h2>
          <p className="flex items-center gap-1.5 text-[11px] text-ink-500">
            {!compactHeader && "Timetable Assistant"}
            <span className="inline-flex items-center gap-1 text-ok-600">
              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-ok-500" />
              Online
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <HeaderAction icon={Network} label="How the assistant works" align="right">
            <MenuStatic className="w-72">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-400">Request pipeline</p>
              <ol className="mt-2 space-y-1.5">
                {AI_ARCHITECTURE_STEPS.map((step, index) => (
                  <li key={step.step} className="flex items-start gap-2">
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

            </MenuStatic>
          </HeaderAction>
          <button
            type="button"
            onClick={regenerateLast}
            className="flex h-7 w-7 items-center justify-center rounded text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
            title="Regenerate last response"
            aria-label="Regenerate last response"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={clearChat}
            className="flex h-7 w-7 items-center justify-center rounded text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
            title="Clear chat"
            aria-label="Clear chat"
          >
            <Eraser className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
              title="Hide assistant"
              aria-label="Hide assistant"
            >
              {compactHeader ? <X className="h-3.5 w-3.5" strokeWidth={2} /> : <Minimize2 className="h-3.5 w-3.5" strokeWidth={2} />}
            </button>
          )}
        </div>
      </header>

      {/* context strip */}
      <div className="flex items-center gap-2 border-b border-ink-100 bg-white/70 px-3 py-1.5 text-[10.5px] text-ink-500">
        <span className="inline-flex items-center gap-1 rounded bg-ink-50 px-1.5 py-0.5 font-medium ring-1 ring-ink-200">
          <Lock className="h-2.5 w-2.5 text-ink-500" strokeWidth={2.6} />
          {lockedCount} locked
        </span>
        <span className="inline-flex items-center gap-1 rounded bg-ink-50 px-1.5 py-0.5 font-medium ring-1 ring-ink-200">
          {summary.classes} classes
        </span>
        <span className="inline-flex items-center gap-1 rounded bg-ink-50 px-1.5 py-0.5 font-medium ring-1 ring-ink-200">
          {summary.freePeriods} free
        </span>
        <span className="ml-auto inline-flex items-center gap-1 text-ink-400">
          <Info className="h-3 w-3" strokeWidth={2} />
          You approve every change
        </span>
      </div>

      {/* messages */}
      <div className="scroll-slim min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {chat.messages.map((message, index) => (
          <ChatMessage
            key={message.id}
            message={message}
            onChoice={applyChoice}
            onRegenerate={
              index === chat.messages.length - 1 && message.role === "assistant" ? regenerateLast : undefined
            }
          />
        ))}
        {chat.typing && <TypingIndicator />}
        <div ref={endRef} />
      </div>

      {/* composer */}
      <div className="border-t border-ink-200 bg-white">
        <QuickActions onPick={send} disabled={chat.typing} className="border-b border-ink-100" />
        <div className="p-2.5">
          <div className="flex items-end gap-2 rounded-lg border border-ink-200 bg-white p-1.5 transition focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/15">
            <textarea
              ref={inputRef}
              value={draft}
              rows={1}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
              placeholder="Ask anything about the timetable…"
              className="max-h-28 min-h-[2rem] flex-1 resize-none bg-transparent px-1.5 py-1 text-[12.5px] leading-snug text-ink-800 outline-none placeholder:text-ink-300"
            />
            <button
              type="button"
              onClick={() => send()}
              disabled={!draft.trim() || chat.typing}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-600 text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-400"
              aria-label="Send message"
            >
              {chat.typing ? <Sparkles className="h-3.5 w-3.5 animate-pulse-soft" /> : <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.6} />}
            </button>
          </div>
          <p className="mt-1.5 flex items-center justify-between px-0.5 text-[10.5px] text-ink-400">
            <span>
              <kbd className="rounded border border-ink-200 bg-ink-50 px-1 font-mono text-[9.5px]">Enter</kbd> to send ·{" "}
              <kbd className="rounded border border-ink-200 bg-ink-50 px-1 font-mono text-[9.5px]">Shift+Enter</kbd> new line
            </span>
            <span className="truncate">Changes can be undone with Ctrl+Z</span>
          </p>
        </div>
      </div>
    </aside>
  );
}

function HeaderAction({ icon: Icon, label, children, align = "left" }) {
  return (
    <Dropdown
      align={align}
      closeOnSelect={false}
      width="w-auto"
      trigger={
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
          title={label}
          aria-label={label}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      }
    >
      {children}
    </Dropdown>
  );
}
