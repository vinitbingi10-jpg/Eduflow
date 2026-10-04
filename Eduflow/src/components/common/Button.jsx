import { forwardRef } from "react";
import { cn } from "@/utils/cn.js";
import { Tooltip } from "@/components/common/Tooltip.jsx";

const VARIANTS = {
  primary:
    "bg-brand-600 text-white border border-brand-700/40 hover:bg-brand-700 active:bg-brand-800 shadow-[0_1px_0_rgba(255,255,255,0.14)_inset]",
  secondary:
    "bg-white text-ink-700 border border-ink-200 hover:border-ink-300 hover:bg-ink-50 active:bg-ink-100",
  ghost: "bg-transparent text-ink-600 border border-transparent hover:bg-ink-100 active:bg-ink-200",
  subtle: "bg-brand-50 text-brand-700 border border-brand-100 hover:bg-brand-100",
  danger: "bg-white text-danger-600 border border-danger-500/30 hover:bg-danger-50",
  dark: "bg-ink-900 text-white border border-ink-900 hover:bg-ink-800",
};

const SIZES = {
  xs: "h-7 px-2 text-[12px] gap-1.5 rounded",
  sm: "h-8 px-2.5 text-[12.5px] gap-1.5 rounded-md",
  md: "h-9 px-3.5 text-[13px] gap-2 rounded-md",
  lg: "h-11 px-5 text-[14px] gap-2 rounded-md",
};

export const Button = forwardRef(function Button(
  { variant = "secondary", size = "md", icon: Icon, iconRight: IconRight, className, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={props.type ?? "button"}
      className={cn(
        "inline-flex select-none items-center justify-center font-medium tracking-[-0.01em] transition-all duration-150",
        "disabled:cursor-not-allowed disabled:opacity-45",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {Icon && <Icon className={cn(size === "lg" ? "h-4 w-4" : "h-[15px] w-[15px]")} strokeWidth={2} />}
      {children}
      {IconRight && <IconRight className={cn(size === "lg" ? "h-4 w-4" : "h-[15px] w-[15px]")} strokeWidth={2} />}
    </button>
  );
});

/** Square icon-only button, always with a tooltip. */
export function IconButton({ icon: Icon, label, tooltip, size = "md", variant = "ghost", active, className, shortcut, ...props }) {
  const dims = { xs: "h-6 w-6 rounded", sm: "h-7 w-7 rounded-md", md: "h-8 w-8 rounded-md", lg: "h-9 w-9 rounded-md" }[size];
  const iconSize = { xs: "h-3.5 w-3.5", sm: "h-4 w-4", md: "h-[16px] w-[16px]", lg: "h-[17px] w-[17px]" }[size];

  const button = (
    <button
      type="button"
      aria-label={label ?? tooltip}
      title={undefined}
      className={cn(
        "inline-flex items-center justify-center transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40",
        dims,
        active ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200" : VARIANTS[variant],
        className
      )}
      {...props}
    >
      <Icon className={iconSize} strokeWidth={2} />
    </button>
  );

  if (!tooltip) return button;
  return (
    <Tooltip label={tooltip} shortcut={shortcut}>
      {button}
    </Tooltip>
  );
}

/** Toolbar-style button: icon above nothing, icon + label inline, compact. */
export function ToolButton({ icon: Icon, label, tooltip, active, disabled, onClick, tone = "default", className, shortcut }) {
  const tones = {
    default: "hover:bg-ink-100 text-ink-700",
    brand: "hover:bg-brand-50 text-brand-700",
    danger: "hover:bg-danger-50 text-danger-600",
    warn: "hover:bg-warn-50 text-warn-600",
  };

  const button = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group/tb inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[12.5px] font-medium transition-all duration-150",
        "disabled:cursor-not-allowed disabled:opacity-40",
        active ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200" : tones[tone],
        className
      )}
    >
      <Icon className="h-[15px] w-[15px]" strokeWidth={2} />
      {label && <span className="hidden lg:inline">{label}</span>}
    </button>
  );

  if (!tooltip) return button;
  return (
    <Tooltip label={tooltip} shortcut={shortcut}>
      {button}
    </Tooltip>
  );
}

export function Badge({ tone = "neutral", children, className, dot }) {
  const tones = {
    neutral: "bg-ink-100 text-ink-600 ring-ink-200",
    brand: "bg-brand-50 text-brand-700 ring-brand-200",
    ok: "bg-ok-50 text-ok-600 ring-ok-500/25",
    warn: "bg-warn-50 text-warn-600 ring-warn-500/25",
    danger: "bg-danger-50 text-danger-600 ring-danger-500/25",
    info: "bg-info-50 text-info-600 ring-info-500/25",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em] ring-1 ring-inset",
        tones[tone],
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
