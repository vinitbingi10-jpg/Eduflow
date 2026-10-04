"""
scheduler.py - conflict checking + a greedy timetable generator

keeps the same day/slot ids as the frontend (src/data/mockData.js)
"""
import uuid

DAYS = ["mon", "tue", "wed", "thu", "fri", "sat"]
WORKING_DAYS = ["mon", "tue", "wed", "thu", "fri"]

SLOTS = [
    {"id": "p1", "start": "08:00", "end": "09:00"},
    {"id": "p2", "start": "09:00", "end": "10:00"},
    {"id": "br1", "start": "10:00", "end": "10:15", "kind": "break"},
    {"id": "p3", "start": "10:15", "end": "11:15"},
    {"id": "p4", "start": "11:15", "end": "12:15"},
    {"id": "lunch", "start": "12:15", "end": "13:00", "kind": "break"},
    {"id": "p5", "start": "13:00", "end": "14:00"},
    {"id": "p6", "start": "14:00", "end": "15:00"},
    {"id": "p7", "start": "15:00", "end": "16:00"},
]
TEACHING_SLOTS = [s["id"] for s in SLOTS if s.get("kind") != "break"]


def covered_slots(entry):
    """slots an entry occupies (labs take 2 periods, breaks are skipped)"""
    span = entry.get("span") or 1
    ids = [s["id"] for s in SLOTS]
    if entry["slot"] not in ids:
        return [entry["slot"]]
    out = []
    i = ids.index(entry["slot"])
    while i < len(SLOTS) and len(out) < span:
        if SLOTS[i].get("kind") != "break":
            out.append(SLOTS[i]["id"])
        i += 1
    return out


def overlaps(a, b):
    if a["day"] != b["day"]:
        return False
    sa = covered_slots(a)
    return any(s in sa for s in covered_slots(b))


def by_id(items):
    return {x["id"]: x for x in items}


def find_conflicts(entries, teachers, rooms):
    teacher_map = by_id(teachers)
    room_map = by_id(rooms)
    conflicts = []

    # pairwise checks
    for i in range(len(entries)):
        for j in range(i + 1, len(entries)):
            a, b = entries[i], entries[j]
            if not overlaps(a, b):
                continue
            reasons = []
            if a.get("teacherId") and a.get("teacherId") == b.get("teacherId"):
                name = teacher_map.get(a["teacherId"], {}).get("name", "Teacher")
                reasons.append({"type": "teacher", "message": f"{name} has two classes at the same time"})
            if a.get("roomId") and a.get("roomId") == b.get("roomId"):
                name = room_map.get(a["roomId"], {}).get("name", "Room")
                lab = a.get("type") in ("Practical", "Laboratory") or b.get("type") in ("Practical", "Laboratory")
                reasons.append({"type": "lab" if lab else "room", "message": f"{name} is double booked"})
            if a.get("division") == b.get("division") and a.get("semester") == b.get("semester"):
                reasons.append({"type": "division", "message": f"Division {a.get('division')} has two classes in one period"})
            if reasons:
                conflicts.append({
                    "id": f"cf-{a['id']}-{b['id']}",
                    "entryIds": [a["id"], b["id"]],
                    "day": a["day"],
                    "slot": a["slot"],
                    "types": [r["type"] for r in reasons],
                    "message": " ".join(r["message"] for r in reasons),
                })

    # teacher not available / room closed
    for e in entries:
        t = teacher_map.get(e.get("teacherId"))
        if t:
            for u in t.get("unavailable", []):
                if u["day"] == e["day"] and any(s in u["slots"] for s in covered_slots(e)):
                    conflicts.append({
                        "id": f"cf-av-{e['id']}",
                        "entryIds": [e["id"]],
                        "day": e["day"],
                        "slot": e["slot"],
                        "types": ["availability"],
                        "message": f"{t['name']} is not available at this time",
                    })
        r = room_map.get(e.get("roomId"))
        if r and r.get("available") is False:
            conflicts.append({
                "id": f"cf-room-{e['id']}",
                "entryIds": [e["id"]],
                "day": e["day"],
                "slot": e["slot"],
                "types": ["availability"],
                "message": f"{r['name']} is closed",
            })
    return conflicts


