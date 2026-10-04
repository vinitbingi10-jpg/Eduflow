/**
 * aiService — the assistant's "brain" while there is no backend.
 *
 * TODAY: intent parsing + local timetable transforms, resolved with a delay so
 *        the typing indicator is meaningful.
 * LATER: `sendPrompt` becomes a call to FastAPI, which forwards the natural
 *        language request to the Gemini API, converts the model output into a
 *        structured timetable action, validates it against PostgreSQL and runs
 *        OR-Tools CP-SAT before returning the patch you see here.
 *
 * The response contract below is deliberately the same shape the real
 * backend will return: { reply, intent, patch?, choices? }
 */
import { DAYS, SLOTS, TEACHING_SLOTS, CATEGORY_COLORS } from "@/data/mockData.js";
import {
  coveredSlots,
  createEntry,
  dayLabel,
  describeEntry,
  format12h,
  nextFreeSlot,
  slotById,
  slotLabel,
  teacherLoad,
  findFreeSlots,
} from "@/utils/timetableUtils.js";
import { detectConflicts, explainConflicts } from "@/utils/conflictDetection.js";
import { API_URL } from "@/services/timetableService.js";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalise = (text) => text.toLowerCase().replace(/[^\w\s:]/g, " ").replace(/\s+/g, " ").trim();

function matchSubject(prompt, lookups) {
  const text = normalise(prompt);
  return (
    lookups.subjects.find((s) => text.includes(normalise(s.short))) ||
    lookups.subjects.find((s) => text.includes(normalise(s.name))) ||
    lookups.subjects.find((s) => text.includes(normalise(s.code))) ||
    null
  );
}

function matchTeacher(prompt, lookups) {
  const text = normalise(prompt);
  const list = lookups?.teachers ?? [];
  return (
    list.find((t) => {
      const name = normalise(t.name ?? "");
      if (!name) return false;
      if (text.includes(name)) return true;
      const last = name.split(" ").pop();
      return last.length > 3 && new RegExp(`\\b${last}\\b`).test(text);
    }) ?? null
  );
}

function matchRoom(prompt, lookups) {
  const text = normalise(prompt);
  const list = lookups?.rooms ?? [];
  return (
    list.find((r) => {
      const name = normalise(r.name ?? "");
      return name && text.includes(name);
    }) ??
    list.find((r) => {
      const numbers = (r.name ?? "").match(/\d+/g) ?? [];
      return numbers.some((n) => new RegExp(`\\b${n}\\b`).test(text));
    }) ??
    null
  );
}

/** Finds a label-based entry (breaks, seminars, exams...) by its text. */
function matchEntryByLabel(prompt, entries) {
  const text = normalise(prompt);
  return entries.find((e) => e.label && normalise(e.label) && text.includes(normalise(e.label))) ?? null;
}

function conflictNote(before, nextEntries, lookups, whatChanged) {
  const after = detectConflicts(nextEntries, lookups).length;
  if (after > before) return `\n\nNote: this creates ${after - before} new conflict(s). Say “fix conflicts” and I'll rearrange it.`;
  if (after > 0) return `\n\n${after} conflict(s) still on the board — say “fix conflicts” if you want them gone.`;
  return "\n\nNo conflicts after the change.";
}

/**
 * "add a subject called Microprocessors with 4 hours",
 * "create a teacher named Prof. Rao", "add room Lab 3 with 40 seats"
 */
