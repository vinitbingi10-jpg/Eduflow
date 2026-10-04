import { useState } from "react";
import { BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTimetable } from "@/store/TimetableContext.jsx";
import { useToast } from "@/components/common/Toast.jsx";
import { PageShell } from "@/components/layout/PageShell.jsx";
import { DataTable } from "@/components/common/DataTable.jsx";
import { RecordFormModal } from "@/components/common/RecordFormModal.jsx";
import { Badge, Button } from "@/components/common/Button.jsx";
import { CATEGORY_COLORS, CLASS_TYPES, DEPARTMENTS } from "@/data/mockData.js";
import { categoryHex } from "@/components/timetable/TimetableCard.jsx";

const TYPE_TONE = { Theory: "info", Practical: "brand", Elective: "warn", Seminar: "danger", Workshop: "neutral" };

export default function Subjects() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, saveRecord, removeRecord, entries, conflicts } = useTimetable();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const fields = [
    { key: "name", label: "Subject name", required: true, full: true, placeholder: "Database Management Systems" },
    { key: "code", label: "Code", required: true, placeholder: "CS301" },
    { key: "short", label: "Short name", required: true, placeholder: "e.g. Maths", hint: "Shown on timetable cards" },
    {
      key: "teacherId",
      label: "Teacher",
      type: "select",
      required: true,
      options: data.teachers.map((teacher) => ({ value: teacher.id, label: teacher.name })),
    },
    { key: "hoursPerWeek", label: "Hours / week", type: "number", min: 1, required: true, default: 4 },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      default: "Theory",
      options: ["Theory", ...CLASS_TYPES].filter((v, i, list) => list.indexOf(v) === i).map((type) => ({ value: type, label: type })),
    },
    { key: "semester", label: "Semester", type: "number", min: 1, default: 3, required: true },
    {
      key: "departmentId",
      label: "Department",
      type: "select",
      default: "cse",
      options: DEPARTMENTS.map((dep) => ({ value: dep.id, label: dep.name })),
    },
    {
      key: "color",
      label: "Card colour",
      type: "select",
      default: "teal",
      options: CATEGORY_COLORS.map((color) => ({ value: color.id, label: color.label })),
    },
    { key: "credits", label: "Credits", type: "number", min: 0, default: 3 },
  ];

  const columns = [
    {
      key: "name",
      header: "Subject",
      searchable: true,
      value: (row) => row.name,
      render: (row) => (
        <span className="flex items-center gap-2">
          <span className="h-6 w-1 rounded-full" style={{ background: categoryHex(row.color) }} />
          <span>
            <span className="block font-medium text-ink-900">{row.name}</span>
            <span className="block text-[11.5px] text-ink-400">{row.short}</span>
          </span>
        </span>
      ),
    },
    { key: "code", header: "Code", searchable: true, render: (row) => <span className="font-mono text-[12px]">{row.code}</span> },
    {
      key: "teacherId",
      header: "Teacher",
      searchable: true,
      value: (row) => data.teachers.find((t) => t.id === row.teacherId)?.name ?? "",
      render: (row) => data.teachers.find((t) => t.id === row.teacherId)?.name ?? "—",
    },
    {
      key: "hoursPerWeek",
      header: "Hours / week",
      render: (row) => {
        const scheduled = entries.filter((e) => e.subjectId === row.id).reduce((n, e) => n + (e.span || 1), 0);
        const pct = Math.min(100, Math.round((scheduled / row.hoursPerWeek) * 100));
        return (
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-ink-100">
              <span
                className="block h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(pct, 4)}%`, background: categoryHex(row.color) }}
              />
            </span>
            <span className="font-mono text-[11.5px] text-ink-500">
              {scheduled}/{row.hoursPerWeek}
            </span>
          </span>
        );
      },
    },
    { key: "type", header: "Type", render: (row) => <Badge tone={TYPE_TONE[row.type] ?? "neutral"}>{row.type}</Badge> },
    { key: "credits", header: "Credits", align: "right", render: (row) => <span className="font-mono">{row.credits}</span> },
    { key: "semester", header: "Sem", align: "right" },
  ];

  return (
    <PageShell
      eyebrow="Reference data"
      title="Subjects"
      subtitle="Every subject the timetable can schedule — with weekly hour targets, credits and the teacher who owns it."
      wide
      actions={
        <>
          <Button variant="secondary" onClick={() => navigate("/teachers")}>
            Manage teachers
          </Button>
          <Button
            variant="primary"
            icon={BookOpen}
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            Add subject
          </Button>
        </>
      }
    >
      <DataTable
        icon={BookOpen}
        title="Subject catalogue"
        subtitle={`${data.subjects.length} subjects · ${conflicts.lookups.departments.length} departments`}
        columns={columns}
        rows={data.subjects}
        searchKeys={["name", "code", "short"]}
        searchPlaceholder="Search subjects or codes…"
        filters={[
          {
            key: "type",
            label: "Type",
            options: ["Theory", "Practical", "Elective", "Seminar", "Workshop"].map((type) => ({ value: type, label: type })),
          },
          { key: "semester", label: "Semester", options: [1, 2, 3, 4, 5, 6, 7, 8].map((sem) => ({ value: String(sem), label: `Sem ${sem}` })), value: (row) => String(row.semester) },
        ]}
        onEdit={(row) => {
          setEditing(row);
          setOpen(true);
        }}
        onDelete={(row) => {
          const used = entries.filter((e) => e.subjectId === row.id).length;
          if (used) {
            toast("Subject is in use", { tone: "warning", description: `${used} scheduled class(es) still reference ${row.short}.` });
            return;
          }
          removeRecord("subjects", row.id);
        }}
        emptyLabel="No subjects match this filter"
      />

      <RecordFormModal
        open={open}
        onClose={() => setOpen(false)}
        icon={BookOpen}
        title={editing ? `Edit ${editing.short}` : "Add subject"}
        description={editing ? "Changes apply to the timetable immediately." : "The subject becomes draggable in the editor sidebar."}
        fields={fields}
        initialValues={editing ?? undefined}
        onSubmit={(values) => {
          const id = editing?.id ?? values.code.toUpperCase().replace(/\s+/g, "-");
          saveRecord("subjects", { ...values, id });
        }}
      />
    </PageShell>
  );
}
