import { BookOpen, DoorOpen, GraduationCap } from "lucide-react";
import { useTimetable } from "@/store/TimetableContext.jsx";
import { RecordFormModal } from "@/components/common/RecordFormModal.jsx";
import { CATEGORY_COLORS, CLASS_TYPES, DEPARTMENTS, ROOM_TYPES } from "@/data/mockData.js";

/**
 * Quick "add subject / teacher / room" dialogs that can be opened from the editor
 * (sidebar, toolbar, add-class form) without going to the management pages.
 * open with: openModal("subject") / openModal("teacher") / openModal("room")
 */
export function QuickAddModal() {
  const { ui, closeModal, data, saveRecord } = useTimetable();
  const kind = ["subject", "teacher", "room"].includes(ui.modal) ? ui.modal : null;
  if (!kind) return null;

  const onDone = ui.modalPayload?.onDone;

  if (kind === "subject") {
    const fields = [
      { key: "name", label: "Subject name", required: true, full: true, placeholder: "e.g. Data Structures" },
      { key: "code", label: "Code", required: true, placeholder: "CS201" },
      { key: "short", label: "Short name", required: true, placeholder: "DS", hint: "Shown on timetable cards" },
      {
        key: "teacherId",
        label: "Teacher",
        type: "select",
        placeholder: data.teachers.length ? "— choose teacher —" : "— no teachers added yet —",
        options: data.teachers.map((t) => ({ value: t.id, label: t.name })),
      },
      { key: "hoursPerWeek", label: "Hours / week", type: "number", min: 1, default: 4, required: true },
      {
        key: "type",
        label: "Type",
        type: "select",
        default: "Theory",
        options: ["Theory", "Practical", "Elective", "Seminar", "Workshop", "Tutorial"].map((t) => ({ value: t, label: t })),
      },
      { key: "semester", label: "Semester", type: "number", min: 1, default: 3 },
      { key: "credits", label: "Credits", type: "number", min: 0, default: 3 },
      { key: "departmentId", label: "Department", type: "select", default: "cse", options: DEPARTMENTS.map((d) => ({ value: d.id, label: d.name })) },
      { key: "color", label: "Card colour", type: "select", default: "teal", options: CATEGORY_COLORS.map((c) => ({ value: c.id, label: c.label })) },
    ];
    return (
      <RecordFormModal
        open
        onClose={closeModal}
        icon={BookOpen}
        title="Add subject"
        description="It shows up in the sidebar right away so you can drag it onto the grid."
        fields={fields}
        onSubmit={(values) => {
          const id = values.code.toUpperCase().replace(/\s+/g, "-");
          const record = { ...values, id, teacherId: values.teacherId || null };
          saveRecord("subjects", record);
          onDone?.(record);
        }}
      />
    );
  }

  if (kind === "teacher") {
    const fields = [
      { key: "name", label: "Full name", required: true, full: true, placeholder: "Prof. Name" },
      { key: "departmentId", label: "Department", type: "select", default: "cse", options: DEPARTMENTS.map((d) => ({ value: d.id, label: d.name })) },
      { key: "maxWeeklyLoad", label: "Max weekly hours", type: "number", min: 1, default: 16, required: true },
      { key: "email", label: "Email", full: true, placeholder: "name@college.edu" },
    ];
    return (
      <RecordFormModal
        open
        onClose={closeModal}
        icon={GraduationCap}
        title="Add teacher"
        fields={fields}
        onSubmit={(values) => {
          const id = "t-" + values.name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "").slice(0, 20) + "-" + Date.now().toString(36).slice(-3);
          const record = { ...values, id, subjectIds: [], unavailable: [] };
          saveRecord("teachers", record);
          onDone?.(record);
        }}
      />
    );
  }

  const fields = [
    { key: "name", label: "Room name", required: true, full: true, placeholder: "Room 101" },
    { key: "capacity", label: "Capacity", type: "number", min: 1, default: 60, required: true },
    { key: "type", label: "Room type", type: "select", default: "Classroom", options: ROOM_TYPES.map((t) => ({ value: t, label: t })) },
    { key: "block", label: "Block", default: "A" },
  ];
  return (
    <RecordFormModal
      open
      onClose={closeModal}
      icon={DoorOpen}
      title="Add room"
      fields={fields}
      onSubmit={(values) => {
        const id = "r-" + values.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 20);
        const record = { ...values, id, available: true };
        saveRecord("rooms", record);
        onDone?.(record);
      }}
    />
  );
}

export { CLASS_TYPES };
