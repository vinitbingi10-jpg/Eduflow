import {
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  Cloud,
  CloudUpload,
  Copy,
  Eraser,
  FileSpreadsheet,
  FileText,
  Folder,
  HelpCircle,
  Keyboard,
  LayoutGrid,
  Lock,
  LockOpen,
  Plus,
  Printer,
  Rows3,
  Save,
  Search,
  Settings as SettingsIcon,
  Share2,
  Sparkles,
  Trash2,
  Undo2,
  Redo2,
  Wand2,
  Wrench,
  ZoomIn,
  ZoomOut,
  Maximize,
  PanelLeft,
  MessageSquare,
  CalendarPlus,
  CalendarDays,
  Coffee,
  User2,
  LogOut,
  ArrowLeft,
  ClipboardList,
  DoorOpen,
  GraduationCap,
  ScanSearch,
  Scale,
} from "lucide-react";
import { cn } from "@/utils/cn.js";
import { useNavigate, useLocation } from "react-router-dom";
import { useTimetable } from "@/store/TimetableContext.jsx";
import { useToast } from "@/components/common/Toast.jsx";
import { Dropdown, MenuItem, MenuLabel, MenuSeparator, MenuStatic } from "@/components/common/Dropdown.jsx";
import { Tooltip } from "@/components/common/Tooltip.jsx";
import { Wordmark } from "@/components/common/Logo.jsx";
import { Badge } from "@/components/common/Button.jsx";
import { NOTIFICATIONS, RECENT_TIMETABLES, USER } from "@/data/mockData.js";

const MENUS = ["File", "Edit", "View", "Insert", "Timetable", "AI Assistant", "Help"];

