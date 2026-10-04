import { cn } from "@/utils/cn.js";

/** Eduflow mark: a timetable grid with one AI-placed session. */
export function Logo({ size = 28, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={cn("shrink-0", className)} role="img" aria-label="Eduflow logo">
      <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="8" fill="#0f6c64" />
      <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="8" fill="none" stroke="#0b443f" strokeWidth="1.5" />
      <g stroke="#ffffff" strokeOpacity="0.32" strokeWidth="1.3" strokeLinecap="round">
        <path d="M11.5 6.5v19M20.5 6.5v19M6.5 12.5h19M6.5 19.5h19" />
      </g>
      <rect x="12.6" y="13.6" width="6.8" height="4.8" rx="1.4" fill="#ffffff" />
      <path
        d="M23.4 20.6l1.05 2.35 2.35 1.05-2.35 1.05-1.05 2.35-1.05-2.35-2.35-1.05 2.35-1.05z"
        fill="#f2b134"
      />
    </svg>
  );
}

export function Wordmark({ size = 26, className, subtitle }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <Logo size={size} />
      <span className="leading-none">
        <span className="block font-display text-[15px] font-extrabold tracking-[-0.03em] text-ink-900">
          Edu<span className="text-brand-600">flow</span>
        </span>
        {subtitle && (
          <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.14em] text-ink-400">{subtitle}</span>
        )}
      </span>
    </span>
  );
}
