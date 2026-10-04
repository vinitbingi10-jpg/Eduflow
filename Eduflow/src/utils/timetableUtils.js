import { DAYS, SLOTS, SUBJECTS, TEACHERS, ROOMS, DEPARTMENTS } from "@/data/mockData.js";

/* ------------------------------ Lookups ------------------------------ */

export function makeLookups(data = {}) {
  const subjects = data.subjects ?? SUBJECTS;
  const teachers = data.teachers ?? TEACHERS;
  const rooms = data.rooms ?? ROOMS;
  const departments = data.departments ?? DEPARTMENTS;

  const byId = (list) => Object.fromEntries(list.map((item) => [item.id, item]));

  return {
    subjects,
    teachers,
    rooms,
    departments,
    subjectById: byId(subjects),
    teacherById: byId(teachers),
    roomById: byId(rooms),
    departmentById: byId(departments),
  };
}

export const defaultLookups = makeLookups();

export const dayById = Object.fromEntries(DAYS.map((d) => [d.id, d]));
export const DAY_LABELS = Object.fromEntries(DAYS.map((d) => [d.id, d.short]));
export const slotById = Object.fromEntries(SLOTS.map((s) => [s.id, s]));

/* ------------------------------ Slot math ---------------------------- */

export function slotIndex(slotId) {
  return SLOTS.findIndex((s) => s.id === slotId);
}

/** Teaching slot ids an entry covers, skipping break rows (labs span 2). */
export function coveredSlots(entry) {
  const start = slotIndex(entry.slot);
  if (start < 0) return [entry.slot];
  const span = Math.max(1, entry.span || 1);
  const slots = [];
  for (let i = start; i < SLOTS.length && slots.length < span; i += 1) {
    if (SLOTS[i].kind === "break") continue;
    slots.push(SLOTS[i].id);
  }
  return slots;
}

/** Grid geometry for an entry: covered slots + how many grid rows it spans. */
export function gridSpan(entry) {
  const slots = coveredSlots(entry);
  const start = slotIndex(entry.slot);
  const end = slots.length ? slotIndex(slots[slots.length - 1]) : start;
  return { slots, rowSpan: Math.max(1, end - start + 1) };
}

export function cellKey(day, slot) {
  return `${day}|${slot}`;
}

/** Map of "day|slot" -> entries anchored in that cell. */
export function anchorMap(entries) {
  const map = new Map();
  entries.forEach((entry) => {
    const key = cellKey(entry.day, entry.slot);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(entry);
  });
  return map;
}

/** Set of every "day|slot" occupied by an entry (including spans). */
export function occupancy(entries) {
  const set = new Set();
  entries.forEach((entry) => {
    coveredSlots(entry).forEach((slot) => set.add(cellKey(entry.day, slot)));
  });
  return set;
}

export function entriesAt(entries, day, slot) {
  return entries.filter((entry) => entry.day === day && coveredSlots(entry).includes(slot));
}

export function slotLabel(slotId) {
  const slot = slotById[slotId];
  return slot ? `${slot.start}–${slot.end}` : "—";
}

export function dayLabel(dayId, style = "long") {
  const day = dayById[dayId];
  if (!day) return dayId;
  return style === "short" ? day.short : day.label;
}

