import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Copy,
  Lock,
  LockOpen,
  MessageSquarePlus,
  Move,
  Pencil,
  Plus,
  ScanSearch,
  Sparkles,
  Trash2,
  ClipboardPaste,
} from "lucide-react";
import { cn } from "@/utils/cn.js";
import { useTimetable } from "@/store/TimetableContext.jsx";
import { nextFreeSlot, dayLabel, slotLabel } from "@/utils/timetableUtils.js";

const WIDTH = 232;

/** Right-click menu for cells and class cards. */
export function ContextMenu() {
  const { ui, patchUi, entries, clipboard, openModal, pasteEntry, duplicateEntry, moveEntry, toggleLock, lockRow, lockColumn, deleteEntries, runPrompt, conflicts } =
    useTimetable();
  const menu = ui.contextMenu;
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    if (!menu) return;
    const height = ref.current?.offsetHeight ?? 320;
    setPos({
      x: Math.min(menu.x, window.innerWidth - WIDTH - 12),
      y: Math.min(menu.y, window.innerHeight - height - 12),
    });
  }, [menu]);

  useEffect(() => {
    if (!menu) return undefined;
    const close = () => patchUi({ contextMenu: null });
    const onKey = (event) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu, patchUi]);

  if (!menu) return null;

  const entry = entries.find((e) => e.id === menu.entryId) ?? null;
  const close = () => patchUi({ contextMenu: null });
  const run = (fn) => () => {
    close();
    fn();
  };

  const freeTarget = entry ? nextFreeSlot(entries, { span: entry.span || 1, excludeIds: [entry.id], teacherId: entry.teacherId }) : null;

  const Item = ({ icon: Icon, label, onClick, disabled, danger, hint }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[12.5px] transition-colors duration-100",
        "disabled:cursor-not-allowed disabled:opacity-40",
        danger ? "text-danger-600 hover:bg-danger-50" : "text-ink-700 hover:bg-brand-50 hover:text-brand-700"
      )}
    >
      <Icon className="h-[15px] w-[15px] shrink-0 opacity-80" strokeWidth={2} />
      <span className="flex-1 truncate font-medium">{label}</span>
      {hint && <span className="shrink-0 font-mono text-[10.5px] text-ink-400">{hint}</span>}
    </button>
  );

  return createPortal(
    <div
      ref={ref}
      style={{ top: pos.y, left: pos.x, width: WIDTH }}
      className="print-hide fixed z-[150] animate-pop-in overflow-hidden rounded-md border border-ink-200 bg-white py-1 shadow-pop"
      onContextMenu={(event) => event.preventDefault()}
      role="menu"
    >
      <p className="border-b border-ink-100 px-3 pb-1.5 pt-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-400">
        {entry ? "Class actions" : `${dayLabel(menu.day, "short")} · ${slotLabel(menu.slot)}`}
      </p>

      <Item icon={Plus} label="Add Class" hint="⏎" onClick={run(() => openModal("add", { day: menu.day, slot: menu.slot }))} />
      <Item icon={ClipboardPaste} label="Paste" disabled={!clipboard} onClick={run(() => pasteEntry({ day: menu.day, slot: menu.slot }))} />
      <Item icon={Copy} label="Duplicate" disabled={!entry} onClick={run(() => duplicateEntry(entry.id))} />
      <Item icon={Pencil} label="Edit" disabled={!entry} onClick={run(() => openModal("add", { entry }))} />

      <div className="my-1 h-px bg-ink-100" />

      <Item
        icon={Move}
        label={freeTarget ? `Move to ${dayLabel(freeTarget.day, "short")} ${freeTarget.slot}` : "Move to free slot"}
        disabled={!entry || !freeTarget}
        onClick={run(() => moveEntry(entry.id, freeTarget.day, freeTarget.slot, { force: true, silent: true }))}
      />
      <Item icon={Lock} label={entry?.locked ? "Unlock" : "Lock"} disabled={!entry} onClick={run(() => toggleLock([entry.id], !entry.locked))} />
      <Item icon={LockOpen} label="Lock whole day" onClick={run(() => lockRow(menu.day))} />
      <Item icon={LockOpen} label="Lock this period" onClick={run(() => lockColumn(menu.slot))} />
      <Item icon={Trash2} label="Delete" danger disabled={!entry} hint="Del" onClick={run(() => deleteEntries([entry.id]))} />

      <div className="my-1 h-px bg-ink-100" />

      <Item icon={ScanSearch} label="Check Conflicts" hint={String(conflicts.total)} onClick={run(() => openModal("conflicts"))} />
      <Item
        icon={Sparkles}
        label="Find Available Slots"
        onClick={run(() =>
          runPrompt(entry ? `Find a free slot for ${entry.subjectId ?? "this class"}` : "Find a free slot")
        )}
      />
      <Item
        icon={MessageSquarePlus}
        label="Ask AI about this"
        onClick={run(() => {
          patchUi({ aiOpen: true });
          runPrompt(entry ? `Explain the conflicts around ${entry.subjectId ?? "this class"}` : "Explain the current conflicts");
        })}
      />
      {entry?.locked && (
        <p className="border-t border-ink-100 px-3 py-1.5 text-[11px] text-ink-400">
          🔒 Locked cells are ignored by AI generation and drag &amp; drop.
        </p>
      )}
    </div>,
    document.body
  );
}