export function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const store = useTimetable();
  const {
    history, undo, redo, copyEntry, pasteEntry, deleteEntries, selection, entries, settings, setSettings,
    patchUi, openModal, save, exportAs, clearTimetable, lockRow, lockColumn, toggleLock, runPrompt, saveState, duplicateEntry,
  } = store;

  const selectedId = selection.entryIds[0];
  const inEditor = location.pathname === "/editor";

  const go = (path) => () => navigate(path);
  const notReady = (feature) => () => toast(`${feature} is coming soon`, { tone: "info" });

  function menuItems(menu) {
    switch (menu) {
      case "File":
        return (
          <>
            <MenuItem icon={LayoutGrid} label="Dashboard" hint="Overview & analytics" onClick={go("/dashboard")} />
            <MenuItem icon={CalendarPlus} label="New Timetable" shortcut="Ctrl N" onClick={() => { navigate("/editor"); openModal("generate"); }} />
            <MenuSeparator />
            <MenuItem icon={Save} label="Save" shortcut="Ctrl S" onClick={save} />
            <MenuSeparator />
            <MenuLabel>Export</MenuLabel>
            <MenuItem icon={FileText} label="Export as PDF" onClick={() => openModal("export", { format: "pdf" })} />
            <MenuItem icon={FileSpreadsheet} label="Export as CSV / Excel" onClick={() => openModal("export", { format: "xlsx" })} />
            <MenuItem icon={Printer} label="Print" shortcut="Ctrl P" onClick={() => exportAs("print")} />
            <MenuItem icon={Share2} label="Share timetable" onClick={() => openModal("export", { format: "share" })} />
            <MenuSeparator />
            <MenuItem icon={SettingsIcon} label="Settings" onClick={go("/settings")} />
          </>
        );
      case "Edit":
        return (
          <>
            <MenuItem icon={Undo2} label="Undo" shortcut="Ctrl Z" disabled={!history.canUndo} hint={history.undoLabel ?? undefined} onClick={undo} />
            <MenuItem icon={Redo2} label="Redo" shortcut="Ctrl Y" disabled={!history.canRedo} hint={history.redoLabel ?? undefined} onClick={redo} />
            <MenuSeparator />
            <MenuItem icon={Copy} label="Copy" shortcut="Ctrl C" disabled={!selectedId} onClick={() => copyEntry(selectedId)} />
            <MenuItem icon={ClipboardList} label="Paste" shortcut="Ctrl V" disabled={!store.clipboard} onClick={() => pasteEntry()} />
            <MenuItem icon={Copy} label="Duplicate" disabled={!selectedId} onClick={() => duplicateEntry(selectedId)} />
            <MenuItem icon={Trash2} label="Delete" shortcut="Del" danger disabled={!selection.entryIds.length} onClick={() => deleteEntries(selection.entryIds)} />
            <MenuSeparator />
            <MenuItem icon={Eraser} label="Clear timetable" danger onClick={clearTimetable} />
          </>
        );
      case "View":
        return (
          <>
            <MenuItem icon={ZoomIn} label="Zoom in" shortcut="Ctrl +" onClick={() => setSettings({ zoom: Math.min(160, settings.zoom + 10) })} />
            <MenuItem icon={ZoomOut} label="Zoom out" shortcut="Ctrl −" onClick={() => setSettings({ zoom: Math.max(60, settings.zoom - 10) })} />
            <MenuItem icon={Maximize} label="Fit to screen" shortcut="Ctrl 0" onClick={() => setSettings({ zoom: 100 })} />
            <MenuSeparator />
            <MenuItem label="Week view" checked={settings.view === "week"} icon={CalendarDays} onClick={() => setSettings({ view: "week" })} />
            <MenuItem label="Day view" checked={settings.view === "day"} icon={Rows3} onClick={() => setSettings({ view: "day", activeDay: settings.activeDay })} />
            <MenuItem label="Compact rows" checked={settings.rowHeight === "compact"} icon={Rows3} onClick={() => setSettings({ rowHeight: settings.rowHeight === "compact" ? "comfortable" : "compact" })} />
            <MenuSeparator />
            <MenuItem label="Asset sidebar" checked={settings && store.ui.sidebar} icon={PanelLeft} onClick={() => patchUi({ sidebar: !store.ui.sidebar })} />
            <MenuItem label="AI assistant panel" checked={store.ui.aiOpen} icon={MessageSquare} onClick={() => patchUi({ aiOpen: !store.ui.aiOpen })} />
            <MenuItem label="Highlight conflicts" checked={settings.showConflicts} icon={ScanSearch} onClick={() => setSettings({ showConflicts: !settings.showConflicts })} />
          </>
        );
      case "Insert":
        return (
          <>
            <MenuItem icon={Plus} label="Add Class" shortcut="Ctrl ⏎" onClick={() => openModal("add", {})} />
            <MenuItem icon={Coffee} label="Add Break" onClick={() => openModal("add", { type: "Break" })} />
            <MenuSeparator />
            <MenuLabel>Data</MenuLabel>
            <MenuItem icon={BookOpen} label="Add Subject" onClick={() => (inEditor ? openModal("subject") : navigate("/subjects"))} />
            <MenuItem icon={GraduationCap} label="Add Teacher" onClick={() => (inEditor ? openModal("teacher") : navigate("/teachers"))} />
            <MenuItem icon={DoorOpen} label="Add Room" onClick={() => (inEditor ? openModal("room") : navigate("/rooms"))} />
            <MenuSeparator />
            <MenuItem icon={BookOpen} label="Manage subjects" hint="Full table" onClick={go("/subjects")} />
            <MenuItem icon={GraduationCap} label="Manage teachers" hint="Full table" onClick={go("/teachers")} />
            <MenuItem icon={DoorOpen} label="Manage rooms" hint="Full table" onClick={go("/rooms")} />
          </>
        );
      case "Timetable":
        return (
          <>
            <MenuItem icon={Sparkles} label="Generate with AI" onClick={() => openModal("generate")} />
            <MenuItem icon={Wand2} label="Optimize timetable" onClick={() => runPrompt("Optimize the timetable")} />
            <MenuItem icon={Wrench} label="Fix conflicts" hint={String(store.conflicts.total)} onClick={() => runPrompt("Fix all conflicts in the timetable")} />
            <MenuSeparator />
            <MenuItem icon={Lock} label="Lock selected" disabled={!selection.entryIds.length} onClick={() => toggleLock(selection.entryIds, true)} />
            <MenuItem icon={LockOpen} label="Unlock selected" disabled={!selection.entryIds.length} onClick={() => toggleLock(selection.entryIds, false)} />
            <MenuItem icon={Lock} label="Lock whole day" onClick={() => lockRow(settings.activeDay)} />
            <MenuItem icon={Lock} label="Lock this period" onClick={() => lockColumn("p1")} />
            <MenuSeparator />
            <MenuItem icon={ScanSearch} label="Open conflict panel" onClick={() => patchUi({ rightPanel: "conflicts" })} />
            <MenuItem icon={Printer} label="Print timetable" onClick={() => exportAs("print")} />
          </>
        );
      case "AI Assistant":
        return (
          <>
            <MenuStatic className="w-64">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-400">Mode: {store.mode}</p>
              <p className="mt-1 text-[11.5px] leading-snug text-ink-500">
                AI drafts and checks. You edit, lock and approve. Locked cells are hard constraints the assistant never
                overrides.
              </p>
            </MenuStatic>
            <MenuSeparator />
            <MenuItem icon={MessageSquare} label={store.ui.aiOpen ? "Hide assistant panel" : "Show assistant panel"} onClick={() => patchUi({ aiOpen: !store.ui.aiOpen })} />
            <MenuItem icon={Sparkles} label="Generate timetable" onClick={() => openModal("generate")} />
            <MenuItem icon={Wrench} label="Fix conflicts" onClick={() => runPrompt("Fix all conflicts in the timetable")} />
            <MenuItem icon={Scale} label="Balance teacher workload" onClick={() => runPrompt("Balance teacher workload")} />
            <MenuItem icon={ScanSearch} label="Explain conflicts" onClick={() => runPrompt("Explain the current conflicts")} />
            <MenuItem icon={Search} label="Find free slot" onClick={() => runPrompt("Find a free slot")} />
          </>
        );
      case "Help":
        return (
          <>
            <MenuItem icon={Keyboard} label="Keyboard shortcuts" onClick={() => patchUi({ shortcuts: true })} />
            <MenuItem icon={HelpCircle} label="How hybrid mode works" onClick={() => openModal("workflow")} />
            <MenuSeparator />
            <MenuStatic className="w-64">
              <p className="text-[12px] font-semibold text-ink-800">Eduflow</p>
              <p className="mt-1 text-[11.5px] leading-snug text-ink-500">
                Timetable editor with AI help. Backend: FastAPI, see README for how to run it.
              </p>
            </MenuStatic>
          </>
        );
      default:
        return null;
    }
  }

  return (
    <header className="print-hide relative z-40 flex h-12 shrink-0 items-center gap-1 border-b border-ink-200 bg-white px-2 sm:px-3">
      <button
        type="button"
        onClick={() => navigate(inEditor ? "/dashboard" : "/")}
        className="mr-1 flex items-center gap-2 rounded-md px-1 py-1 transition hover:bg-ink-50"
        title={inEditor ? "Back to dashboard" : "Eduflow home"}
      >
        <Wordmark size={26} />
      </button>

      <nav className="scroll-slim flex min-w-0 items-center gap-0.5 overflow-x-auto">
        {MENUS.map((menu) => (
          <Dropdown
            key={menu}
            width={menu === "AI Assistant" ? "w-72" : "w-64"}
            trigger={
              <button
                type="button"
                className="h-7 rounded px-2 text-[12.5px] font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 group-data-[open=true]:bg-ink-900 group-data-[open=true]:text-white"
              >
                {menu}
              </button>
            }
          >
            {menuItems(menu)}
          </Dropdown>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-1.5">
        <Tooltip label="Search subjects, teachers, rooms & classes" shortcut="Ctrl K">
          <button
            type="button"
            onClick={() => patchUi({ search: true })}
            className="hidden h-8 items-center gap-2 rounded-md border border-ink-200 bg-ink-50/70 px-2 text-[12px] text-ink-400 transition hover:border-ink-300 hover:bg-white md:flex"
          >
            <Search className="h-3.5 w-3.5" strokeWidth={2} />
            <span className="w-28 text-left">Search…</span>
            <kbd className="rounded border border-ink-200 bg-white px-1 font-mono text-[10px] text-ink-400">Ctrl K</kbd>
          </button>
        </Tooltip>

        <Dropdown
          align="right"
          width="w-80"
          closeOnSelect={false}
          trigger={
            <button
              type="button"
              className="relative flex h-8 w-8 items-center justify-center rounded-md text-ink-500 transition hover:bg-ink-100 hover:text-ink-800"
              aria-label="Notifications"
            >
              <Bell className="h-[17px] w-[17px]" strokeWidth={2} />
              {store.conflicts.total > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-danger-500 px-0.5 text-[9px] font-bold text-white">
                  {store.conflicts.total}
                </span>
              )}
            </button>
          }
        >
          <MenuLabel>Notifications</MenuLabel>
          {store.conflicts.conflicts.slice(0, 6).map((item) => (
            <MenuItem
              key={item.id}
              icon={ScanSearch}
              label={item.title}
              hint={item.message}
              tone="danger"
              onClick={() => {
                navigate("/editor");
                patchUi({ rightPanel: "conflicts" });
              }}
            />
          ))}
          {store.conflicts.total === 0 && (
            <MenuItem icon={Check} label="All clear" hint="No conflicts in the timetable" />
          )}
        </Dropdown>

        <span
          className={cn(
            "hidden h-8 items-center gap-1.5 rounded-md px-2 text-[11.5px] font-medium sm:flex",
            saveState.status === "saving" ? "bg-warn-50 text-warn-600" : "bg-ok-50 text-ok-600"
          )}
        >
          {saveState.status === "saving" ? (
            <>
              <CloudUpload className="h-3.5 w-3.5 animate-pulse-soft" strokeWidth={2} /> Saving…
            </>
          ) : (
            <>
              <Cloud className="h-3.5 w-3.5" strokeWidth={2} /> Saved
            </>
          )}
        </span>

        <Tooltip label="Save now" shortcut="Ctrl S">
          <button
            type="button"
            onClick={save}
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-500 transition hover:bg-ink-100 hover:text-ink-800"
            aria-label="Save timetable"
          >
            <Save className="h-[17px] w-[17px]" strokeWidth={2} />
          </button>
        </Tooltip>

        <Dropdown
          align="right"
          width="w-60"
          trigger={
            <button type="button" className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 transition hover:bg-ink-100">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink-900 font-display text-[11px] font-bold text-white">
                {USER.initials}
              </span>
              <span className="hidden text-left leading-tight lg:block">
                <span className="block text-[12px] font-semibold text-ink-800">{USER.name.split(" ")[0]}</span>
                <span className="block text-[10px] text-ink-400">{USER.role}</span>
              </span>
            </button>
          }
        >
          <MenuStatic>
            <p className="text-[12.5px] font-semibold text-ink-900">{USER.name}</p>
            <p className="text-[11.5px] text-ink-500">{USER.role}</p>
            <span className="mt-1.5 inline-flex">
              <Badge tone="brand">Timetable coordinator</Badge>
            </span>
          </MenuStatic>
          <MenuSeparator />
          <MenuItem icon={User2} label="Profile" onClick={notReady("Profile")} />
          <MenuItem icon={SettingsIcon} label="Workspace settings" onClick={go("/settings")} />
          <MenuItem icon={ArrowLeft} label="Back to landing page" onClick={go("/")} />
          <MenuSeparator />
          <MenuItem icon={LogOut} label="Sign out" danger onClick={go("/")} />
        </Dropdown>
      </div>
    </header>
  );
}
