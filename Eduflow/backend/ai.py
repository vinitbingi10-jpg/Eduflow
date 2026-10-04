"""
ai.py - the chat part

Rule based intent parsing (keyword matching) that performs REAL timetable edits:
add/schedule classes, delete, clear day/week, change room/teacher, duplicate,
unlock, fix conflicts, move, free slots, workload, status.

If GEMINI_API_KEY is set we ask Gemini to re-write the reply nicer, but the
actual changes are always computed by our own code so it can't break the grid.
"""
import os
import re
import uuid

from scheduler import (
    find_conflicts,
    covered_slots,
    WORKING_DAYS,
    TEACHING_SLOTS,
    SLOTS,
    teacher_busy,
    teacher_available,
    by_id,
)

GEMINI_KEY = os.environ.get("GEMINI_API_KEY")

DAY_NAMES = {
    "mon": "Monday", "tue": "Tuesday", "wed": "Wednesday",
    "thu": "Thursday", "fri": "Friday", "sat": "Saturday",
}
DAY_SHORT = {k: v[:3] for k, v in DAY_NAMES.items()}


def clean(text):
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9:]+", " ", (text or "").lower())).strip()


def find_day(text):
    for key, name in DAY_NAMES.items():
        if re.search(rf"\b{key}\b", text) or name.lower() in text:
            return key
    return None


def find_subject(text, subjects):
    for s in subjects:
        for word in (s.get("short"), s.get("name"), s.get("code"), s.get("id")):
            if word and clean(word) and clean(word) in text:
                return s
    return None


def match_teacher(text, teachers):
    for t in teachers:
        name = clean(t.get("name", ""))
        if name and name in text:
            return t
    words = text.split()
    for t in teachers:
        parts = clean(t.get("name", "")).split()
        if parts and len(parts[-1]) > 3 and parts[-1] in words:
            return t
    return None


def match_room(text, rooms):
    for r in rooms:
        name = clean(r.get("name", ""))
        if name and name in text:
            return r
    words = text.split()
    for r in rooms:
        nums = re.findall(r"\d+", r.get("name", ""))
        if any(n in words for n in nums):
            return r
    return None


def forced(text):
    return ("even" in text and "locked" in text) or "force" in text or "including locked" in text


def free_slot(entries, entry, teachers, days=None, span=None):
    """first slot where this entry would fit without a clash"""
    teacher_map = by_id(teachers)
    span = span or entry.get("span") or 1
    others = [e for e in entries if e["id"] != entry["id"]]
    for day in (days or WORKING_DAYS):
        for slot in TEACHING_SLOTS:
            fake = {"day": day, "slot": slot, "span": span}
            need = covered_slots(fake)
            if len(need) < span:
                continue
            if any(e["day"] == day and any(s in covered_slots(e) for s in need) for e in others):
                continue
            if teacher_busy(others, day, slot, span, entry.get("teacherId")):
                continue
            if not teacher_available(teacher_map.get(entry.get("teacherId")), day, slot, span):
                continue
            return day, slot
    return None


def fix_conflicts(entries, teachers, rooms):
    entries = [dict(e) for e in entries]
    moves = []
    for c in find_conflicts(entries, teachers, rooms):
        involved = [e for e in entries if e["id"] in c["entryIds"]]
        movable = [e for e in involved if not e.get("locked")]
        if not movable:
            continue
        e = movable[0]
        target = free_slot(entries, e, teachers)
        if target:
            moves.append(f"{e.get('subjectId')} moved {DAY_NAMES[e['day']]} {e['slot']} -> {DAY_NAMES[target[0]]} {target[1]}")
            e["day"], e["slot"], e["source"] = target[0], target[1], "ai"
    return entries, moves


def time_pref(text):
    if "afternoon" in text:
        return ["p5", "p6", "p7"]
    if "morning" in text:
        return ["p1", "p2", "p3"]
    m = re.search(r"(\d{1,2})(?::(\d{2}))?\s*(am|pm)?", text)
    if m:
        hour = int(m.group(1))
        if m.group(3) == "pm" and hour < 12:
            hour += 12
        if m.group(3) == "am" and hour == 12:
            hour = 8
        for slot in SLOTS:
            if slot.get("kind") != "break" and int(slot["start"].split(":")[0]) == hour:
                return [slot["id"]]
    return TEACHING_SLOTS


