import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CornerDownLeft,
  DoorOpen,
  FileText,
  GraduationCap,
  LayoutGrid,
  Search,
  Settings as SettingsIcon,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/utils/cn.js";
import { useTimetable } from "@/store/TimetableContext.jsx";
import { useToast } from "@/components/common/Toast.jsx";
import { RECENT_TIMETABLES } from "@/data/mockData.js";
import { dayLabel, slotLabel } from "@/utils/timetableUtils.js";

/** Ctrl+K command palette: searches data, pages and actions at once. */
export function SearchModal() {
  const { ui, patchUi, entries, data, focusEntry, openModal, runPrompt } = useTimetable();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const open = ui.search;

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const has = (value) => !q || String(value).toLowerCase().includes(q);
    const out = [];

    entries.forEach((entry) => {
      const subject = data.subjects.find((s) => s.id === entry.subjectId);
      const teacher = data.teachers.find((t) => t.id === entry.teacherId);
      const room = data.rooms.find((r) => r.id === entry.roomId);
      const haystack = `${subject?.name ?? ""} ${subject?.code ?? ""} ${entry.label ?? ""} ${teacher?.name ?? ""} ${room?.name ?? ""} ${dayLabel(entry.day)} ${slotLabel(entry.slot)}`;
      if (!has(haystack)) return;
      out.push({
        id: `class-${entry.id}`,
        group: "Classes",
        icon: CalendarDays,
        title: subject?.short ?? entry.label ?? entry.subjectId ?? "Free period",
        detail: `${teacher?.name ?? "Unassigned"} · ${room?.name ?? "No room"}`,
        meta: `${dayLabel(entry.day, "short")} ${slotLabel(entry.slot)}`,
        run: () => focusEntry(entry.id),
      });
    });

    data.subjects.filter((s) => has(`${s.name} ${s.code} ${s.short}`)).forEach((subject) => {
      out.push({
        id: `subject-${subject.id}`,
        group: "Subjects",
        icon: BookOpen,
        title: subject.name,
        detail: `${subject.code} · ${subject.hoursPerWeek} h/week · ${subject.type}`,
        run: () => navigate("/subjects"),
      });
    });

    data.teachers.filter((t) => has(`${t.name} ${t.departmentId}`)).forEach((teacher) => {
      out.push({
        id: `teacher-${teacher.id}`,
        group: "Teachers",
        icon: GraduationCap,
        title: teacher.name,
        detail: `${teacher.departmentId.toUpperCase()} · max ${teacher.maxWeeklyLoad} h/week`,
        run: () => navigate("/teachers"),
      });
    });

    data.rooms.filter((r) => has(`${r.name} ${r.type}`)).forEach((room) => {
      out.push({
        id: `room-${room.id}`,
        group: "Rooms",
        icon: DoorOpen,
        title: room.name,
        detail: `${room.type} · ${room.capacity} seats`,
        run: () => navigate("/rooms"),
      });
    });

    RECENT_TIMETABLES.filter((tt) => has(`${tt.title} ${tt.department}`)).forEach((tt) => {
      out.push({
        id: `tt-${tt.id}`,
        group: "Timetables",
        icon: FileText,
        title: tt.title,
        detail: tt.meta,
        run: () => navigate("/dashboard"),
      });
    });

    const actions = [
      { id: "a-generate", title: "Generate timetable with AI", icon: Sparkles, run: () => openModal("generate") },
      { id: "a-fix", title: "Fix all conflicts", icon: Wrench, run: () => { patchUi({ aiOpen: true }); runPrompt("Fix all conflicts in the timetable"); } },
      { id: "a-dashboard", title: "Go to dashboard", icon: LayoutGrid, run: () => navigate("/dashboard") },
      { id: "a-settings", title: "Open settings", icon: SettingsIcon, run: () => navigate("/settings") },
    ];
    actions.filter((action) => has(action.title)).forEach((action) => {
      out.push({ ...action, group: "Actions", detail: "Command" });
    });

    return out.slice(0, 40);
  }, [query, entries, data, focusEntry, navigate, openModal, patchUi, runPrompt]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  useEffect(() => {
    const node = listRef.current?.children[cursor];
    node?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  if (!open) return null;

  function execute(index) {
    const item = results[index];
    if (!item) return;
    patchUi({ search: false });
    item.run();
  }

  const grouped = results.reduce((acc, item) => {
    acc[item.group] = acc[item.group] ?? [];
    acc[item.group].push(item);
    return acc;
  }, {});

  let flatIndex = -1;

  return createPortal(
    <div className="print-hide fixed inset-0 z-[130] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 animate-fade-in bg-ink-900/45 backdrop-blur-[2px]" onClick={() => patchUi({ search: false })} />
      <div className="relative z-10 w-full max-w-2xl animate-pop-in overflow-hidden rounded-lg border border-ink-200 bg-white shadow-pop">
        <div className="flex items-center gap-2.5 border-b border-ink-100 px-3.5 py-3">
          <Search className="h-4 w-4 shrink-0 text-ink-400" strokeWidth={2.2} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setCursor((c) => Math.min(c + 1, results.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              } else if (event.key === "Enter") {
                event.preventDefault();
                execute(cursor);
              } else if (event.key === "Escape") {
                patchUi({ search: false });
              }
            }}
            placeholder="Search classes, subjects, teachers, rooms or run a command…"
            className="flex-1 bg-transparent text-[14px] text-ink-900 outline-none placeholder:text-ink-300"
          />
          <kbd className="rounded border border-ink-200 bg-ink-50 px-1.5 py-0.5 font-mono text-[10px] text-ink-400">Esc</kbd>
        </div>

        <div ref={listRef} className="scroll-slim max-h-[52vh] overflow-y-auto py-1.5">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <p className="px-3.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.09em] text-ink-400">{group}</p>
              {items.map((item) => {
                flatIndex += 1;
                const index = flatIndex;
                const active = index === cursor;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => execute(index)}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3.5 py-2 text-left transition-colors",
                      active ? "bg-brand-50" : "hover:bg-ink-50"
                    )}
                  >
                    <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md ring-1", active ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-ink-500 ring-ink-200")}>
                      <item.icon className="h-3.5 w-3.5" strokeWidth={2.1} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink-900">{item.title}</span>
                      <span className="block truncate text-[11.5px] text-ink-400">{item.detail}</span>
                    </span>
                    {item.meta && <span className="shrink-0 font-mono text-[11px] text-ink-500">{item.meta}</span>}
                    {active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-brand-500" />}
                    {!active && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-200" />}
                  </button>
                );
              })}
            </div>
          ))}
          {!results.length && (
            <p className="px-4 py-10 text-center text-[13px] text-ink-400">
              No matches for “{query}”. Try a subject code (CS301), a teacher name or a room number.
            </p>
          )}
        </div>

        <footer className="flex items-center gap-3 border-t border-ink-100 bg-ink-50/70 px-3.5 py-2 text-[11px] text-ink-400">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-ink-200 bg-white px-1 font-mono">↑↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-ink-200 bg-white px-1 font-mono">↵</kbd> open
          </span>
          <span className="ml-auto">{results.length} result{results.length === 1 ? "" : "s"}</span>
        </footer>
      </div>
    </div>,
    document.body
  );
}
