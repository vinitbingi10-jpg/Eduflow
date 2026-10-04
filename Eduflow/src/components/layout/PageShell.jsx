import { NavLink, useNavigate } from "react-router-dom";
import { ArrowLeft, LayoutGrid, BookOpen, GraduationCap, DoorOpen, Settings as SettingsIcon, CalendarDays } from "lucide-react";
import { cn } from "@/utils/cn.js";
import { TopBar } from "@/components/layout/TopBar.jsx";
import { StatusBar } from "@/components/layout/StatusBar.jsx";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/editor", label: "Editor", icon: CalendarDays },
  { to: "/subjects", label: "Subjects", icon: BookOpen },
  { to: "/teachers", label: "Teachers", icon: GraduationCap },
  { to: "/rooms", label: "Rooms", icon: DoorOpen },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

/** Shared chrome for every page outside the editor. */
export function PageShell({ eyebrow, title, subtitle, actions, children, wide }) {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas">
      <TopBar />

      <nav className="print-hide flex shrink-0 items-center gap-1 border-b border-ink-200 bg-white px-3">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mr-1 inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium text-ink-500 transition hover:bg-ink-100 hover:text-ink-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.1} />
          <span className="hidden sm:inline">Landing</span>
        </button>
        <span className="h-5 w-px bg-ink-200" />
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "inline-flex h-9 items-center gap-1.5 border-b-2 px-2.5 text-[12.5px] font-medium transition-colors",
                isActive ? "border-brand-600 text-brand-700" : "border-transparent text-ink-500 hover:border-ink-200 hover:text-ink-800"
              )
            }
          >
            <item.icon className="h-[15px] w-[15px]" strokeWidth={2} />
            <span className="hidden md:inline">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
        <div className={cn("mx-auto px-4 py-6 sm:px-6", wide ? "max-w-[1400px]" : "max-w-[1180px]")}>
          <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-600">{eyebrow}</p>}
              <h1 className="mt-1.5 font-display text-[26px] font-extrabold leading-tight tracking-[-0.035em] text-ink-900">{title}</h1>
              {subtitle && <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-ink-500">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          </header>
          {children}
        </div>
      </div>

      <StatusBar />
    </div>
  );
}
