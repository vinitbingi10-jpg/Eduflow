import {
  coveredSlots,
  defaultLookups,
  describeEntry,
  dayLabel,
  slotLabel,
  subjectCoverage,
  classesPerDay,
  teacherLoad,
  roomUsage,
} from "@/utils/timetableUtils.js";
import { DAYS, SLOTS } from "@/data/mockData.js";

/**
 * Eduflow conflict engine (runs in the browser, same rules as backend/scheduler.py).
 *
 * Detects: teacher, room, division, lab and availability conflicts.
 * Overlapping pairs inside the same period are merged into a single
 * conflict record that can carry several reasons — that keeps the
 * counter honest instead of reporting one problem three times.
 */

function overlap(a, b) {
  if (a.day !== b.day) return false;
  const slotsA = coveredSlots(a);
  return coveredSlots(b).some((slot) => slotsA.includes(slot));
}

function pairKey(a, b) {
  return [a.id, b.id].sort().join("::");
}

export function detectConflicts(entries, lookups = defaultLookups) {
  const conflicts = [];
  const seen = new Set();

  // 1. Pairwise resource conflicts (teacher / room / division / lab)
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const a = entries[i];
      const b = entries[j];
      if (!overlap(a, b)) continue;

      const reasons = [];
      if (a.teacherId === b.teacherId) {
        const teacher = lookups.teacherById[a.teacherId];
        reasons.push({
          type: "teacher",
          message: `${teacher?.name ?? "Teacher"} cannot teach two sessions at ${dayLabel(a.day)} ${slotLabel(a.slot)}.`,
        });
      }
      if (a.roomId === b.roomId) {
        const room = lookups.roomById[a.roomId];
        const labLike = (e) => ["Practical", "Laboratory"].includes(e.type);
        reasons.push({
          type: labLike(a) || labLike(b) ? "lab" : "room",
          message: `${room?.name ?? "Room"} is already booked${labLike(a) || labLike(b) ? " for another practical" : ""} at ${dayLabel(a.day)} ${slotLabel(a.slot)}.`,
        });
      }
      if (a.division === b.division && a.semester === b.semester && a.courseId === b.courseId) {
        reasons.push({
          type: "division",
          message: `Division ${a.division} (Sem ${a.semester}) has two classes in the same period.`,
        });
      }
      if (!reasons.length) continue;

      const key = pairKey(a, b);
      if (seen.has(key)) continue;
      seen.add(key);

      conflicts.push({
        id: `cf-${key}`,
        entryIds: [a.id, b.id],
        day: a.day,
        slot: a.slot,
        types: reasons.map((r) => r.type),
        title: `${titleFor(reasons[0].type)} — ${dayLabel(a.day, "short")} ${slotLabel(a.slot)}`,
        message: reasons.map((r) => r.message).join(" "),
        reasons,
        severity: reasons.some((r) => r.type === "teacher" || r.type === "division") ? "critical" : "high",
        locked: a.locked || b.locked,
      });
    }
  }

  // 2. Single-entry availability conflicts
  entries.forEach((entry) => {
    const teacher = lookups.teacherById[entry.teacherId];
    const room = lookups.roomById[entry.roomId];
    const slots = coveredSlots(entry);
    const reasons = [];

    const unavailable = teacher?.unavailable?.find((u) => u.day === entry.day);
    if (unavailable && slots.some((s) => unavailable.slots.includes(s))) {
      reasons.push({
        type: "availability",
        message: `${teacher.name} is unavailable on ${dayLabel(entry.day)} ${slots.map(slotLabel).join(", ")}.`,
      });
    }
    if (room && room.available === false) {
      reasons.push({ type: "availability", message: `${room.name} is marked unavailable this term.` });
    }
    if (!reasons.length) return;

    conflicts.push({
      id: `cf-av-${entry.id}`,
      entryIds: [entry.id],
      day: entry.day,
      slot: entry.slot,
      types: ["availability"],
      title: `Availability — ${dayLabel(entry.day, "short")} ${slotLabel(entry.slot)}`,
      message: reasons.map((r) => r.message).join(" "),
      reasons,
      severity: "warning",
      locked: entry.locked,
    });
  });

  const order = { critical: 0, high: 1, warning: 2 };
  return conflicts.sort((a, b) => order[a.severity] - order[b.severity]);
}

