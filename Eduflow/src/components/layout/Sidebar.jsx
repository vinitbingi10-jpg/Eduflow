import { useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  Clipboard,
  Clock,
  Coffee,
  DoorOpen,
  FlaskConical,
  GraduationCap,
  GripVertical,
  Layers,
  Presentation,
  Plus,
  Search,
  Square,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/utils/cn.js";
import { DRAG_ELEMENTS } from "@/data/mockData.js";
import { useTimetable } from "@/store/TimetableContext.jsx";
import { Tooltip } from "@/components/common/Tooltip.jsx";
import { categoryHex } from "@/components/timetable/TimetableCard.jsx";
import { dayLabel, nextFreeSlot, slotLabel } from "@/utils/timetableUtils.js";

const ELEMENT_ICONS = {
  coffee: Coffee,
  square: Square,
  utensils: UtensilsCrossed,
  presentation: Presentation,
  clipboard: Clipboard,
  flask: FlaskConical,
};

const TABS = [
  { id: "classes", label: "Classes", icon: CalendarDays },
  { id: "subjects", label: "Subjects", icon: BookOpen },
  { id: "teachers", label: "Teachers", icon: GraduationCap },
  { id: "rooms", label: "Rooms", icon: DoorOpen },
  { id: "elements", label: "Elements", icon: Layers },
];

/** Left asset rail — drag anything from here straight onto the canvas. */
export function Sidebar() {
  const { ui, patchUi, data, entries, conflicts, addEntry, focusEntry, selection, settings, openModal } = useTimetable();
  const quickAddKind = { subjects: "subject", teachers: "teacher", rooms: "room" }[ui.sidebarTab];
  const [query, setQuery] = useState("");
  const open = ui.sidebar;
  const tab = ui.sidebarTab;

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (value) => !q || String(value).toLowerCase().includes(q);

    if (tab === "classes") {
      return entries
        .filter((entry) => match(`${entry.subjectId} ${entry.label ?? ""} ${dayLabel(entry.day)} ${slotLabel(entry.slot)}`))
        .map((entry) => ({
          id: entry.id,
          title: entry.label || conflicts.lookups.subjectById[entry.subjectId]?.short || entry.subjectId || "Free period",
          meta: `${dayLabel(entry.day, "short")} ${slotLabel(entry.slot)} · ${conflicts.lookups.roomById[entry.roomId]?.name ?? "—"}`,
          color: entry.color,
          badge: entry.locked ? "locked" : null,
          drag: { kind: "entry", id: entry.id, span: entry.span || 1 },
          onClick: () => focusEntry(entry.id),
          active: selection.entryIds.includes(entry.id),
        }));
    }
    if (tab === "subjects") {
      return data.subjects
        .filter((subject) => match(`${subject.name} ${subject.code} ${subject.short}`))
        .map((subject) => ({
          id: subject.id,
          title: subject.short,
          meta: `${subject.code} · ${subject.hoursPerWeek} h/week · ${subject.type}`,
          color: subject.color,
          badge: `${entries.filter((e) => e.subjectId === subject.id).length}/${subject.hoursPerWeek}`,
          drag: { kind: "subject", id: subject.id, type: subject.type },
          add: { subjectId: subject.id, type: subject.type, color: subject.color },
        }));
    }
    if (tab === "teachers") {
      return data.teachers
        .filter((teacher) => match(`${teacher.name} ${teacher.departmentId}`))
        .map((teacher) => ({
          id: teacher.id,
          title: teacher.name,
          meta: `${conflicts.lookups.departmentById[teacher.departmentId]?.code ?? teacher.departmentId} · max ${teacher.maxWeeklyLoad} h`,
          color: "slate",
          badge: `${entries.filter((e) => e.teacherId === teacher.id).reduce((n, e) => n + (e.span || 1), 0)} h`,
          drag: { kind: "teacher", id: teacher.id },
          add: { teacherId: teacher.id },
        }));
    }
    if (tab === "rooms") {
      return data.rooms
        .filter((room) => match(`${room.name} ${room.type}`))
        .map((room) => ({
          id: room.id,
          title: room.name,
          meta: `${room.type} · ${room.capacity} seats · Block ${room.block}`,
          color: room.type === "Classroom" ? "blue" : "plum",
          badge: room.available ? null : "closed",
          drag: { kind: "room", id: room.id },
          add: { roomId: room.id },
        }));
    }
    return DRAG_ELEMENTS.filter((element) => match(element.label)).map((element) => ({
      id: element.id,
      title: element.label,
      meta: `Insert as ${element.type}`,
      color: element.color,
      drag: { kind: "element", id: element.id, label: element.label, type: element.type, color: element.color },
      add: { subjectId: null, label: element.label, type: element.type, color: element.color },
    }));
  }, [tab, query, data, entries, conflicts.lookups, focusEntry, selection.entryIds]);

  function quickAdd(payload) {
    const cell =
      selection.cell ??
      (() => {
        const free = nextFreeSlot(entries, { span: 1 });
        return free ? { day: free.day, slot: free.slot } : null;
      })();
    if (!cell) return;
    addEntry({ ...payload, day: cell.day, slot: cell.slot });
  }

  if (!open) {
    return (
      <nav className="print-hide flex w-11 shrink-0 flex-col items-center gap-1 border-r border-ink-200 bg-white py-2 max-md:hidden">
        <Tooltip label="Expand asset sidebar" side="bottom">
          <button
            type="button"
            onClick={() => patchUi({ sidebar: true })}
            className="flex h-7 w-7 items-center justify-center rounded-md text-ink-500 transition hover:bg-ink-100 hover:text-ink-800"
          >
            <ChevronLeft className="h-4 w-4 rotate-180" strokeWidth={2} />
          </button>
        </Tooltip>
        <span className="my-1 h-px w-5 bg-ink-200" />
        {TABS.map((item) => (
          <Tooltip key={item.id} label={item.label} side="bottom">
            <button
              type="button"
              onClick={() => patchUi({ sidebar: true, sidebarTab: item.id })}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md transition",
                tab === item.id ? "bg-brand-50 text-brand-600" : "text-ink-500 hover:bg-ink-100 hover:text-ink-800"
              )}
            >
              <item.icon className="h-4 w-4" strokeWidth={2} />
            </button>
          </Tooltip>
        ))}
      </nav>
    );
  }

  return (
    <aside className="print-hide flex w-60 shrink-0 flex-col overflow-hidden border-r border-ink-200 bg-white xl:w-64 max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-[60] max-md:w-64 max-md:shadow-pop">
      <header className="flex items-center gap-2 border-b border-ink-200 px-2.5 py-2">
        <span className="flex h-6 w-6 items-center justify-center rounded bg-ink-900 text-white">
          <Layers className="h-3.5 w-3.5" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[12px] font-bold uppercase tracking-[0.06em] text-ink-700">Assets</h2>
          <p className="truncate text-[10.5px] text-ink-400">Drag onto the grid</p>
        </div>
        <button
          type="button"
          onClick={() => patchUi({ sidebar: false })}
          className="flex h-6 w-6 items-center justify-center rounded text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
          aria-label="Collapse sidebar"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
        </button>
      </header>

      <div className="flex gap-0.5 border-b border-ink-100 px-1.5 py-1.5">
        {TABS.map((item) => (
          <Tooltip key={item.id} label={item.label} side="bottom">
            <button
              type="button"
              onClick={() => patchUi({ sidebarTab: item.id })}
              className={cn(
                "flex h-7 flex-1 items-center justify-center rounded transition",
                tab === item.id ? "bg-brand-600 text-white" : "text-ink-500 hover:bg-ink-100 hover:text-ink-800"
              )}
            >
              <item.icon className="h-[15px] w-[15px]" strokeWidth={2} />
            </button>
          </Tooltip>
        ))}
      </div>

      <div className="border-b border-ink-100 p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Filter ${tab}…`}
            className="h-7 w-full rounded border border-ink-200 bg-ink-50/60 pl-7 pr-2 text-[12px] text-ink-800 transition placeholder:text-ink-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/15"
          />
        </div>
      </div>

      {quickAddKind && (
        <div className="border-b border-ink-100 px-2 py-1.5">
          <button
            type="button"
            onClick={() => openModal(quickAddKind)}
            className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-brand-300 bg-brand-50/60 text-[12px] font-semibold text-brand-700 transition hover:bg-brand-50"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
            Add {quickAddKind}
          </button>
        </div>
      )}

      <ul className="scroll-slim min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {items.map((item) => {
          const Icon = tab === "elements" ? ELEMENT_ICONS[item.drag?.id] ?? Clock : null;
          return (
            <li key={item.id}>
              <div
                draggable={Boolean(item.drag)}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = item.drag.kind === "entry" ? "move" : "copy";
                  event.dataTransfer.setData("text/plain", item.id);
                  patchUi({ drag: item.drag });
                }}
                onDragEnd={() => patchUi({ drag: null })}
                onClick={item.onClick}
                className={cn(
                  "group flex cursor-grab items-center gap-2 rounded-md border border-ink-100 bg-white px-2 py-1.5 transition active:cursor-grabbing",
                  "hover:-translate-y-px hover:border-brand-200 hover:bg-brand-50/40 hover:shadow-panel",
                  item.active && "border-brand-300 bg-brand-50",
                  item.badge === "locked" && "border-ink-200 bg-ink-50"
                )}
              >
                <span className="h-7 w-1 shrink-0 rounded-full" style={{ background: categoryHex(item.color) }} />
                {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-ink-400" strokeWidth={2} />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-semibold text-ink-800">{item.title}</span>
                  <span className="block truncate text-[10.5px] text-ink-400">{item.meta}</span>
                </span>
                {item.badge && (
                  <span
                    className={cn(
                      "shrink-0 rounded px-1 py-0.5 font-mono text-[9.5px] font-semibold uppercase",
                      item.badge === "locked" ? "bg-ink-200 text-ink-600" : item.badge === "closed" ? "bg-danger-50 text-danger-600" : "bg-ink-100 text-ink-500"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
                {item.add && (
                  <Tooltip label="Place in the next free period" side="top" delay={250}>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        quickAdd(item.add);
                      }}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-ink-300 opacity-0 transition group-hover:opacity-100 hover:bg-brand-100 hover:text-brand-700"
                      aria-label={`Add ${item.title}`}
                    >
                      <Plus className="h-3 w-3" strokeWidth={2.6} />
                    </button>
                  </Tooltip>
                )}
                <GripVertical className="h-3 w-3 shrink-0 text-ink-200 transition group-hover:text-ink-400" strokeWidth={2.4} />
              </div>
            </li>
          );
        })}
        {!items.length && query && (
          <li className="rounded-md border border-dashed border-ink-200 p-4 text-center text-[11.5px] text-ink-400">
            Nothing matches “{query}”.
          </li>
        )}
        {!items.length && !query && (
          <li className="rounded-md border border-dashed border-ink-200 p-4 text-center text-[11.5px] text-ink-400">
            {tab === "classes" && "No classes yet. Double-click a cell or drag a subject here."}
            {tab === "subjects" && "No subjects yet. Click “Add subject” above."}
            {tab === "teachers" && "No teachers yet. Click “Add teacher” above."}
            {tab === "rooms" && "No rooms yet. Click “Add room” above."}
          </li>
        )}
      </ul>

      <footer className="border-t border-ink-100 bg-ink-50/60 px-2.5 py-1.5 text-[10.5px] text-ink-400">
        {tab === "classes"
          ? `${entries.length} scheduled · ${settings.visibleDays.length} working days`
          : `${items.length} ${tab} · drag to schedule`}
      </footer>
    </aside>
  );
}
