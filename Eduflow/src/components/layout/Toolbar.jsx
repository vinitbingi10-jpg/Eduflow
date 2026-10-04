import {
  BookOpen,
  CalendarDays,
  ClipboardPaste,
  Coffee,
  Copy,
  DoorOpen,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Lightbulb,
  Lock,
  LockOpen,
  Maximize,
  MessageSquare,
  Minus,
  PanelLeft,
  Plus,
  Printer,
  Redo2,
  Rows3,
  ScanSearch,
  Share2,
  Sparkles,
  Trash2,
  Undo2,
  Wand2,
  Wrench,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cn } from "@/utils/cn.js";
import { useNavigate } from "react-router-dom";
import { useTimetable } from "@/store/TimetableContext.jsx";
import { ToolButton, IconButton } from "@/components/common/Button.jsx";
import { Dropdown, MenuItem } from "@/components/common/Dropdown.jsx";
import { Tooltip } from "@/components/common/Tooltip.jsx";

function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-ink-200" aria-hidden="true" />;
}

/** Second application bar: every timetable editing action, one click away. */
export function Toolbar() {
  const navigate = useNavigate();
  const {
    history, undo, redo, copyEntry, pasteEntry, duplicateEntry, deleteEntries, selection, clipboard,
    settings, setSettings, patchUi, ui, openModal, toggleLock, lockRow, lockColumn, conflicts, runPrompt,
    exportAs, entries, save,
  } = useTimetable();

  const selectedIds = selection.entryIds;
  const selectedEntry = entries.find((e) => e.id === selectedIds[0]);
  const allLocked = selectedIds.length > 0 && selectedIds.every((id) => entries.find((e) => e.id === id)?.locked);

  const zoomLabel = `${settings.zoom}%`;

  return (
    <div className="print-hide relative z-30 flex h-11 shrink-0 items-center gap-0.5 overflow-x-auto border-b border-ink-200 bg-ink-50/80 px-2 scroll-slim">
      {/* history */}
      <ToolButton icon={Undo2} label="Undo" tooltip={`Undo${history.undoLabel ? `: ${history.undoLabel}` : ""}`} shortcut="Ctrl Z" disabled={!history.canUndo} onClick={undo} />
      <ToolButton icon={Redo2} label="Redo" tooltip={`Redo${history.redoLabel ? `: ${history.redoLabel}` : ""}`} shortcut="Ctrl Y" disabled={!history.canRedo} onClick={redo} />

      <Divider />

      {/* clipboard */}
      <ToolButton icon={Copy} tooltip="Copy selected class" shortcut="Ctrl C" disabled={!selectedEntry} onClick={() => copyEntry(selectedEntry.id)} />
      <ToolButton icon={ClipboardPaste} tooltip="Paste into selected period" shortcut="Ctrl V" disabled={!clipboard} onClick={() => pasteEntry()} />
      <ToolButton icon={Copy} label="Duplicate" tooltip="Duplicate into the next free period" disabled={!selectedEntry} onClick={() => duplicateEntry(selectedEntry.id)} />
      <ToolButton icon={Trash2} tone="danger" tooltip="Delete selected class(es)" shortcut="Del" disabled={!selectedIds.length} onClick={() => deleteEntries(selectedIds)} />

      <Divider />

      {/* insert */}
      <ToolButton icon={Plus} label="Add Class" variant="brand" tooltip="Add a class to the timetable" shortcut="Ctrl ⏎" onClick={() => openModal("add", {})} className="bg-white ring-1 ring-ink-200" />
      <ToolButton icon={Coffee} tooltip="Insert a break / free period" onClick={() => openModal("add", { type: "Break" })} />
      <ToolButton icon={BookOpen} label="Add Subject" tooltip="Add a subject" onClick={() => openModal("subject")} />
      <ToolButton icon={GraduationCap} tooltip="Add a teacher" onClick={() => openModal("teacher")} />
      <ToolButton icon={DoorOpen} tooltip="Add a room" onClick={() => openModal("room")} />

      <Divider />

      {/* lock */}
      <ToolButton
        icon={Lock}
        tooltip={allLocked ? "Selected cells are already locked" : "Lock selected cells — AI & drag will skip them"}
        disabled={!selectedIds.length || allLocked}
        onClick={() => toggleLock(selectedIds, true)}
      />
      <ToolButton icon={LockOpen} tooltip="Unlock selected cells" disabled={!selectedIds.length || !allLocked} onClick={() => toggleLock(selectedIds, false)} />
      <Dropdown
        width="w-56"
        trigger={
          <button type="button" className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[12.5px] font-medium text-ink-600 transition hover:bg-ink-100">
            <Lock className="h-[15px] w-[15px]" strokeWidth={2} />
            <span className="hidden xl:inline">Lock</span>
          </button>
        }
      >
        <MenuItem icon={Lock} label="Lock selected" disabled={!selectedIds.length} onClick={() => toggleLock(selectedIds, true)} />
        <MenuItem icon={LockOpen} label="Unlock selected" disabled={!selectedIds.length} onClick={() => toggleLock(selectedIds, false)} />
        <MenuItem icon={CalendarDays} label={`Lock whole ${settings.activeDay.toUpperCase()}`} onClick={() => lockRow(settings.activeDay)} />
        <MenuItem icon={Rows3} label="Lock period 1 across all days" onClick={() => lockColumn("p1")} />
        <MenuItem
          icon={LockOpen}
          label="Unlock everything"
          onClick={() => toggleLock(entries.map((e) => e.id), false)}
        />
      </Dropdown>

      <Divider />

      {/* conflicts */}
      <Tooltip label={conflicts.total ? "Open the conflict panel" : "No conflicts to review"}>
        <button
          type="button"
          onClick={() => patchUi({ rightPanel: ui.rightPanel === "conflicts" ? "properties" : "conflicts" })}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[12.5px] font-semibold transition",
            conflicts.total
              ? "bg-danger-50 text-danger-600 ring-1 ring-danger-500/25 hover:bg-danger-500 hover:text-white"
              : "bg-ok-50 text-ok-600 ring-1 ring-ok-500/20 hover:bg-ok-500 hover:text-white",
            ui.rightPanel === "conflicts" && "ring-2 ring-offset-1"
          )}
        >
          <ScanSearch className="h-[15px] w-[15px]" strokeWidth={2.2} />
          <span className="hidden lg:inline">Conflicts</span>
          <span className="rounded bg-white/80 px-1 font-mono text-[10.5px]">{conflicts.total}</span>
        </button>
      </Tooltip>

      <Divider />

      {/* zoom + view */}
      <IconButton icon={ZoomOut} size="sm" tooltip="Zoom out" shortcut="Ctrl −" onClick={() => setSettings({ zoom: Math.max(60, settings.zoom - 10) })} disabled={settings.zoom <= 60} />
      <Dropdown
        width="w-44"
        align="left"
        trigger={
          <button type="button" className="h-8 min-w-14 rounded-md px-2 font-mono text-[12px] font-semibold text-ink-700 transition hover:bg-ink-100">
            {zoomLabel}
          </button>
        }
      >
        {[70, 85, 100, 115, 130, 150].map((value) => (
          <MenuItem key={value} label={`${value}%`} checked={settings.zoom === value} onClick={() => setSettings({ zoom: value })} />
        ))}
      </Dropdown>
      <IconButton icon={ZoomIn} size="sm" tooltip="Zoom in" shortcut="Ctrl +" onClick={() => setSettings({ zoom: Math.min(160, settings.zoom + 10) })} disabled={settings.zoom >= 160} />
      <IconButton icon={Maximize} size="sm" tooltip="Fit to screen" shortcut="Ctrl 0" onClick={() => setSettings({ zoom: 100, view: "week" })} />

      <Divider />

      <ToolButton icon={CalendarDays} label="Week" tooltip="Week view" active={settings.view === "week"} onClick={() => setSettings({ view: "week" })} />
      <ToolButton icon={Rows3} label="Day" tooltip="Day view — focus a single day" active={settings.view === "day"} onClick={() => setSettings({ view: "day" })} />
      <ToolButton
        icon={Rows3}
        tooltip={settings.rowHeight === "compact" ? "Comfortable row height" : "Compact row height"}
        active={settings.rowHeight === "compact"}
        onClick={() => setSettings({ rowHeight: settings.rowHeight === "compact" ? "comfortable" : "compact" })}
      />

      <Divider />

      {/* AI */}
      <ToolButton icon={Sparkles} label="Generate" tone="brand" tooltip="Generate a full timetable with AI" onClick={() => openModal("generate")} className="bg-brand-600 text-white hover:bg-brand-700" />
      <ToolButton icon={Wand2} tooltip="Optimize timetable with AI" onClick={() => { patchUi({ aiOpen: true }); runPrompt("Optimize the timetable"); }} />
      <ToolButton icon={Wrench} tone={conflicts.total ? "danger" : "default"} tooltip="Fix all resolvable conflicts" onClick={() => { patchUi({ aiOpen: true }); runPrompt("Fix all conflicts in the timetable"); }} />
      <ToolButton icon={Lightbulb} tooltip={`AI suggestions (${conflicts.improvements.length})`} onClick={() => { patchUi({ aiOpen: true, rightPanel: "conflicts" }); }} />

      <Divider />

      {/* export */}
      <ToolButton icon={FileText} tooltip="Export as PDF" onClick={() => openModal("export", { format: "pdf" })} />
      <ToolButton icon={FileSpreadsheet} tooltip="Export as Excel" onClick={() => openModal("export", { format: "xlsx" })} />
      <ToolButton icon={Printer} tooltip="Print timetable" shortcut="Ctrl P" onClick={() => exportAs("print")} />
      <ToolButton icon={Share2} tooltip="Share a read-only link" onClick={() => openModal("export", { format: "share" })} />

      <div className="ml-auto flex shrink-0 items-center gap-1 pl-2">
        <span className="hidden text-[11.5px] text-ink-400 xl:inline">
          {selectedIds.length > 1
            ? `${selectedIds.length} classes selected`
            : selectedEntry
              ? `${selectedEntry.label || selectedEntry.subjectId}${selectedEntry.locked ? " · locked" : ""}`
              : selection.cell
                ? `Period ${selection.cell.slot.toUpperCase()} · ${selection.cell.day.toUpperCase()}`
                : `${entries.length} classes · ${entries.filter((e) => e.locked).length} locked`}
        </span>
        <IconButton icon={PanelLeft} size="sm" tooltip={ui.sidebar ? "Collapse asset sidebar" : "Expand asset sidebar"} active={ui.sidebar} onClick={() => patchUi({ sidebar: !ui.sidebar })} />
        <IconButton icon={MessageSquare} size="sm" tooltip={ui.aiOpen ? "Hide AI assistant" : "Show AI assistant"} active={ui.aiOpen} onClick={() => patchUi({ aiOpen: !ui.aiOpen })} />

      </div>
    </div>
  );
}