export function format12h(time24) {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

/* ---------------------------- Entry helpers --------------------------- */

let counter = 0;
export function newEntryId() {
  counter += 1;
  return `cls-${Date.now().toString(36)}-${counter}`;
}

export function createEntry(partial = {}) {
  const subject = defaultLookups.subjectById[partial.subjectId];
  return {
    id: partial.id ?? newEntryId(),
    day: partial.day ?? "mon",
    slot: partial.slot ?? "p1",
    span: partial.span ?? (partial.type === "Practical" || partial.type === "Laboratory" ? 2 : 1),
    subjectId: "subjectId" in partial ? partial.subjectId : subject?.id ?? null,
    label: partial.label ?? "",
    teacherId: partial.teacherId ?? subject?.teacherId ?? null,
    roomId: partial.roomId ?? null,
    type: partial.type ?? subject?.type ?? "Lecture",
    locked: Boolean(partial.locked),
    color: partial.color ?? subject?.color ?? "slate",
    departmentId: partial.departmentId ?? subject?.departmentId ?? "cse",
    semester: partial.semester ?? 3,
    division: partial.division ?? "A",
    courseId: partial.courseId ?? "btech-cse",
    note: partial.note ?? "",
    source: partial.source ?? "manual",
  };
}

/** Describe an entry in one human readable line. */
export function describeEntry(entry, lookups = defaultLookups) {
  const subject = lookups.subjectById[entry.subjectId];
  const teacher = lookups.teacherById[entry.teacherId];
  const room = lookups.roomById[entry.roomId];
  return `${subject?.short ?? entry.subjectId} · ${teacher?.name ?? "Unassigned"} · ${room?.name ?? "No room"} · ${dayLabel(entry.day)} ${slotLabel(entry.slot)}`;
}

/* --------------------------- Free-slot search -------------------------- */

/**
 * Find slots where a session can go without any conflict.
 * Locked cells are always skipped — the user's decisions are final.
 */
export function findFreeSlots(entries, { span = 1, days = DAYS.map((d) => d.id), excludeIds = [], teacherId, roomId } = {}) {
  const others = entries.filter((e) => !excludeIds.includes(e.id));
  const results = [];

  days.forEach((day) => {
    SLOTS.forEach((slot, index) => {
      if (slot.kind === "break") return;
      const needed = SLOTS.slice(index, index + span).filter((s) => s.kind !== "break").map((s) => s.id);
      if (needed.length < span) return;

      let blocked = false;
      const reason = [];
      needed.forEach((slotId) => {
        entriesAt(others, day, slotId).forEach((other) => {
          blocked = true;
          reason.push(`${other.locked ? "Locked: " : ""}${defaultLookups.subjectById[other.subjectId]?.short ?? other.subjectId}`);
        });
      });

      if (teacherId) {
        const teacher = defaultLookups.teacherById[teacherId];
        const un = teacher?.unavailable?.find((u) => u.day === day);
        if (un && needed.some((s) => un.slots.includes(s))) {
          blocked = true;
          reason.push(`${teacher.name} unavailable`);
        }
      }
      if (roomId && defaultLookups.roomById[roomId]?.available === false) {
        blocked = true;
        reason.push("Room unavailable");
      }

      results.push({ day, slot: slot.id, free: !blocked, reason: reason.join(" · ") });
    });
  });

  return results;
}

export function nextFreeSlot(entries, options) {
  return findFreeSlots(entries, options).find((candidate) => candidate.free) ?? null;
}

/* ------------------------------ Summaries ------------------------------ */

export function summarize(entries, lookups = defaultLookups) {
  const totalSlots = DAYS.filter((d) => !d.optional).length * SLOTS.filter((s) => s.kind !== "break").length;
  const used = new Set();
  entries.forEach((e) => coveredSlots(e).forEach((s) => used.add(cellKey(e.day, s))));

  return {
    classes: entries.length,
    locked: entries.filter((e) => e.locked).length,
    labs: entries.filter((e) => e.type === "Practical" || e.type === "Laboratory").length,
    teachers: new Set(entries.map((e) => e.teacherId)).size,
    rooms: new Set(entries.map((e) => e.roomId)).size,
    subjects: new Set(entries.map((e) => e.subjectId)).size,
    freePeriods: Math.max(0, totalSlots - used.size),
    utilization: Math.round((used.size / totalSlots) * 100),
    aiGenerated: entries.filter((e) => e.source === "ai").length,
  };
}

/** Weekly hours scheduled per teacher. */
export function teacherLoad(entries, lookups = defaultLookups) {
  const load = {};
  lookups.teachers.forEach((t) => {
    load[t.id] = 0;
  });
  entries.forEach((entry) => {
    load[entry.teacherId] = (load[entry.teacherId] ?? 0) + (entry.span || 1);
  });
  return load;
}

/** Weekly hours booked per room. */
export function roomUsage(entries, lookups = defaultLookups) {
  const usage = {};
  lookups.rooms.forEach((r) => {
    usage[r.id] = 0;
  });
  entries.forEach((entry) => {
    usage[entry.roomId] = (usage[entry.roomId] ?? 0) + (entry.span || 1);
  });
  return usage;
}

/** How many sessions each subject currently has this week. */
export function subjectCoverage(entries) {
  const coverage = {};
  entries.forEach((entry) => {
    coverage[entry.subjectId] = (coverage[entry.subjectId] ?? 0) + (entry.span || 1);
  });
  return coverage;
}

export function classesPerDay(entries) {
  const perDay = {};
  DAYS.forEach((d) => {
    perDay[d.id] = entries.filter((e) => e.day === d.id).reduce((sum, e) => sum + (e.span || 1), 0);
  });
  return perDay;
}