function titleFor(type) {
  switch (type) {
    case "teacher":
      return "Teacher conflict";
    case "room":
      return "Room conflict";
    case "lab":
      return "Lab conflict";
    case "division":
      return "Class conflict";
    default:
      return "Availability conflict";
  }
}

/** entryId -> conflicts[] so the grid can paint red cells cheaply. */
export function conflictsByEntry(conflicts) {
  const map = new Map();
  conflicts.forEach((conflict) => {
    conflict.entryIds.forEach((id) => {
      if (!map.has(id)) map.set(id, []);
      map.get(id).push(conflict);
    });
  });
  return map;
}

/**
 * Pre-flight check used before a drag & drop or a manual move.
 * Returns the conflicts the moved entry would cause at the target.
 */
export function previewMove(entries, entry, target, lookups = defaultLookups) {
  const moved = { ...entry, day: target.day, slot: target.slot, span: target.span ?? entry.span };
  const next = entries.map((e) => (e.id === entry.id ? moved : e));
  return detectConflicts(next, lookups).filter((c) => c.entryIds.includes(entry.id));
}

/** Plain-language explanation of every open conflict (used by the AI panel). */
export function explainConflicts(entries, conflicts, lookups = defaultLookups) {
  if (!conflicts.length) return "No conflicts. Every teacher, room and division is free in the periods they are booked for.";
  return conflicts
    .map((conflict, index) => {
      const involved = conflict.entryIds.map((id) => entries.find((e) => e.id === id)).filter(Boolean);
      const lines = involved.map((e) => `   • ${describeEntry(e, lookups)}`);
      return `${index + 1}. ${conflict.title}\n${conflict.message}\n${lines.join("\n")}`;
    })
    .join("\n\n");
}

/**
 * Non-blocking improvement ideas — the "4 possible improvements" the
 * assistant mentions. These never change anything on their own.
 */
export function getImprovements(entries, lookups = defaultLookups) {
  const improvements = [];
  const load = teacherLoad(entries, lookups);
  const usage = roomUsage(entries, lookups);
  const coverage = subjectCoverage(entries);
  const perDay = classesPerDay(entries);

  lookups.teachers.forEach((teacher) => {
    const hours = load[teacher.id] ?? 0;
    if (teacher.maxWeeklyLoad && hours / teacher.maxWeeklyLoad > 0.85) {
      improvements.push({
        id: `imp-load-${teacher.id}`,
        title: `${teacher.name} is at ${Math.round((hours / teacher.maxWeeklyLoad) * 100)}% load`,
        detail: `${hours} of ${teacher.maxWeeklyLoad} weekly hours. Share one session with Prof. Meera Joshi to balance the week.`,
        kind: "workload",
      });
    }
  });

  lookups.subjects.forEach((subject) => {
    const scheduled = coverage[subject.id] ?? 0;
    if (scheduled < subject.hoursPerWeek) {
      improvements.push({
        id: `imp-cov-${subject.id}`,
        title: `${subject.short} is ${subject.hoursPerWeek - scheduled} hour(s) short`,
        detail: `Syllabus needs ${subject.hoursPerWeek} weekly hours, the grid currently holds ${scheduled}.`,
        kind: "coverage",
      });
    }
  });

  DAYS.filter((d) => !d.optional).forEach((day) => {
    if (perDay[day.id] >= 7) {
      improvements.push({
        id: `imp-day-${day.id}`,
        title: `${day.label} is overloaded (${perDay[day.id]} periods)`,
        detail: `Move one theory session to Saturday or a lighter day to spread the cognitive load.`,
        kind: "balance",
      });
    }
  });

  const idleRooms = lookups.rooms.filter((room) => room.available && (usage[room.id] ?? 0) === 0);
  if (idleRooms.length) {
    improvements.push({
      id: "imp-rooms",
      title: `${idleRooms.length} rooms are unused all week`,
      detail: `${idleRooms.slice(0, 3).map((r) => r.name).join(", ")} could absorb practical batches to reduce lab pressure.`,
      kind: "rooms",
    });
  }

  const freeAfterLunch = SLOTS.filter((s) => s.kind !== "break").length * 5 - entries.reduce((n, e) => n + (e.span || 1), 0);
  if (freeAfterLunch > 4) {
    improvements.push({
      id: "imp-free",
      title: `${freeAfterLunch} free periods available`,
      detail: "Enough room to add remedial classes or student club slots without touching locked cells.",
      kind: "capacity",
    });
  }

  return improvements.slice(0, 4);
}
