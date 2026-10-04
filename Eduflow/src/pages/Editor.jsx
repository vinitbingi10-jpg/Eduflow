import { useEffect } from "react";
import { Loader2, MessageSquare, PanelRight } from "lucide-react";
import { useTimetable } from "@/store/TimetableContext.jsx";
import { TopBar } from "@/components/layout/TopBar.jsx";
import { Toolbar } from "@/components/layout/Toolbar.jsx";
import { Sidebar } from "@/components/layout/Sidebar.jsx";
import { StatusBar } from "@/components/layout/StatusBar.jsx";
import { TimetableCanvas } from "@/components/timetable/TimetableCanvas.jsx";
import { PropertyPanel } from "@/components/timetable/PropertyPanel.jsx";
import { ConflictPanel } from "@/components/timetable/ConflictPanel.jsx";
import { ContextMenu } from "@/components/timetable/ContextMenu.jsx";
import { AIChat } from "@/components/ai/AIChat.jsx";
import { AddClassModal } from "@/components/modals/AddClassModal.jsx";
import { GenerateModal } from "@/components/modals/GenerateModal.jsx";
import { ConflictModal, MoveConfirmDialog } from "@/components/modals/ConflictModal.jsx";
import { ExportModal } from "@/components/modals/ExportModal.jsx";
import { SearchModal } from "@/components/modals/SearchModal.jsx";
import { ShortcutsModal, WorkflowModal } from "@/components/modals/ShortcutsModal.jsx";
import { QuickAddModal } from "@/components/modals/QuickAddModal.jsx";
import { SLOTS, DAYS } from "@/data/mockData.js";
import { cn } from "@/utils/cn.js";

