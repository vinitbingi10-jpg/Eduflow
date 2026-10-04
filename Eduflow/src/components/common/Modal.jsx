import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/utils/cn.js";
import { Button, IconButton } from "@/components/common/Button.jsx";

const SIZES = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

export function Modal({ open, onClose, title, description, icon: Icon, size = "md", children, footer, className, bodyClassName }) {
  const panel = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose?.();
      }
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // focus first field for fast data entry
    const focusable = panel.current?.querySelector("input, select, textarea, button");
    focusable?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="print-hide fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div
        className="fixed inset-0 animate-fade-in bg-ink-900/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative z-10 my-auto w-full animate-pop-in overflow-hidden rounded-lg border border-ink-200 bg-white shadow-pop",
          SIZES[size],
          className
        )}
      >
        <header className="flex items-start gap-3 border-b border-ink-100 bg-ink-50/60 px-5 py-3.5">
          {Icon && (
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-brand-600 ring-1 ring-ink-200">
              <Icon className="h-4 w-4" strokeWidth={2} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-semibold text-ink-900">{title}</h2>
            {description && <p className="mt-0.5 text-[12.5px] leading-snug text-ink-500">{description}</p>}
          </div>
          <IconButton icon={X} label="Close dialog" tooltip="Close  ·  Esc" size="sm" onClick={onClose} />
        </header>

        <div className={cn("scroll-slim max-h-[min(70vh,44rem)] overflow-y-auto px-5 py-4", bodyClassName)}>{children}</div>

        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-ink-100 bg-ink-50/60 px-5 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}

export function Field({ label, hint, required, children, className, error }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 flex items-center gap-1 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-ink-500">
        {label}
        {required && <span className="text-danger-500">*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-[11.5px] text-ink-400">{hint}</span>}
      {error && <span className="mt-1 block text-[11.5px] font-medium text-danger-600">{error}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-md border border-ink-200 bg-white px-2.5 py-1.5 text-[13px] text-ink-900 shadow-[0_1px_1px_rgba(19,23,29,0.03)] transition placeholder:text-ink-300 hover:border-ink-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/15";

export function TextInput({ className, ...props }) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Select({ className, children, ...props }) {
  return (
    <select className={cn(inputClass, "cursor-pointer appearance-none bg-[length:14px] pr-7", className)} {...props}>
      {children}
    </select>
  );
}

export function Toggle({ checked, onChange, label, description }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-md border border-ink-200 bg-white px-3 py-2 text-left transition hover:border-ink-300"
    >
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-ink-800">{label}</span>
        {description && <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-500">{description}</span>}
      </span>
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-brand-500" : "bg-ink-200"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-200",
            checked ? "left-[1.15rem]" : "left-0.5"
          )}
        />
      </span>
    </button>
  );
}

export function ModalFooterActions({ onCancel, onSubmit, submitLabel = "Save changes", submitIcon: Icon, cancelLabel = "Cancel", disabled }) {
  return (
    <>
      <Button variant="ghost" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button variant="primary" icon={Icon} onClick={onSubmit} disabled={disabled}>
        {submitLabel}
      </Button>
    </>
  );
}