def make_entry(subject, day, slot, span, teacher_id, room_id):
    return {
        "id": "cls-" + str(uuid.uuid4())[:8],
        "day": day,
        "slot": slot,
        "span": span,
        "subjectId": subject["id"] if subject else None,
        "label": None,
        "teacherId": teacher_id,
        "roomId": room_id,
        "type": "Lecture" if (subject or {}).get("type") == "Theory" else (subject or {}).get("type", "Lecture"),
        "locked": False,
        "color": (subject or {}).get("color", "teal"),
        "departmentId": (subject or {}).get("departmentId", "cse"),
        "semester": (subject or {}).get("semester", 3),
        "division": "A",
        "courseId": "btech-cse",
        "note": "",
        "source": "ai",
    }


def handle_chat(message, entries, subjects, teachers, rooms, meta=None):
    text = clean(message)
    meta = meta or {}
    conflicts = find_conflicts(entries, teachers, rooms)
    subject = find_subject(text, subjects)
    teacher = match_teacher(text, teachers)
    room = match_room(text, rooms)
    day = find_day(text)
    label_entry = next((e for e in entries if e.get("label") and clean(e["label"]) and clean(e["label"]) in text), None)

    # ---------- clear everything ----------
    if re.search(r"clear|delete all|remove everything|wipe", text) and ("timetable" in text or "everything" in text or "all" in text):
        targets = [e for e in entries if forced(text) or not e.get("locked")]
        if not targets:
            return {"intent": "clear", "reply": "Everything is locked. Say \"clear everything including locked\" to fully reset."}
        new_entries = [e for e in entries if e["id"] not in {t["id"] for t in targets}]
        kept = len(entries) - len(targets)
        reply = f"Cleared {len(targets)} class(es)" + (f", kept {kept} locked cell(s)." if kept else ".")
        return {"intent": "clear", "reply": reply, "patch": {"entries": new_entries}}

    # ---------- clear one day ----------
    if day and re.search(r"clear|remove everything|delete all|empty", text) and not subject:
        drop = {e["id"] for e in entries if e["day"] == day and (forced(text) or not e.get("locked"))}
        if not drop:
            return {"intent": "clear", "reply": f"{DAY_NAMES[day]} has no unlocked classes to clear."}
        return {
            "intent": "clear",
            "reply": f"Cleared {len(drop)} class(es) from {DAY_NAMES[day]}.",
            "patch": {"entries": [e for e in entries if e["id"] not in drop]},
        }

    # ---------- add / schedule a class ----------
    if re.match(r"^(add|schedule|create|book|put|place)\b", text):
        if not subject:
            return {
                "intent": "add-class",
                "reply": "Which subject should I schedule? Add it first, then try e.g. \"schedule Maths on Monday at 10\".",
                "choices": [{"id": "add-subject", "label": "Add a subject", "action": {"type": "prompt", "prompt": "add a subject"}}],
            }
        is_lab = subject.get("type") in ("Practical", "Laboratory")
        span = 2 if is_lab else 1
        teacher_id = (teacher or {}).get("id") or subject.get("teacherId")
        want_day, want_slots = day, time_pref(text)
        target = None
        if want_day and want_slots[:1] != TEACHING_SLOTS[:1]:
            target = (want_day, want_slots[0])
        else:
            found = free_slot(entries, {"id": "tmp", "span": span, "teacherId": teacher_id}, teachers, days=[want_day] if want_day else None, span=span)
            if found:
                target = found
        if not target:
            return {"intent": "add-class", "reply": f"No free slot for {subject.get('short')}. Give me a day and time, or unlock a period."}
        use_room = room or next(
            (r for r in rooms if r.get("available", True) and ((r.get("type") != "Classroom") if is_lab else (r.get("type") == "Classroom"))),
            rooms[0] if rooms else None,
        )
        entry = make_entry(subject, target[0], target[1], span, teacher_id, (use_room or {}).get("id"))
        if teacher_id:
            entry["teacherId"] = teacher_id
        before = len(conflicts)
        after = len(find_conflicts(entries + [entry], teachers, rooms))
        reply = f"Added {subject.get('short')} on {DAY_NAMES[target[0]]} {target[1]}" + (f" in {use_room['name']}" if use_room else "")
        if after > before:
            reply += f". Warning: this creates {after - before} conflict(s) — say \"fix conflicts\"."
        reply += "."
        return {"intent": "add-class", "reply": reply, "patch": {"entries": entries + [entry]}}

    # ---------- delete / remove ----------
    if re.match(r"^(delete|remove|drop|cancel)\b", text):
        if not subject and not label_entry:
            return {"intent": "delete", "reply": "Delete what? e.g. \"delete Maths\" or \"delete the Exam\"."}
        name = (subject or {}).get("short") or (label_entry or {}).get("label")
        targets = [
            e for e in entries
            if (subject and e.get("subjectId") == subject["id"] or label_entry and not subject and e["id"] == label_entry["id"])
            and (not day or e["day"] == day)
            and (forced(text) or not e.get("locked"))
        ]
        if not targets:
            total = len([e for e in entries if subject and e.get("subjectId") == subject["id"]])
            if total:
                return {"intent": "delete", "reply": f"The {name} classes are locked. Say \"unlock {name}\" first."}
            return {"intent": "delete", "reply": f"I don't see {name} on the grid."}
        drop = {e["id"] for e in targets}
        return {
            "intent": "delete",
            "reply": f"Deleted {len(drop)} {name} class(es)" + (f" on {DAY_NAMES[day]}" if day else "") + ".",
            "patch": {"entries": [e for e in entries if e["id"] not in drop]},
        }

    # ---------- change room ----------
    if room and subject and re.search(r"room|move|change|switch|put|shift", text):
        targets = [e for e in entries if e.get("subjectId") == subject["id"] and not e.get("locked")]
        if not targets:
            return {"intent": "change-room", "reply": f"All {subject.get('short')} classes are locked — unlock one first."}
        new_entries = [dict(e, roomId=room["id"]) if any(t["id"] == e["id"] for t in targets) else e for e in entries]
        return {
            "intent": "change-room",
            "reply": f"Moved {len(targets)} {subject.get('short')} class(es) to {room.get('name')}. Check conflicts - a double booked room will show up red.",
            "patch": {"entries": new_entries},
        }

    # ---------- change teacher ----------
    if teacher and subject and re.search(r"teacher|prof|assign|give|replace|change|switch", text):
        targets = [e for e in entries if e.get("subjectId") == subject["id"] and not e.get("locked")]
        if not targets:
            return {"intent": "change-teacher", "reply": f"All {subject.get('short')} classes are locked — unlock one first."}
        new_entries = [dict(e, teacherId=teacher["id"]) if any(t["id"] == e["id"] for t in targets) else e for e in entries]
        return {
            "intent": "change-teacher",
            "reply": f"Assigned {teacher.get('name')} to {len(targets)} {subject.get('short')} class(es).",
            "patch": {"entries": new_entries},
        }

    # ---------- duplicate ----------
    if re.match(r"^(duplicate|copy|repeat)\b", text):
        source = next((e for e in entries if subject and e.get("subjectId") == subject["id"]), None) or label_entry
        if not source:
            return {"intent": "duplicate", "reply": "I can't find that class on the grid."}
        target = free_slot(entries, source, teachers, days=[day] if day else None)
        if not target:
            return {"intent": "duplicate", "reply": "No free slot for a copy. Unlock a period or pick another day."}
        copy = dict(source, id="cls-" + str(uuid.uuid4())[:8], day=target[0], slot=target[1], locked=False, source="ai")
        return {
            "intent": "duplicate",
            "reply": f"Duplicated {(subject or {}).get('short') or source.get('label')} to {DAY_NAMES[target[0]]} {target[1]}.",
            "patch": {"entries": entries + [copy]},
        }

    # ---------- unlock ----------
    if "unlock" in text or "unfreeze" in text:
        if subject:
            ids = [e["id"] for e in entries if e.get("subjectId") == subject["id"] and e.get("locked")]
        elif day:
            ids = [e["id"] for e in entries if e["day"] == day and e.get("locked")]
        else:
            ids = [e["id"] for e in entries if e.get("locked")]
        if not ids:
            return {"intent": "unlock", "reply": "Nothing locked there — it's already editable."}
        return {
            "intent": "unlock",
            "reply": f"Unlocked {len(ids)} cell(s). They're editable now — including by me.",
            "patch": {"unlockIds": ids},
        }

    # ---------- fix conflicts ----------
    if "fix" in text or "resolve" in text:
        if not conflicts:
            return {"intent": "fix-conflicts", "reply": "There are no conflicts right now."}
        new_entries, moves = fix_conflicts(entries, teachers, rooms)
        left = len(find_conflicts(new_entries, teachers, rooms))
        reply = f"Fixed {len(moves)} conflict(s):\n" + "\n".join("- " + m for m in moves)
        if left:
            reply += f"\n\n{left} still left (they involve locked cells)."
        return {"intent": "fix-conflicts", "reply": reply, "patch": {"entries": new_entries}}

    # ---------- explain conflicts ----------
    if "explain" in text or "why" in text or "conflict" in text:
        if not conflicts:
            return {"intent": "explain-conflicts", "reply": "No conflicts found."}
        lines = [f"{i+1}. {DAY_NAMES[c['day']]} {c['slot']}: {c['message']}" for i, c in enumerate(conflicts)]
        return {
            "intent": "explain-conflicts",
            "reply": "\n".join(lines),
            "choices": [{"id": "fix", "label": "Fix them", "action": {"type": "prompt", "prompt": "Fix all conflicts"}}],
        }

    # ---------- move ----------
    if "move" in text or "shift" in text:
        if not subject:
            return {"intent": "move", "reply": "Which subject? e.g. \"move Maths to Wednesday afternoon\""}
        targets = [e for e in entries if e.get("subjectId") == subject["id"] and not e.get("locked")]
        if not targets:
            return {"intent": "move", "reply": f"All {subject.get('short')} classes are locked, unlock one first."}
        e = targets[0]
        target = None
        for d in ([day] if day else WORKING_DAYS):
            for s in time_pref(text):
                need = covered_slots({"day": d, "slot": s, "span": e.get("span") or 1})
                busy = any(x["id"] != e["id"] and x["day"] == d and any(n in covered_slots(x) for n in need) for x in entries)
                if not busy and not teacher_busy([x for x in entries if x["id"] != e["id"]], d, s, e.get("span") or 1, e.get("teacherId")):
                    target = (d, s)
                    break
            if target:
                break
        if not target:
            return {"intent": "move", "reply": "Could not find a free slot there."}
        new_entries = [dict(x, day=target[0], slot=target[1], source="ai") if x["id"] == e["id"] else x for x in entries]
        return {
            "intent": "move",
            "reply": f"Moved {subject.get('short')} to {DAY_NAMES[target[0]]} {target[1]}.",
            "patch": {"entries": new_entries},
        }

    # ---------- free slot ----------
    if "free" in text or "available" in text:
        fake = {"id": "x", "span": 1, "teacherId": (subject or {}).get("teacherId")}
        found = []
        for d in WORKING_DAYS:
            res = free_slot(entries, fake, teachers, days=[d])
            if res:
                found.append(res)
        if not found:
            return {"intent": "free-slot", "reply": "No free period left this week."}
        reply = "Free slots:\n" + "\n".join(f"- {DAY_NAMES[d]} {s}" for d, s in found[:5])
        return {"intent": "free-slot", "reply": reply}

    # ---------- workload ----------
    if "workload" in text or "load" in text:
        load = {}
        for e in entries:
            load[e.get("teacherId")] = load.get(e.get("teacherId"), 0) + (e.get("span") or 1)
        tmap = by_id(teachers)
        lines = [f"- {tmap.get(t, {}).get('name', t)}: {h} hrs" for t, h in sorted(load.items(), key=lambda x: -x[1]) if t]
        return {"intent": "workload", "reply": "Weekly load:\n" + ("\n".join(lines) if lines else "nothing scheduled yet")}

    # ---------- status ----------
    if "status" in text or "summary" in text:
        return {
            "intent": "status",
            "reply": f"{len(entries)} classes, {len(conflicts)} conflicts, {sum(1 for e in entries if e.get('locked'))} locked.",
        }

    reply = (
        "I can edit the timetable directly. Try:\n"
        "- schedule Maths on Monday at 10\n"
        "- move Maths to Wednesday afternoon\n"
        "- change room of Maths to Room 204\n"
        "- delete Maths on Friday\n"
        "- clear Tuesday / clear the timetable\n"
        "- duplicate Maths\n"
        "- fix conflicts / explain conflicts\n"
        "- find free slot / teacher workload"
    )

    if GEMINI_KEY:
        reply = ask_gemini(message, reply)

    return {"intent": "help", "reply": reply}


def ask_gemini(message, fallback):
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = ("You are a timetable assistant for a college. Answer briefly. "
                  "User said: " + message)
        return model.generate_content(prompt).text
    except Exception as err:
        print("gemini failed:", err)
        return fallback
