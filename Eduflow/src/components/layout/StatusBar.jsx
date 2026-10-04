import { AlertTriangle, Check, Cloud, Lock, Maximize, Sparkles, Users, DoorOpen, CalendarDays, Eye } from "lucide-react";
import { cn } from "@/utils/cn.js";
import { useTimetable } from "@/store/TimetableContext.jsx";

function Item({ icon: Icon, label, value, onClick, tone = "default", title }) {
  const tones = {
    default: "hover:bg-white/10 text-ink-300",
    danger: "text-danger-500 hover:bg-danger-500/20",
    ok: "text-ok-500 hover:bg-ok-500/20",
    brand: "text-brand-300 hover:bg-white/10",
  };
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex h-full items-center gap-1.5 px-2 text-[11px] font-medium transition-colors",
        onClick && "cursor-pointer",
        tones[tone]
      )}
    >
      {Icon && <Icon className="h-3 w-3" strokeWidth={2.2} />}
      {label && <span className="text-white/45">{label}</span>}
      <span className="font-mono text-[11px] text-white/90">{value}</span>
    </Tag>
  );
}

/** Bottom application status bar. */
export function StatusBar() {
  const { saveState, summary, conflicts, settings, setSettings, patchUi, ui, mode, selection, history, entries } = useTimetable();
  const selectedCount = selection.entryIds.length;

  return (
    <footer className="print-hide flex h-7 shrink-0 items-stretch bg-ink-900 text-[11px] text-ink-300 select-none">
      <Item
        icon={saveState.status === "saving" ? Cloud : Check}
        value={saveState.status === "saving" ? "Saving changes…" : "All changes saved"}
        tone={saveState.status === "saving" ? "brand" : "ok"}
        title={saveState.at ? `Last saved ${saveState.at.toLocaleTimeString()}` : "Local autosave"}
      />
      <Item icon={Sparkles} label="Mode" value={mode} tone="brand" onClick={() => patchUi({ aiOpen: true })} title="Open the AI assistant" />
      <Item
        icon={AlertTriangle}
        label="Conflicts"
        value={conflicts.total}
        tone={conflicts.total ? "danger" : "ok"}
        onClick={() => patchUi({ rightPanel: ui.rightPanel === "conflicts" ? "properties" : "conflicts" })}
        title="Open conflict panel"
      />
      <Item icon={Lock} label="Locked" value={summary.locked} title="Cells the AI will not touch" />
      <Item icon={CalendarDays} label="Classes" value={summary.classes} />
      <Item icon={Users} label="Teachers" value={summary.teachers} />
      <Item icon={DoorOpen} label="Rooms" value={summary.rooms} />
      <Item icon={Eye} label="Free periods" value={summary.freePeriods} />

      <div className="ml-auto flex items-stretch">
        {selectedCount > 0 && (
          <Item label="Selected" value={selectedCount} tone="brand" onClick={() => patchUi({ rightPanel: "properties" })} />
        )}
        <Item label="History" value={`${history.depth}`} title="Undo steps available" />
        <Item label={settings.view === "week" ? "Week view" : "Day view"} value={settings.view === "day" ? settings.activeDay.toUpperCase() : `${settings.visibleDays.length}d`} onClick={() => setSettings({ view: settings.view === "week" ? "day" : "week" })} />
        <Item
          icon={Maximize}
          label="Zoom"
          value={`${settings.zoom}%`}
          onClick={() => setSettings({ zoom: 100 })}
          title="Reset zoom to 100%"
        />
        <span className="hidden items-center px-2 text-[11px] text-white/40 md:inline-flex">
          {entries.length ? "Ready" : "Empty week"}
        </span>
      </div>
    </footer>
  );
}
