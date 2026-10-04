// app config + defaults. actual data (subjects, teachers, rooms, timetable)
// comes from the backend / whatever the user adds in the app.

export const DAYS = [
  { id: "mon", short: "Mon", label: "Monday", date: "" },
  { id: "tue", short: "Tue", label: "Tuesday", date: "" },
  { id: "wed", short: "Wed", label: "Wednesday", date: "" },
  { id: "thu", short: "Thu", label: "Thursday", date: "" },
  { id: "fri", short: "Fri", label: "Friday", date: "" },
  { id: "sat", short: "Sat", label: "Saturday", date: "", optional: true },
];

export const SLOTS = [
  { id: "p1", start: "08:00", end: "09:00", label: "Period 1" },
  { id: "p2", start: "09:00", end: "10:00", label: "Period 2" },
  { id: "br1", start: "10:00", end: "10:15", label: "Tea Break", kind: "break" },
  { id: "p3", start: "10:15", end: "11:15", label: "Period 3" },
  { id: "p4", start: "11:15", end: "12:15", label: "Period 4" },
  { id: "lunch", start: "12:15", end: "13:00", label: "Lunch", kind: "break" },
  { id: "p5", start: "13:00", end: "14:00", label: "Period 5" },
  { id: "p6", start: "14:00", end: "15:00", label: "Period 6" },
  { id: "p7", start: "15:00", end: "16:00", label: "Period 7" },
];

export const TEACHING_SLOTS = SLOTS.filter((s) => s.kind !== "break").map((s) => s.id);

export const CLASS_TYPES = ["Lecture", "Practical", "Laboratory", "Tutorial", "Elective", "Break", "Seminar", "Workshop"];

export const CATEGORY_COLORS = [
  { id: "teal", label: "Teal", hex: "#17837a" },
  { id: "blue", label: "Blue", hex: "#2a6da8" },
  { id: "amber", label: "Amber", hex: "#c1801a" },
  { id: "rose", label: "Rose", hex: "#b34a63" },
  { id: "plum", label: "Plum", hex: "#6d4a8f" },
  { id: "green", label: "Green", hex: "#3f7d3a" },
  { id: "slate", label: "Slate", hex: "#4d5b6b" },
];

export const ROOM_TYPES = ["Classroom", "Computer Lab", "Physics Lab", "Electronics Lab", "Seminar Hall", "Workshop", "Language Lab"];

// these start empty, add them from the Subjects / Teachers / Rooms pages
export const SUBJECTS = [];
export const TEACHERS = [];
export const ROOMS = [];

export const DEPARTMENTS = [
  { id: "cse", name: "Computer Engineering", code: "CSE" },
  { id: "it", name: "Information Technology", code: "IT" },
  { id: "ece", name: "Electronics & Communication", code: "ECE" },
  { id: "mech", name: "Mechanical Engineering", code: "MECH" },
  { id: "civil", name: "Civil Engineering", code: "CIVIL" },
];

export const COURSES = [
  { id: "btech-cse", name: "B.Tech Computer Engineering", departmentId: "cse" },
  { id: "btech-it", name: "B.Tech Information Technology", departmentId: "it" },
  { id: "btech-ece", name: "B.Tech Electronics & Communication", departmentId: "ece" },
  { id: "btech-mech", name: "B.Tech Mechanical Engineering", departmentId: "mech" },
  { id: "mca", name: "MCA", departmentId: "cse" },
];

export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ id: n, label: `Semester ${n}`, year: Math.ceil(n / 2) }));

export const DIVISIONS = [
  { id: "A", name: "Division A" },
  { id: "B", name: "Division B" },
  { id: "C", name: "Division C" },
];

export const TIMETABLE_META = {
  departmentId: "cse",
  courseId: "btech-cse",
  semester: 3,
  division: "A",
  academicYear: "2026–27",
  week: "Week 1",
  title: "Semester 3 — Division A",
};

export const WEEKS = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6"];
export const ACADEMIC_YEARS = ["2024–25", "2025–26", "2026–27", "2027–28"];

export const DRAG_ELEMENTS = [
  { id: "break", label: "Break", type: "Break", icon: "coffee", color: "amber" },
  { id: "free", label: "Free Period", type: "Lecture", icon: "square", color: "slate" },
  { id: "lunch", label: "Lunch", type: "Break", icon: "utensils", color: "amber" },
  { id: "seminar", label: "Seminar", type: "Seminar", icon: "presentation", color: "rose" },
  { id: "exam", label: "Exam", type: "Lecture", icon: "clipboard", color: "plum" },
  { id: "lab", label: "Lab Session", type: "Practical", icon: "flask", color: "blue" },
];

export const QUICK_ACTIONS = [
  { id: "generate", label: "Generate timetable", prompt: "Generate a timetable for this week" },
  { id: "fix", label: "Fix conflicts", prompt: "Fix all conflicts in the timetable" },
  { id: "optimize", label: "Optimize timetable", prompt: "Optimize the timetable" },
  { id: "free-slot", label: "Find free slot", prompt: "Find a free slot" },
  { id: "workload", label: "Balance teacher workload", prompt: "Balance teacher workload" },
  { id: "regenerate-day", label: "Regenerate Tuesday", prompt: "Regenerate Tuesday" },
  { id: "explain", label: "Explain conflicts", prompt: "Explain the current conflicts" },
];

export const SEED_CHAT = [
  {
    id: "m1",
    role: "assistant",
    text: "Hi! I can actually edit the timetable for you — not just chat. Add subjects, teachers and rooms first, then ask things like:\n\n• “schedule Maths on Monday at 10”\n• “move Maths to Wednesday afternoon”\n• “change room of Maths to Room 204”\n• “delete Maths on Friday” or “clear Tuesday”\n• “duplicate Maths” or “clear the timetable”\n• “fix conflicts” or “explain conflicts”\n\nLocked cells are always protected unless you unlock them.",
    time: "",
  },
];

export const USER = {
  name: "Admin",
  role: "Timetable Coordinator",
  institution: "",
  initials: "AD",
};

export const NOTIFICATIONS = [];
export const RECENT_TIMETABLES = [];

export function buildSeedTimetable() {
  return [];
}