def is_free(placed, day, slot, span, teacher_id, room_id):
    fake = {"day": day, "slot": slot, "span": span}
    need = covered_slots(fake)
    if len(need) < span:
        return False
    for e in placed:
        if e["day"] != day:
            continue
        if any(s in covered_slots(e) for s in need):
            return False  # division busy
        # same teacher / room somewhere else at this time is checked by overlap above
    return True


def teacher_busy(placed, day, slot, span, teacher_id):
    need = covered_slots({"day": day, "slot": slot, "span": span})
    for e in placed:
        if e["day"] == day and e.get("teacherId") == teacher_id and any(s in covered_slots(e) for s in need):
            return True
    return False


def teacher_available(teacher, day, slot, span):
    if not teacher:
        return True
    need = covered_slots({"day": day, "slot": slot, "span": span})
    for u in teacher.get("unavailable", []):
        if u["day"] == day and any(s in u["slots"] for s in need):
            return False
    return True


def generate_timetable(current, subjects, teachers, rooms, days=None, slot_ids=None, keep_locked=True, meta=None):
    """
    very simple greedy approach:
    go day by day, slot by slot and put the subject with most remaining hours
    that doesn't clash. locked entries are never touched.
    """
    days = days or WORKING_DAYS
    slot_ids = slot_ids or TEACHING_SLOTS
    meta = meta or {}
    teacher_map = by_id(teachers)

    placed = [e for e in current if e.get("locked")] if keep_locked else []
    remaining = {}
    for s in subjects:
        already = sum((e.get("span") or 1) for e in placed if e.get("subjectId") == s["id"])
        remaining[s["id"]] = max(0, s.get("hoursPerWeek", 3) - already)

    classrooms = [r for r in rooms if r.get("available", True) and r.get("type") == "Classroom"]
    labs = [r for r in rooms if r.get("available", True) and r.get("type") != "Classroom"]

    for _pass in range(3):
        for day in days:
            for slot in slot_ids:
                todo = sorted([s for s in subjects if remaining[s["id"]] > 0], key=lambda s: -remaining[s["id"]])
                for s in todo:
                    is_lab = s.get("type") in ("Practical", "Laboratory")
                    span = 2 if is_lab else 1
                    # first pass: max one session of a subject per day so it spreads out
                    if _pass == 0 and any(e["day"] == day and e.get("subjectId") == s["id"] for e in placed):
                        continue
                    if not is_free(placed, day, slot, span, s.get("teacherId"), None):
                        continue
                    if teacher_busy(placed, day, slot, span, s.get("teacherId")):
                        continue
                    if not teacher_available(teacher_map.get(s.get("teacherId")), day, slot, span):
                        continue
                    pool = labs if is_lab else classrooms
                    room = None
                    for r in pool:
                        used = any(e["day"] == day and e.get("roomId") == r["id"] and
                                   any(x in covered_slots(e) for x in covered_slots({"day": day, "slot": slot, "span": span}))
                                   for e in placed)
                        if not used:
                            room = r
                            break
                    if room is None and len(rooms) > 0:
                        continue
                    placed.append({
                        "id": "cls-" + str(uuid.uuid4())[:8],
                        "day": day,
                        "slot": slot,
                        "span": span,
                        "subjectId": s["id"],
                        "teacherId": s.get("teacherId"),
                        "roomId": room["id"] if room else None,
                        "type": "Lecture" if s.get("type") == "Theory" else s.get("type", "Lecture"),
                        "locked": False,
                        "color": s.get("color", "teal"),
                        "departmentId": meta.get("departmentId", s.get("departmentId", "cse")),
                        "semester": meta.get("semester", 3),
                        "division": meta.get("division", "A"),
                        "courseId": meta.get("courseId", "btech-cse"),
                        "note": "",
                        "source": "ai",
                    })
                    remaining[s["id"]] -= span
                    break

    unplaced = [{"id": k, "hours": v} for k, v in remaining.items() if v > 0]
    return {"entries": placed, "unplaced": unplaced}
