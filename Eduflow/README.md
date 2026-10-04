# Eduflow

Timetable maker for colleges. You can make the timetable by hand, let the AI generate it,
or mix both (lock the cells you want to keep and let AI fill the rest).

## Run frontend

```
npm install
npm run dev
```

## Run backend

```
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Frontend talks to `http://localhost:8000/api` by default. If the backend is not running the
app still works, it just keeps everything in the browser until you refresh.

To change the API url make a `.env` file:

```
VITE_API_URL=http://localhost:8000/api
```

For Gemini replies set `GEMINI_API_KEY` before starting the backend (optional).

## API

| Method | URL | What it does |
|---|---|---|
| GET | /api/health | check server |
| GET/POST | /api/subjects | list / add subject |
| PUT/DELETE | /api/subjects/{id} | edit / delete subject |
| GET/POST | /api/teachers | same for teachers |
| GET/POST | /api/rooms | same for rooms |
| GET | /api/timetable | get entries + conflicts |
| PUT | /api/timetable | save entries |
| DELETE | /api/timetable | clear |
| GET | /api/timetable/conflicts | conflict list |
| POST | /api/timetable/generate | generate (keeps locked cells) |
| POST | /api/ai/chat | chat with the assistant |

Data is saved in `backend/data.json`.