export default function Editor() {
  const store = useTimetable();
  const {
    ready, ui, patchUi, selection, entries, settings, setSettings, clearSelection, selectCell,
    undo, redo, save, copyEntry, pasteEntry, duplicateEntry, deleteEntries, toggleLock, lockRow,
    openModal, closeModal, exportAs,
  } = store;

  /* ----------------------------- keyboard map ---------------------------- */
  useEffect(() => {
    function onKeyDown(event) {
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      const target = document.activeElement;
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName) || target?.isContentEditable;

      if (mod && (key === "k" || key === "f")) {
        event.preventDefault();
        patchUi({ search: true });
        return;
      }
      if (mod && key === "s") {
        event.preventDefault();
        save();
        return;
      }
      if (mod && key === "g") {
        event.preventDefault();
        openModal("generate");
        return;
      }
      if (mod && key === "p") {
        event.preventDefault();
        exportAs("print");
        return;
      }
      if (typing) return;

      if (mod && key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if (mod && (key === "y" || (key === "z" && event.shiftKey))) {
        event.preventDefault();
        redo();
      } else if (mod && key === "c") {
        event.preventDefault();
        if (selection.entryIds[0]) copyEntry(selection.entryIds[0]);
      } else if (mod && key === "v") {
        event.preventDefault();
        pasteEntry();
      } else if (mod && key === "d") {
        event.preventDefault();
        if (selection.entryIds[0]) duplicateEntry(selection.entryIds[0]);
      } else if (mod && key === "l") {
        event.preventDefault();
        if (event.shiftKey) lockRow(settings.activeDay);
        else if (selection.entryIds.length) toggleLock(selection.entryIds);
      } else if (mod && event.key === "Enter") {
        event.preventDefault();
        openModal("add", selection.cell ?? {});
      } else if (mod && (event.key === "=" || event.key === "+")) {
        event.preventDefault();
        setSettings({ zoom: Math.min(160, settings.zoom + 10) });
      } else if (mod && event.key === "-") {
        event.preventDefault();
        setSettings({ zoom: Math.max(60, settings.zoom - 10) });
      } else if (mod && event.key === "0") {
        event.preventDefault();
        setSettings({ zoom: 100, view: "week" });
      } else if (mod && event.key === "1") {
        event.preventDefault();
        setSettings({ view: "week" });
      } else if (mod && event.key === "2") {
        event.preventDefault();
        setSettings({ view: "day" });
      } else if (event.key === "Delete" || event.key === "Backspace") {
        if (selection.entryIds.length) {
          event.preventDefault();
          deleteEntries(selection.entryIds);
        }
      } else if (event.key === "Escape") {
        patchUi({ contextMenu: null, pendingMove: null, rightPanel: null });
        clearSelection();
      } else if (event.key.startsWith("Arrow") && selection.cell) {
        event.preventDefault();
        moveSelection(event.key);
      }
    }

    function moveSelection(direction) {
      const dayIndex = DAYS.findIndex((d) => d.id === selection.cell.day);
      const slotIndex = SLOTS.findIndex((s) => s.id === selection.cell.slot);
      let nextDay = dayIndex;
      let nextSlot = slotIndex;
      if (direction === "ArrowLeft") nextDay = Math.max(0, dayIndex - 1);
      if (direction === "ArrowRight") nextDay = Math.min(DAYS.length - 1, dayIndex + 1);
      if (direction === "ArrowUp") nextSlot = Math.max(0, slotIndex - 1);
      if (direction === "ArrowDown") nextSlot = Math.min(SLOTS.length - 1, slotIndex + 1);
      const slot = SLOTS[nextSlot];
      if (slot?.kind === "break") return;
      selectCell({ day: DAYS[nextDay].id, slot: slot.id }, { keepEntries: true });
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    patchUi, save, openModal, exportAs, undo, redo, selection, copyEntry, pasteEntry, duplicateEntry,
    deleteEntries, toggleLock, lockRow, settings, setSettings, clearSelection, selectCell,
  ]);

  if (!ready) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-canvas">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
        <p className="text-[13px] text-ink-500">Loading timetable workspace…</p>
      </div>
    );
  }

  const rightPanelOpen = ui.rightPanel && (selection.entryIds.length > 0 || ui.rightPanel === "conflicts");

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas">
      <TopBar />
      <Toolbar />

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />

        {/* canvas + slide-over inspector */}
        <div
          className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-white"
          onClick={() => {
            if (ui.contextMenu) patchUi({ contextMenu: null });
            // on phones the asset sidebar is a drawer: tap the canvas to dismiss it
            if (ui.sidebar && window.matchMedia("(max-width: 767px)").matches) patchUi({ sidebar: false });
          }}
        >
          <TimetableCanvas />

          {rightPanelOpen && (
            <div className="print-hide absolute bottom-3 right-3 top-3 z-20 w-[19.5rem] animate-slide-left">
              {ui.rightPanel === "conflicts" ? (
                <ConflictPanel onClose={() => patchUi({ rightPanel: null })} />
              ) : (
                <PropertyPanel onClose={() => patchUi({ rightPanel: null })} />
              )}
            </div>
          )}

          {!rightPanelOpen && (
            <button
              type="button"
              onClick={() => patchUi({ rightPanel: selection.entryIds.length ? "properties" : "conflicts" })}
              className="print-hide absolute bottom-3 right-3 z-10 flex h-8 items-center gap-1.5 rounded-md border border-ink-200 bg-white/95 px-2.5 text-[11.5px] font-semibold text-ink-500 shadow-panel backdrop-blur transition hover:-translate-y-px hover:border-brand-300 hover:text-brand-700"
            >
              <PanelRight className="h-3.5 w-3.5" strokeWidth={2} />
              <span className="hidden md:inline">{selection.entryIds.length ? "Properties" : "Conflicts"}</span>
            </button>
          )}
        </div>

        {/* AI assistant — permanently docked on desktop */}
        {ui.aiOpen && (
          <div className="print-hide hidden w-[21rem] shrink-0 border-l border-ink-200 bg-canvas p-2 lg:block xl:w-[24rem]">
            <AIChat onClose={() => patchUi({ aiOpen: false })} />
          </div>
        )}
      </div>

      <StatusBar />

      {/* floating assistant launcher on small screens */}
      {!ui.aiOpen && (
        <button
          type="button"
          onClick={() => patchUi({ aiOpen: true })}
          className="print-hide fixed bottom-11 right-4 z-40 flex h-11 items-center gap-2 rounded-full bg-brand-600 px-4 text-[13px] font-semibold text-white shadow-pop transition hover:-translate-y-0.5 hover:bg-brand-700 lg:hidden"
        >
          <MessageSquare className="h-4 w-4" strokeWidth={2.2} />
          Ask Eduflow
        </button>
      )}

      {/* AI assistant — slide-over below the desktop breakpoint */}
      <div
        className={cn(
          "print-hide fixed inset-0 z-[110] lg:hidden",
          ui.aiOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
      >
        <div
          className={cn("absolute inset-0 bg-ink-900/45 transition-opacity duration-200", ui.aiOpen ? "opacity-100" : "opacity-0")}
          onClick={() => patchUi({ aiOpen: false })}
        />
        <div
          className={cn(
            "absolute inset-y-0 right-0 w-[min(24rem,100vw)] bg-canvas p-2 transition-transform duration-250 ease-out",
            ui.aiOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          <AIChat onClose={() => patchUi({ aiOpen: false })} compactHeader />
        </div>
      </div>

      {/* dialogs */}
      <AddClassModal />
      <GenerateModal />
      <ConflictModal />
      <MoveConfirmDialog />
      <ExportModal />
      <SearchModal />
      <ShortcutsModal />
      <WorkflowModal />
      <QuickAddModal />
      <ContextMenu />

      <span className="sr-only" aria-live="polite">
        {entries.length} scheduled classes
      </span>
    </div>
  );
}
