// all calls to the backend go through here.
// if the backend is down we fall back to doing things in the browser so the app still works.
import { TIMETABLE_META, SLOTS, DAYS } from "@/data/mockData.js";
import { createEntry, coveredSlots, makeLookups, slotLabel, dayLabel } from "@/utils/timetableUtils.js";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

let backendOnline = null;
export function isBackendOnline() {
  return backendOnline;
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(API_URL + path, {
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      ...options,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    backendOnline = true;
    return await res.json();
  } catch (err) {
    backendOnline = false;
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchTimetable() {
  try {
    const data = await request("/timetable");
    return { meta: { ...TIMETABLE_META, ...(data.meta || {}) }, entries: data.entries || [] };
  } catch {
    return { meta: TIMETABLE_META, entries: [] };
  }
}

export async function saveTimetable(payload) {
  try {
    const res = await request("/timetable", { method: "PUT", body: payload });
    return { ok: true, savedAt: res.savedAt, entries: payload.entries.length };
  } catch {
    return { ok: true, savedAt: new Date().toISOString(), entries: payload.entries.length, local: true };
  }
}

export async function fetchReferenceData() {
  try {
    const [subjects, teachers, rooms] = await Promise.all([request("/subjects"), request("/teachers"), request("/rooms")]);
    return { subjects, teachers, rooms };
  } catch {
    return null;
  }
}

export async function createRecord(collection, record) {
  try {
    return await request(`/${collection}`, { method: "POST", body: record });
  } catch {
    return record;
  }
}

export async function updateRecord(collection, id, patch) {
  try {
    return await request(`/${collection}/${id}`, { method: "PUT", body: patch });
  } catch {
    return patch;
  }
}

export async function deleteRecord(collection, id) {
  try {
    return await request(`/${collection}/${id}`, { method: "DELETE" });
  } catch {
    return { ok: true };
  }
}

export async function generateTimetable(params = {}) {
  try {
    const body = {
      ...params,
      subjects: undefined,
      teachers: undefined,
      rooms: undefined,
      subjectIds: params.subjectIds,
    };
    return await request("/timetable/generate", { method: "POST", body });
  } catch {
    return generateLocally(params);
  }
}

// download the timetable as a csv (opens in excel)
export function downloadCsv(entries, lookups, meta) {
  const rows = [["Day", "Start", "End", "Subject", "Teacher", "Room", "Type", "Semester", "Division", "Locked"]];
  entries.forEach((e) => {
    const subject = lookups.subjectById[e.subjectId];
    const slot = SLOTS.find((s) => s.id === e.slot);
    rows.push([
      dayLabel(e.day),
      slot?.start ?? "",
      slot?.end ?? "",
      e.label || subject?.name || "",
      lookups.teacherById[e.teacherId]?.name ?? "",
      lookups.roomById[e.roomId]?.name ?? "",
      e.type,
      e.semester,
      e.division,
      e.locked ? "yes" : "no",
    ]);
  });
  const csv = rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(meta?.title || "timetable").replace(/[^\w]+/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------------- local fallback generator (same idea as backend/scheduler.py) ---------------- */

function placementFree(placed, candidate) {
  const slots = coveredSlots(candidate);
  if (slots.length < candidate.span) return false;
  return !placed.some((entry) => {
    if (entry.day !== candidate.day) return false;
    const entrySlots = coveredSlots(entry);
    if (slots.some((s) => entrySlots.includes(s))) return true;
    return false;
  });
}

function teacherClash(placed, candidate) {
  const slots = coveredSlots(candidate);
  return placed.some(
    (e) => e.day === candidate.day && e.teacherId === candidate.teacherId && coveredSlots(e).some((s) => slots.includes(s))
  );
}

function teacherAvailable(teacher, candidate) {
  if (!teacher) return true;
  const slots = coveredSlots(candidate);
  const blocked = teacher.unavailable?.find((u) => u.day === candidate.day);
  return !blocked || !slots.some((s) => blocked.slots.includes(s));
}

async function generateLocally(params) {
  const lookups = makeLookups(params);
  const days = params.days?.length ? params.days : DAYS.filter((d) => !d.optional).map((d) => d.id);
  const teachingSlots = params.slotIds?.length ? params.slotIds : SLOTS.filter((s) => s.kind !== "break").map((s) => s.id);
  const keepLocked = params.constraints?.keepLocked !== false;
  const existing = params.entries ?? [];
  const subjects = (params.subjects ?? []).map((s) => ({ ...s, remaining: s.hoursPerWeek }));

  const placed = keepLocked ? existing.filter((e) => e.locked) : [];
  subjects.forEach((subject) => {
    const already = placed.filter((e) => e.subjectId === subject.id).reduce((n, e) => n + (e.span || 1), 0);
    subject.remaining = Math.max(0, subject.hoursPerWeek - already);
  });

  for (let pass = 0; pass < 3; pass += 1) {
    days.forEach((day) => {
      teachingSlots.forEach((slot) => {
        const pending = subjects.filter((s) => s.remaining > 0).sort((a, b) => b.remaining - a.remaining);
        for (const subject of pending) {
          const isLab = subject.type === "Practical" || subject.type === "Laboratory";
          const span = isLab ? 2 : 1;
          if (pass === 0 && placed.some((e) => e.day === day && e.subjectId === subject.id)) continue;

          const candidate = { day, slot, span, teacherId: subject.teacherId };
          if (!placementFree(placed, candidate)) continue;
          if (teacherClash(placed, candidate)) continue;
          if (!teacherAvailable(lookups.teacherById[subject.teacherId], candidate)) continue;

          const pool = lookups.rooms.filter((r) => r.available !== false && (isLab ? r.type !== "Classroom" : r.type === "Classroom"));
          const room = pool.find(
            (r) => !placed.some((e) => e.day === day && e.roomId === r.id && coveredSlots(e).some((s) => coveredSlots(candidate).includes(s)))
          );
          if (!room && lookups.rooms.length) continue;

          placed.push(
            createEntry({
              ...candidate,
              roomId: room?.id ?? null,
              subjectId: subject.id,
              type: subject.type === "Theory" ? "Lecture" : subject.type,
              color: subject.color,
              departmentId: params.departmentId ?? subject.departmentId,
              semester: params.semester ?? 3,
              division: params.division ?? "A",
              courseId: params.courseId ?? "btech-cse",
              source: "ai",
            })
          );
          subject.remaining -= span;
          break;
        }
      });
    });
  }

  return { entries: placed, unplaced: subjects.filter((s) => s.remaining > 0).map((s) => ({ id: s.id, hours: s.remaining })) };
}

export { slotLabel };
