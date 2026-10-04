import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/utils/cn.js";

/**
 * Lightweight portal tooltip. Portals keep tooltips from being clipped by the
 * toolbar's horizontal scroll container.
 */
export function Tooltip({ label, shortcut, side = "bottom", delay = 320, children, className }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const anchor = useRef(null);
  const timer = useRef(null);

  const show = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const rect = anchor.current?.getBoundingClientRect();
      if (!rect) return;
      setPos({
        top: side === "top" ? rect.top - 8 : rect.bottom + 8,
        left: rect.left + rect.width / 2,
      });
      setOpen(true);
    }, delay);
  }, [delay, side]);

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setOpen(false);
  }, []);

  return (
    <>
      <span
        ref={anchor}
        className={cn("inline-flex", className)}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={hide}
      >
        {children}
      </span>
      {open &&
        label &&
        createPortal(
          <div
            role="tooltip"
            style={{
              top: pos.top,
              left: pos.left,
              transform: side === "top" ? "translate(-50%, -100%)" : "translate(-50%, 0)",
            }}
            className="print-hide pointer-events-none fixed z-[200] max-w-[16rem] animate-fade-in whitespace-pre-line rounded-md bg-ink-900 px-2.5 py-1.5 text-[11.5px] font-medium leading-snug text-white shadow-pop"
          >
            {label}
            {shortcut && (
              <kbd className="ml-1.5 rounded border border-white/25 bg-white/10 px-1 py-px font-mono text-[10px] text-white/85">
                {shortcut}
              </kbd>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
