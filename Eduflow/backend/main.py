"""
Eduflow - backend
run:  uvicorn main:app --reload --port 8000

Simple FastAPI server. Data is stored in data.json so we don't need a DB for the hackathon.
TODO (later): move to postgres
"""
import json
import os
import uuid
from datetime import datetime

from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware

from scheduler import generate_timetable, find_conflicts, DAYS, SLOTS
from ai import handle_chat

app = FastAPI(title="Eduflow API", version="0.1")

# allow the react dev server to call us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_FILE = os.path.join(os.path.dirname(__file__), "data.json")

EMPTY_DB = {
    "subjects": [],
    "teachers": [],
    "rooms": [],
    "timetable": [],
    "meta": {
        "departmentId": "cse",
        "courseId": "btech-cse",
        "semester": 3,
        "division": "A",
        "academicYear": "2026-27",
        "week": "Week 1",
        "title": "Semester 3 - Division A",
    },
}


def load_db():
    if not os.path.exists(DB_FILE):
        save_db(EMPTY_DB)
    with open(DB_FILE, "r") as f:
        return json.load(f)


def save_db(db):
    with open(DB_FILE, "w") as f:
        json.dump(db, f, indent=2)


COLLECTIONS = ["subjects", "teachers", "rooms"]


def check_collection(name):
    if name not in COLLECTIONS:
        raise HTTPException(status_code=404, detail="unknown collection " + name)


# ---------------- basic ----------------

@app.get("/api/health")
def health():
    return {"status": "ok", "time": datetime.now().isoformat()}


@app.get("/api/config")
def config():
    # frontend already has these but handy for testing
    return {"days": DAYS, "slots": SLOTS}


# ---------------- subjects / teachers / rooms ----------------

@app.get("/api/{collection}")
def list_items(collection: str):
    check_collection(collection)
    db = load_db()
    return db[collection]


@app.post("/api/{collection}")
def add_item(collection: str, item: dict = Body(...)):
    check_collection(collection)
    db = load_db()
    if not item.get("id"):
        item["id"] = str(uuid.uuid4())[:8]
    # replace if same id already exists
    db[collection] = [x for x in db[collection] if x["id"] != item["id"]]
    db[collection].append(item)
    save_db(db)
    return item


@app.put("/api/{collection}/{item_id}")
def update_item(collection: str, item_id: str, patch: dict = Body(...)):
    check_collection(collection)
    db = load_db()
    for x in db[collection]:
        if x["id"] == item_id:
            x.update(patch)
            save_db(db)
            return x
    raise HTTPException(status_code=404, detail="not found")


@app.delete("/api/{collection}/{item_id}")
def delete_item(collection: str, item_id: str):
    check_collection(collection)
    db = load_db()
    before = len(db[collection])
    db[collection] = [x for x in db[collection] if x["id"] != item_id]
    save_db(db)
    return {"deleted": before - len(db[collection])}


# ---------------- timetable ----------------

@app.get("/api/timetable")
def get_timetable():
    db = load_db()
    return {
        "meta": db["meta"],
        "entries": db["timetable"],
        "conflicts": find_conflicts(db["timetable"], db["teachers"], db["rooms"]),
    }


@app.put("/api/timetable")
def save_timetable(payload: dict = Body(...)):
    db = load_db()
    db["timetable"] = payload.get("entries", [])
    if payload.get("meta"):
        db["meta"].update(payload["meta"])
    save_db(db)
    return {"ok": True, "savedAt": datetime.now().isoformat(), "count": len(db["timetable"])}


@app.delete("/api/timetable")
def clear_timetable():
    db = load_db()
    db["timetable"] = []
    save_db(db)
    return {"ok": True}


@app.get("/api/timetable/conflicts")
def get_conflicts():
    db = load_db()
    return find_conflicts(db["timetable"], db["teachers"], db["rooms"])


@app.post("/api/timetable/generate")
def generate(params: dict = Body(default={})):
    db = load_db()
    # locked entries sent from the frontend are kept as they are
    current = params.get("entries", db["timetable"])
    subjects = db["subjects"]
    if params.get("subjectIds"):
        subjects = [s for s in subjects if s["id"] in params["subjectIds"]]
    if len(subjects) == 0:
        raise HTTPException(status_code=400, detail="add some subjects first")

    result = generate_timetable(
        current,
        subjects,
        db["teachers"],
        db["rooms"],
        days=params.get("days"),
        slot_ids=params.get("slotIds"),
        keep_locked=params.get("constraints", {}).get("keepLocked", True),
        meta={
            "departmentId": params.get("departmentId", db["meta"]["departmentId"]),
            "semester": params.get("semester", db["meta"]["semester"]),
            "division": params.get("division", db["meta"]["division"]),
            "courseId": params.get("courseId", db["meta"]["courseId"]),
        },
    )
    db["timetable"] = result["entries"]
    save_db(db)
    return result


# ---------------- ai chat ----------------

@app.post("/api/ai/chat")
def chat(payload: dict = Body(...)):
    db = load_db()
    message = payload.get("message", "")
    entries = payload.get("entries", db["timetable"])
    answer = handle_chat(message, entries, db["subjects"], db["teachers"], db["rooms"])
    # if the ai changed the timetable, save it
    if answer.get("patch") and answer["patch"].get("entries") is not None:
        db["timetable"] = answer["patch"]["entries"]
        save_db(db)
    return answer
