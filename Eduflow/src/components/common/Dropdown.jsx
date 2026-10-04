import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/utils/cn.js";

/**
 * Office-style dropdown used by the top menu bar, the toolbar splits and the
 * user profile. Closes on outside click, Escape and (optionally) on select.
 */
export function Dropdown({ trigger, children, align = "left", width = "w-60", className, closeOnSelect = true, panelClassName }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (wrap.current && !wrap.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrap} className={cn("group relative", className)}>
      <div onClick={() => setOpen((v) => !v)} data-open={open}>
        {typeof trigger === "function" ? trigger({ open, toggle: () => setOpen((v) => !v) }) : trigger}
      </div>
      {open && (
        <div
          className={cn(
            "absolute z-[100] mt-1 origin-top animate-pop-in overflow-hidden rounded-md border border-ink-200 bg-white py-1 shadow-pop",
            align === "right" ? "right-0" : "left-0",
            width,
            panelClassName
          )}
          onClick={() => closeOnSelect && setOpen(false)}
          role="menu"
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ icon: Icon, label, hint, shortcut, onClick, tone = "default", disabled, checked, danger }) {
  const tones = {
    default: "text-ink-700 hover:bg-ink-50",
    brand: "text-brand-700 hover:bg-brand-50",
    danger: "text-danger-600 hover:bg-danger-50",
  };
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[12.5px] transition-colors duration-100",
        "disabled:cursor-not-allowed disabled:opacity-40",
        danger ? tones.danger : tones[tone]
      )}
    >
      {Icon ? <Icon className="h-[15px] w-[15px] shrink-0 opacity-80" strokeWidth={2} /> : <span className="w-[15px] shrink-0">{checked && <Check className="h-[15px] w-[15px]" />}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{label}</span>
        {hint && <span className="block truncate text-[11px] text-ink-400">{hint}</span>}
      </span>
      {shortcut && <kbd className="shrink-0 font-mono text-[10.5px] text-ink-400">{shortcut}</kbd>}
    </button>
  );
}

export function MenuSeparator({ className }) {
  return <div className={cn("my-1 h-px bg-ink-100", className)} />;
}

export function MenuLabel({ children, className }) {
  return (
    <p className={cn("px-3 pb-1 pt-1.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-400", className)}>
      {children}
    </p>
  );
}

/** A row inside a dropdown that should not close the menu when clicked. */
export function MenuStatic({ children, className }) {
  return (
    <div className={cn("px-3 py-2", className)} onClick={(event) => event.stopPropagation()}>
      {children}
    </div>
  );
}