export function createReferenceRecord(prompt, ctx = {}) {
  const lookups = ctx.lookups;
  const text = normalise(prompt);
  // only treat it as data creation when there is a creation verb + a noun,
  // otherwise "change room of X ..." or "add a class" would be misread
  if (!/^(add|create|new|register)\b/.test(text)) return null;
  const kind = text.match(/\b(subject|teacher|room|lab|hall)\b/)?.[1];
  if (!kind) return null;
  const collection = kind === "subject" ? "subjects" : kind === "teacher" ? "teachers" : "rooms";

  // name can come from "called X", "named X", "X" in quotes, or words after the noun
  const named =
    prompt.match(/(?:called|named|:)\s*["'""]?([\w\s&.'()-]+?)["'""]?\s*(?=,| with |\s*$)/i)?.[1] ??
    prompt.match(/["'""]([\w\s&.'()-]+)["'""]/)?.[1] ??
    text.match(new RegExp(`${kind}\\s+(?:called\\s+|named\\s+)?(.+?)\\s*(?: with\\b.*)?$`, "i"))?.[1];
  const name = named?.trim().replace(/^(a|an|new|the)\s+/i, "");

  if (!name || name.length < 2) {
    return {
      intent: "add-reference",
      reply: `Tell me a name and I'll create it, e.g. "add a subject called Digital Electronics with 4 hours". Or use the Add button in the sidebar.`,
      choices: [
        { id: `open-${kind}`, label: `Open ${kind} form`, action: { type: "open-modal", modal: kind === "lab" || kind === "hall" ? "room" : kind } },
      ],
    };
  }

  const hoursMatch = prompt.match(/(\d+)\s*(?:hours|hrs|h\b|credits)/i);
  const seatsMatch = prompt.match(/(\d+)\s*(?:seats|capacity|students|benches)/i);
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  if (collection === "subjects") {
    const palette = CATEGORY_COLORS.map((c) => c.id);
    const code = name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 6) || slug.toUpperCase().slice(0, 6);
    const record = {
      id: slug.toUpperCase().replace(/-/g, "-"),
      name,
      code: `${code}${Math.floor(100 + Math.random() * 800)}`,
      short: name.split(/\s+/).slice(0, 2).join(" "),
      teacherId: matchTeacher(prompt, lookups)?.id ?? null,
      hoursPerWeek: hoursMatch ? Number(hoursMatch[1]) : 4,
      type: "Theory",
      color: palette[(lookups?.subjects?.length ?? 0) % palette.length],
      credits: 3,
      departmentId: ctx.meta?.departmentId ?? "cse",
      semester: ctx.meta?.semester ?? 3,
    };
    return {
      intent: "add-subject",
      patch: { subjects: [record] },
      reply: `Created subject “${name}” (${record.hoursPerWeek}h/week, code ${record.code}). It's in the sidebar now — say “schedule ${record.short} on Monday at 10” and I'll put it on the grid.`,
      choices: [{ id: "schedule-now", label: `Schedule ${record.short}`, action: { type: "prompt", prompt: `add ${record.short} on monday at 10` } }],
    };
  }

  if (collection === "teachers") {
    const record = {
      id: `t-${slug}-${Date.now().toString(36).slice(-3)}`,
      name: name.startsWith("Prof") || name.startsWith("Dr") ? name : `Prof. ${name}`,
      departmentId: ctx.meta?.departmentId ?? "cse",
      subjectIds: [],
      maxWeeklyLoad: hoursMatch ? Number(hoursMatch[1]) : 16,
      email: "",
      unavailable: [],
    };
    return {
      intent: "add-teacher",
      patch: { teachers: [record] },
      reply: `Created teacher “${record.name}” (max ${record.maxWeeklyLoad}h/week). Assign subjects to them or say “change the teacher of X to ${record.name.split(" ").slice(-1)[0]}”.`,
    };
  }

  const record = {
    id: `r-${slug}-${Date.now().toString(36).slice(-3)}`,
    name: kind === "lab" && !/lab/i.test(name) ? `${name} Lab` : name,
    capacity: seatsMatch ? Number(seatsMatch[1]) : kind === "lab" || kind === "hall" ? 40 : 60,
    type: kind === "lab" ? "Computer Lab" : kind === "hall" ? "Seminar Hall" : "Classroom",
    block: "A",
    available: true,
  };
  return {
    intent: "add-room",
    patch: { rooms: [record] },
    reply: `Created ${kind === "lab" || kind === "hall" ? record.name : `room “${name}”`} (${record.type}, ${record.capacity} seats). It's available for scheduling now.`,
  };
}

const ELEMENT_WORDS = {
  break: { label: "Break", type: "Break", span: 1 },
  "free period": { label: "Free Period", type: "Lecture", span: 1 },
  lunch: { label: "Lunch", type: "Break", span: 1 },
  seminar: { label: "Seminar", type: "Seminar", span: 1 },
  exam: { label: "Exam", type: "Lecture", span: 1 },
  workshop: { label: "Workshop", type: "Workshop", span: 1 },
};

/**
 * Direct entry edits: add / schedule, delete, clear, change room/teacher,
 * duplicate, unlock. Sync after localReply so classes land before generation
 * questions. Returns null when the prompt isn't one of these.
 */
async function localEntryAction(prompt, ctx = {}) {
  const { entries = [], lookups, meta = {} } = ctx;
  if (!lookups) return null;
  const text = normalise(prompt);
  const subject = matchSubject(prompt, lookups);
  const teacher = matchTeacher(prompt, lookups);
  const room = matchRoom(prompt, lookups);
  const dayId = matchDay(prompt);
  const force = /even (the )?locked|including locked|force/.test(text);
  const labelEntry = matchEntryByLabel(prompt, entries);

  /* ---- clear everything ---- */
  if (/(clear|delete|remove|wipe)\s+(all|everything|the (whole|full)|whole)/.test(text) || text === "clear timetable" || text === "clear the timetable") {
    const targets = entries.filter((e) => force || !e.locked);
    if (!targets.length) return { intent: "clear", reply: "Everything is locked. Say “clear everything including locked” if you really want a blank board." };
    const kept = entries.length - targets.length;
    return {
      intent: "clear",
      patch: { removeIds: targets.map((e) => e.id), force },
      reply: `Cleared ${targets.length} class(es)${kept ? `, kept ${kept} locked cell(s)` : ""}. Undo (Ctrl+Z) if that was a mistake.`,
    };
  }

  /* ---- clear a whole day ---- */
  if (dayId && /clear|remove everything|delete all|empty/.test(text) && !subject) {
    const targets = entries.filter((e) => e.day === dayId && (force || !e.locked));
    if (!targets.length) return { intent: "clear", reply: `${dayLabel(dayId)} has no unlocked classes to clear.` };
    return {
      intent: "clear",
      patch: { removeIds: targets.map((e) => e.id), force },
      reply: `Cleared ${targets.length} class(es) from ${dayLabel(dayId)}.`,
    };
  }

  /* ---- add / schedule a class ---- */
  if (/^(add|schedule|create|book|put|place)\b/.test(text) || /\b(add|schedule|book|put)\b/.test(text)) {
    const elementKey = Object.keys(ELEMENT_WORDS).find((k) => text.includes(k) && !subject);
    if (elementKey) {
      const element = ELEMENT_WORDS[elementKey];
      const slotId = matchTime(prompt)[0] ?? null;
      const targetDay = dayId ?? "mon";
      const slot = slotId ?? nextFreeSlot(entries, { span: element.span, days: dayId ? [dayId] : undefined, excludeIds: [] })?.slot;
      if (!slot || !targetDay) return { intent: "add-class", reply: "Couldn't find a free period for that. Try naming a day and time, e.g. “add a break on Wednesday at 10:15”." };
      const entry = createEntry({
        subjectId: null,
        label: element.label,
        type: element.type,
        span: element.span,
        day: targetDay,
        slot,
        roomId: room?.id ?? null,
        teacherId: teacher?.id ?? null,
        color: element.type === "Break" ? "amber" : "slate",
        source: "ai",
      });
      return { intent: "add-class", patch: { add: [entry] }, reply: `Added a ${element.label} on ${dayLabel(targetDay)} ${slotLabel(slot)}.` };
    }

    if (!subject) {
      return {
        intent: "add-class",
        reply: `Which subject should I schedule? ${lookups.subjects.length ? `e.g. “schedule ${lookups.subjects[0].short} on Monday at 10”` : "Add subjects first — try “add a subject called Database Systems with 4 hours”."}`,
        choices: lookups.subjects.length
          ? lookups.subjects.slice(0, 3).map((s) => ({
              id: `sched-${s.id}`,
              label: `Schedule ${s.short}`,
              action: { type: "prompt", prompt: `schedule ${s.short} on Monday at 10` },
            }))
          : [{ id: "add-sub", label: "Add a subject", action: { type: "open-modal", modal: "subject" } }],
      };
    }
    const isLab = subject.type === "Practical" || subject.type === "Laboratory";
    const span = isLab ? 2 : 1;
    const times = matchTime(prompt);
    let targetDay = dayId ?? null;
    let targetSlot = times[0] ?? null;
    if (!targetDay || !targetSlot) {
      const found = nextFreeSlot(entries, { span, teacherId: teacher?.id ?? subject.teacherId, days: targetDay ? [targetDay] : undefined });
      if (!found) return { intent: "add-class", reply: `No free slot found for ${subject.short}. Tell me a day and time, or unlock a period.` };
      targetDay = found.day;
      targetSlot = found.slot;
    }
    const preferredRoom = room ?? lookups.rooms.find((r) => r.available !== false && (isLab ? r.type !== "Classroom" : r.type === "Classroom")) ?? lookups.rooms[0] ?? null;
    const entry = createEntry({
      subjectId: subject.id,
      teacherId: teacher?.id ?? subject.teacherId ?? null,
      roomId: preferredRoom?.id ?? null,
      day: targetDay,
      slot: targetSlot,
      span,
      type: subject.type === "Theory" ? "Lecture" : subject.type,
      color: subject.color,
      departmentId: subject.departmentId ?? meta.departmentId ?? "cse",
      semester: subject.semester ?? meta.semester ?? 3,
      courseId: meta.courseId ?? "btech-cse",
      source: "ai",
    });
    const next = [...entries, entry];
    return {
      intent: "add-class",
      patch: { add: [entry] },
      reply: `Added ${subject.short} on ${dayLabel(targetDay)} ${slotLabel(targetSlot)}${preferredRoom ? ` in ${preferredRoom.name}` : ""}.${conflictNote(ctx.conflicts?.length ?? detectConflicts(entries, lookups).length, next, lookups)}`,
    };
  }

  /* ---- delete / remove ---- */
  if (/^(delete|remove|drop|cancel)\b/.test(text) || /\b(delete|remove)\s+(the\s+)?(first|last)?\s*(class|lecture|session)\b/.test(text)) {
    const targets = entries.filter((e) => {
      if (subject && e.subjectId !== subject.id) return false;
      if (labelEntry && !subject && e.id !== labelEntry.id) return false;
      if (!subject && !labelEntry) return false;
      if (dayId && e.day !== dayId) return false;
      return force || !e.locked;
    });
    if (!subject && !labelEntry) return null;
    if (!targets.length) {
      const lockedHere = entries.filter((e) => (subject ? e.subjectId === subject.id : e.id === labelEntry?.id)).length;
      return {
        intent: "delete",
        reply: lockedHere
          ? `The ${subject?.short ?? labelEntry?.label} classes are locked. Say “unlock ${subject?.short ?? "them"}” first and I'll delete them.`
          : `I don't see ${subject?.short ?? labelEntry?.label ?? "that"} on the grid.`,
      };
    }
    const names = subject?.short ?? labelEntry?.label ?? subject?.name;
    const remaining = entries.filter((e) => !targets.includes(e) || (!force && e.locked));
    return {
      intent: "delete",
      patch: { removeIds: targets.map((e) => e.id), force },
      reply: `Deleted ${targets.length} ${names} class(es)${dayId ? ` on ${dayLabel(dayId)}` : ""}.${conflictNote(ctx.conflicts?.length ?? detectConflicts(entries, lookups).length, remaining, lookups)}`,
    };
  }

  /* ---- change room ---- */
  if (room && subject && /room|move|change|switch|put|shift/.test(text)) {
    const targets = entries.filter((e) => e.subjectId === subject.id && (force || !e.locked));
    if (!targets.length) return { intent: "change-room", reply: `All ${subject.short} classes are locked — unlock one first.` };
    const next = entries.map((e) => (targets.includes(e) ? { ...e, roomId: room.id } : e));
    return {
      intent: "change-room",
      patch: { update: targets.map((e) => ({ id: e.id, roomId: room.id })) },
      reply: `Moved ${targets.length} ${subject.short} class(es) to ${room.name}.${conflictNote(ctx.conflicts?.length ?? detectConflicts(entries, lookups).length, next, lookups)}`,
    };
  }

  /* ---- change teacher ---- */
  if (teacher && subject && /(teacher|prof|assign|give|replace|change|switch)/.test(text)) {
    const targets = entries.filter((e) => e.subjectId === subject.id && (force || !e.locked));
    if (!targets.length) return { intent: "change-teacher", reply: `All ${subject.short} classes are locked — unlock one first.` };
    const next = entries.map((e) => (targets.includes(e) ? { ...e, teacherId: teacher.id } : e));
    return {
      intent: "change-teacher",
      patch: { update: targets.map((e) => ({ id: e.id, teacherId: teacher.id })) },
      reply: `Assigned ${teacher.name} to ${targets.length} ${subject.short} class(es).${conflictNote(ctx.conflicts?.length ?? detectConflicts(entries, lookups).length, next, lookups)}`,
    };
  }

  /* ---- duplicate ---- */
  if (/^(duplicate|copy|repeat)\b/.test(text) && (subject || labelEntry)) {
    const source = subject ? entries.find((e) => e.subjectId === subject.id) : labelEntry;
    if (!source) return { intent: "duplicate", reply: "I can't find that class on the grid." };
    const target = nextFreeSlot(entries, { span: source.span || 1, excludeIds: [source.id], teacherId: source.teacherId, days: dayId ? [dayId] : undefined });
    if (!target) return { intent: "duplicate", reply: "No free slot to make a copy. Unlock a period or try another day." };
    const copy = createEntry({ ...source, id: undefined, day: target.day, slot: target.slot, locked: false, source: "ai" });
    return {
      intent: "duplicate",
      patch: { add: [copy] },
      reply: `Duplicated ${subject?.short ?? source.label} to ${dayLabel(target.day)} ${slotLabel(target.slot)}.`,
    };
  }

  /* ---- unlock ---- */
  if (/unlock|unfreeze/.test(text)) {
    let targets = [];
    if (subject) targets = entries.filter((e) => e.subjectId === subject.id && e.locked);
    else if (dayId) targets = entries.filter((e) => e.day === dayId && e.locked);
    else targets = entries.filter((e) => e.locked);
    if (!targets.length) return { intent: "unlock", reply: subject || dayId ? "Nothing locked there — it's already editable." : "No locked cells on the board." };
    return {
      intent: "unlock",
      patch: { unlockIds: targets.map((e) => e.id) },
      reply: `Unlocked ${targets.length} cell(s)${subject ? ` for ${subject.short}` : dayId ? ` on ${dayLabel(dayId)}` : ""}. They're fully editable now — including by me.`,
    };
  }

  return null;
}

function matchDay(prompt) {
  const text = normalise(prompt);
  return DAYS.find((d) => text.includes(normalise(d.label)) || text.includes(normalise(d.short)))?.id ?? null;
}

function matchTime(prompt) {
  const text = normalise(prompt);
  if (text.includes("morning")) return TEACHING_SLOTS.slice(0, 2);
  if (text.includes("afternoon")) return ["p5", "p6"];
  if (text.includes("evening") || text.includes("late")) return ["p7"];
  const clock = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (clock) {
    let hour = Number(clock[1]);
    if (clock[3] === "pm" && hour < 12) hour += 12;
    if (clock[3] === "am" && hour === 12) hour = 8;
    const slot = SLOTS.find((s) => s.kind !== "break" && Number(s.start.split(":")[0]) === hour);
    if (slot) return [slot.id];
  }
  return [];
}

function isBusy(entries, entryId, day, slot, span = 1) {
  const start = SLOTS.findIndex((s) => s.id === slot);
  const wanted = SLOTS.slice(start, start + span)
    .filter((s) => s.kind !== "break")
    .map((s) => s.id);
  if (!wanted.length) return true;
  return entries.some((other) => {
    if (other.id === entryId || other.day !== day) return false;
    const slots = coveredSlots(other);
    return wanted.some((s) => slots.includes(s));
  });
}

/**
 * Resolve one conflict by relocating an unlocked entry.
 * Locked entries are never touched — that is the whole point of hybrid mode.
 */
export function resolveConflictsLocally(entries, lookups) {
  let working = [...entries];
  const moves = [];

  detectConflicts(working, lookups).forEach((conflict) => {
    const involved = conflict.entryIds.map((id) => working.find((e) => e.id === id)).filter(Boolean);
    const movable = involved.find((e) => !e.locked);
    if (!movable) return;

    const target = nextFreeSlot(working, {
      span: movable.span || 1,
      excludeIds: [movable.id],
      teacherId: movable.teacherId,
    });
    if (!target) return;

    working = working.map((e) =>
      e.id === movable.id ? { ...e, day: target.day, slot: target.slot, source: "ai" } : e
    );
    moves.push({ entry: movable, from: { day: movable.day, slot: movable.slot }, to: target });
  });

  return { entries: working, moves };
}

/** Spread the heaviest day onto lighter days without touching locked cells. */
export function optimizeLocally(entries) {
  const working = [...entries];
  const perDay = DAYS.filter((d) => !d.optional).map((d) => ({
    id: d.id,
    load: working.filter((e) => e.day === d.id).reduce((n, e) => n + (e.span || 1), 0),
  })).sort((a, b) => b.load - a.load);

  const moves = [];
  const heaviest = perDay[0];
  const lightest = perDay[perDay.length - 1];
  if (!heaviest || !lightest || heaviest.load - lightest.load < 2) return { entries: working, moves };

  const candidates = working.filter((e) => e.day === heaviest.id && !e.locked).slice(0, 2);
  candidates.forEach((entry) => {
    const target = nextFreeSlot(working, {
      span: entry.span || 1,
      excludeIds: [entry.id],
      days: [lightest.id],
      teacherId: entry.teacherId,
    });
    if (!target) return;
    const index = working.findIndex((e) => e.id === entry.id);
    working[index] = { ...entry, day: target.day, slot: target.slot, source: "ai" };
    moves.push({ entry, from: { day: entry.day, slot: entry.slot }, to: target });
  });

  return { entries: working, moves };
}

/** Rebuild a single day: unlocked sessions are re-placed across the week. */
export function regenerateDayLocally(entries, dayId) {
  const kept = entries.filter((e) => e.day !== dayId || e.locked);
  const displaced = entries.filter((e) => e.day === dayId && !e.locked);
  const working = [...kept];
  const moves = [];

  displaced.forEach((entry) => {
    const target = nextFreeSlot(working, {
      span: entry.span || 1,
      excludeIds: [entry.id],
      days: [dayId, ...DAYS.filter((d) => d.id !== dayId && !d.optional).map((d) => d.id)],
      teacherId: entry.teacherId,
    });
    if (!target) return;
    working.push({ ...entry, day: target.day, slot: target.slot, source: "ai" });
    moves.push({ entry, from: { day: entry.day, slot: entry.slot }, to: target });
  });

  return { entries: working, moves };
}

function describeMoves(moves) {
  if (!moves.length) return "I could not find a safe move — every candidate slot is locked or already busy.";
  return moves
    .map(
      (m) =>
        `• ${m.entry.subjectId} moved from ${dayLabel(m.from.day, "short")} ${slotLabel(m.from.slot)} → ${dayLabel(m.to.day, "short")} ${slotLabel(m.to.slot)}`
    )
    .join("\n");
}

/**
 * Main entry point used by the AI panel.
 * @returns {Promise<{reply:string,intent:string,patch?:{entries:Array},choices?:Array}>}
 */
export async function sendPrompt(prompt, ctx = {}) {
  // creating subjects/teachers/rooms is always handled locally, because the
  // patch has to be applied by the store / UI (backend can't push those)
  const reference = createReferenceRecord(prompt, ctx);
  if (reference) return reference;

  // entry-level edits always work locally too — richer + faster than round-trip
  const localAction = await localEntryAction(prompt, ctx);
  if (localAction) return localAction;

  // otherwise ask the backend first, if it's not running do it in the browser
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(API_URL + "/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: prompt, entries: ctx.entries ?? [] }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data && data.reply) return data;
    }
  } catch {
    // backend offline, fall through
  }
  return localReply(prompt, ctx);
}

async function localReply(prompt, ctx = {}) {
  const { entries = [], lookups, meta = {} } = ctx;
  const conflicts = ctx.conflicts ?? detectConflicts(entries, lookups);
  const improvements = ctx.improvements ?? [];
  const text = normalise(prompt);
  await wait(650 + Math.random() * 500);

  /* ---- generate ---- */
  if (/(generate|build|create).*(timetable|schedule|week)/.test(text) || text === "generate timetable") {
    return {
      intent: "generate",
      reply:
        `I can rebuild ${meta.title ?? "this timetable"} for you.\n\nLocked cells stay exactly where they are — I only fill the empty periods around them. Use **Generate with AI** in the toolbar to pick department, working hours, subjects and constraints, then I will run the scheduler.`,
      choices: [
        { id: "open-generate", label: "Open AI generator", action: { type: "open-generate" } },
      ],
    };
  }

  /* ---- fix conflicts ---- */
  if (/(fix|resolve|remove|clear).*(conflict|clash|issue)/.test(text) || text === "fix conflicts") {
    if (!conflicts.length) {
      return { intent: "fix-conflicts", reply: "Nothing to fix — the timetable is conflict free right now." };
    }
    const { entries: next, moves } = resolveConflictsLocally(entries, lookups);
    const remaining = detectConflicts(next, lookups).length;
    return {
      intent: "fix-conflicts",
      patch: { entries: next },
      reply:
        `I resolved ${moves.length} of ${conflicts.length} conflicts by relocating unlocked sessions.\n\n${describeMoves(moves)}\n\n${
          remaining ? `${remaining} conflict(s) remain — they involve locked cells, so only you can decide those.` : "The board is clean now."
        }\n\nUndo is one click away (Ctrl+Z) if you disagree with any move.`,
    };
  }

  /* ---- optimize ---- */
  if (/optimi[sz]e|improve|balanc(e|ing).*(schedule|timetable|grid)/.test(text)) {
    const { entries: next, moves } = optimizeLocally(entries);
    if (!moves.length) {
      return {
        intent: "optimize",
        reply: "The week is already evenly spread — no unlocked session needed moving. Locked cells were left untouched.",
      };
    }
    return {
      intent: "optimize",
      patch: { entries: next },
      reply: `Optimized distribution across the week:\n\n${describeMoves(moves)}\n\nTeacher order, lab pairing and your locked cells were all respected.`,
    };
  }

  /* ---- workload ---- */
  if (/workload|load|overwork|free teacher/.test(text)) {
    const load = teacherLoad(entries, lookups);
    const rows = lookups.teachers
      .map((t) => ({ ...t, hours: load[t.id] ?? 0 }))
      .sort((a, b) => b.hours - a.hours);
    const heavy = rows.filter((r) => r.hours > 0).slice(0, 4);
    const light = rows.filter((r) => r.maxWeeklyLoad - r.hours >= 8).slice(0, 3);
    return {
      intent: "workload",
      reply:
        `Weekly load right now:\n\n${heavy.map((r) => `• ${r.name} — ${r.hours}/${r.maxWeeklyLoad} hrs`).join("\n")}\n\n` +
        (light.length
          ? `${light.map((r) => r.name).join(", ")} have capacity. Want me to shift a session from ${heavy[0]?.name ?? "the heaviest teacher"} to them?`
          : "Everyone is close to their contracted maximum."),
      choices: light.length
        ? [{ id: "balance", label: "Balance the heaviest teacher", action: { type: "prompt", prompt: "Optimize the timetable" } }]
        : undefined,
    };
  }

  /* ---- regenerate a day ---- */
  if (/regenerate|reshuffle|rebuild/.test(text)) {
    const dayId = matchDay(prompt) ?? "tue";
    const { entries: next, moves } = regenerateDayLocally(entries, dayId);
    return {
      intent: "regenerate-day",
      patch: { entries: next },
      reply: `Regenerated ${dayLabel(dayId)}. Locked sessions stayed put, ${moves.length} unlocked session(s) were re-placed:\n\n${describeMoves(moves)}`,
    };
  }

  /* ---- explain conflicts ---- */
  if (/explain|why.*(conflict|clash)|details?/.test(text)) {
    return {
      intent: "explain-conflicts",
      reply: explainConflicts(entries, conflicts, lookups),
      choices: conflicts.length
        ? [{ id: "fix", label: "Fix them for me", action: { type: "prompt", prompt: "Fix all conflicts in the timetable" } }]
        : undefined,
    };
  }

  /* ---- find free slot ---- */
  if (/free (slot|period)|available (slot|period)|where can|find.*slot/.test(text)) {
    const subject = matchSubject(prompt, lookups);
    const teacherId = subject?.teacherId;
    const candidates = findFreeSlots(entries, { span: 1, teacherId }).filter((c) => c.free).slice(0, 3);
    if (!candidates.length) {
      return { intent: "free-slot", reply: "There is no completely free period left this week. Enable Saturday or shorten a lab to make room." };
    }
    return {
      intent: "free-slot",
      reply: `I found ${candidates.length} possible slots${subject ? ` for ${subject.short} (${teacherId ? lookups.teacherById[teacherId]?.name : "unassigned"})` : ""}:\n\n${candidates
        .map((c) => `${dayLabel(c.day)} ${format12h(slotById[c.slot].start)} — ${slotById[c.slot].end}`)
        .join("\n")}\n\nWhich one should I use?`,
      choices: candidates.map((c) => ({
        id: `use-${c.day}-${c.slot}`,
        label: `${dayLabel(c.day, "short")} ${format12h(slotById[c.slot].start)}`,
        action: subject ? { type: "add", subjectId: subject.id, day: c.day, slot: c.slot } : { type: "focus", day: c.day, slot: c.slot },
      })),
    };
  }

  /* ---- move something ---- */
  if (/^(move|shift|reschedule)|\b(move|shift)\b/.test(text)) {
    const subject = matchSubject(prompt, lookups);
    const dayId = matchDay(prompt);
    const targets = subject ? entries.filter((e) => e.subjectId === subject.id && !e.locked) : [];
    if (!subject) {
      return { intent: "move", reply: "Which subject should I move? Try: “Move Maths to Wednesday afternoon”." };
    }
    if (!targets.length) {
      return {
        intent: "move",
        reply: `${subject.short} is locked in every period it appears. Unlock a cell first and I will happily move it — locked means locked.`,
      };
    }
    const times = matchTime(prompt);
    const wantedSlots = times.length ? times : TEACHING_SLOTS;
    if (dayId) {
      const slotId = wantedSlots.find((s) => !isBusy(entries, targets[0].id, dayId, s, targets[0].span || 1));
      if (slotId) {
        const next = entries.map((e) =>
          e.id === targets[0].id ? { ...e, day: dayId, slot: slotId, source: "ai" } : e
        );
        const clashes = detectConflicts(next, lookups).filter((c) => c.entryIds.includes(targets[0].id));
        return {
          intent: "move",
          patch: { entries: next },
          reply: `Done — ${subject.short} now sits on ${dayLabel(dayId)} ${slotLabel(slotId)}.\n${
            clashes.length ? "⚠ That placement still trips a teacher constraint, check the conflict panel." : "No new conflicts were introduced."
          }`,
        };
      }
    }
    const options = findFreeSlots(entries, { span: targets[0].span || 1, excludeIds: targets.map((t) => t.id), teacherId: targets[0].teacherId })
      .filter((c) => c.free && (!dayId || c.day === dayId))
      .slice(0, 2);
    return {
      intent: "move",
      reply: options.length
        ? `That exact slot is taken, but I found two that work:\n\n${options
            .map((o) => `${dayLabel(o.day)} ${format12h(slotById[o.slot].start)} — ${format12h(slotById[o.slot].end)}`)
            .join("\n")}\n\nWhich one should I use?`
        : `I could not find a conflict-free slot for ${subject.short} right now.`,
      choices: options.map((o) => ({
        id: `mv-${o.day}-${o.slot}`,
        label: `${dayLabel(o.day, "short")} ${format12h(slotById[o.slot].start)}`,
        action: { type: "move-entry", entryId: targets[0].id, day: o.day, slot: o.slot },
      })),
    };
  }

  /* ---- lock ---- */
  if (/lock|freeze|protect/.test(text)) {
    const subject = matchSubject(prompt, lookups);
    const targets = subject ? entries.filter((e) => e.subjectId === subject.id) : [];
    return {
      intent: "lock",
      patch: targets.length ? { lockIds: targets.map((t) => t.id) } : undefined,
      reply: subject
        ? `Locked all ${targets.length} ${subject.short} session(s). I will treat them as fixed constraints from now on.`
        : "Select a cell (or a whole row/column) and press the lock button — or tell me a subject name and I will lock all of its sessions.",
    };
  }

  /* ---- status ---- */
  if (/status|summary|how.*(timetable|look)|overview/.test(text)) {
    return {
      intent: "status",
      reply: `${meta.title ?? "This timetable"} · ${entries.length} scheduled sessions\nConflicts: ${conflicts.length}\nLocked cells: ${entries.filter((e) => e.locked).length}\nFree periods: ${TEACHING_SLOTS.length * 5 - entries.reduce((n, e) => n + (e.span || 1), 0)}\n\n${
        improvements.length ? `Top improvement: ${improvements[0].title}.` : "No obvious improvements right now."
      }`,
      choices: [{ id: "explain", label: "Explain conflicts", action: { type: "prompt", prompt: "Explain the current conflicts" } }],
    };
  }

  /* ---- fallback ---- */
  return {
    intent: "help",
    reply:
      `I can edit the timetable directly. Try:\n\n• “schedule ${lookups?.subjects?.[0]?.short ?? "Maths"} on Monday at 10”\n• “move ${lookups?.subjects?.[0]?.short ?? "Maths"} to Wednesday afternoon”\n• “change room of ${lookups?.subjects?.[0]?.short ?? "Maths"} to Room 204”\n• “delete ${lookups?.subjects?.[0]?.short ?? "Maths"}” or “clear Tuesday”\n• “duplicate ${lookups?.subjects?.[0]?.short ?? "it"}” or “clear the timetable”\n• “fix conflicts” or “find a free slot”\n\nAnything I change can be undone with Ctrl+Z, and locked cells are never touched.`,
    choices: [
      { id: "fix", label: "Fix conflicts", action: { type: "prompt", prompt: "Fix all conflicts in the timetable" } },
      { id: "opt", label: "Optimize timetable", action: { type: "prompt", prompt: "Optimize the timetable" } },
    ],
  };
}

/** Turn one assistant message + a choice into a readable label for history. */
export function choiceLabel(choice) {
  return choice?.label ?? "";
}

export const AI_ARCHITECTURE_STEPS = [
  { step: "You type a request", detail: "Plain English in the chat box" },
  { step: "Backend reads the intent", detail: "Keyword rules, Gemini if a key is set" },
  { step: "Timetable action", detail: "Move, fix, generate, lock…" },
  { step: "Conflict check", detail: "Teacher · room · division · lab" },
  { step: "Locked cells are kept", detail: "Only unlocked periods change" },
  { step: "Grid updated", detail: "Undo entry recorded" },
];

export function describeEntryForAI(entry, lookups) {
  return describeEntry(entry, lookups);
}
