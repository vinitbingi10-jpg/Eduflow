import { useState } from "react";
import { CalendarOff, GraduationCap, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTimetable } from "@/store/TimetableContext.jsx";
import { useToast } from "@/components/common/Toast.jsx";
import { PageShell } from "@/components/layout/PageShell.jsx";
import { DataTable } from "@/components/common/DataTable.jsx";
import { RecordFormModal } from "@/components/common/RecordFormModal.jsx";
import { Badge, Button } from "@/components/common/Button.jsx";
import { DAYS, DEPARTMENTS, TEACHING_SLOTS } from "@/data/mockData.js";
import { dayLabel, teacherLoad } from "@/utils/timetableUtils.js";

export default function Teachers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, saveRecord, removeRecord, entries, conflicts } = useTimetable();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const load = teacherLoad(entries, conflicts.lookups);

  const fields = [
    { key: "name", label: "Full name", required: true, full: true, placeholder: "Prof. Anjali Patel" },
    {
      key: "departmentId",
      label: "Department",
      type: "select",
      required: true,
      default: "cse",
      options: DEPARTMENTS.map((dep) => ({ value: dep.id, label: dep.name })),
    },
    { key: "maxWeeklyLoad", label: "Max weekly hours", type: "number", min: 1, default: 16, required: true },
    { key: "email", label: "Email", type: "text", placeholder: "name@college.edu", full: true },
    {
      key: "subjectIds",
      label: "Subjects taught",
      type: "multiselect",
      full: true,
      default: [],
      options: data.subjects.map((subject) => ({ value: subject.id, label: `${subject.short} · ${subject.code}` })),
    },
    {
      key: "unavailableDays",
      label: "Unavailable days",
      type: "multiselect",
      full: true,
      default: [],
      hint: "Whole days off — the scheduler and conflict engine respect these",
      options: DAYS.filter((d) => !d.optional).map((day) => ({ value: day.id, label: day.label })),
    },
  ];

  const columns = [
    {
      key: "name",
      header: "Teacher",
      searchable: true,
      render: (row) => (
        <span>
          <span className="block font-medium text-ink-900">{row.name}</span>
          <span className="flex items-center gap-1 text-[11.5px] text-ink-400">
            <Mail className="h-3 w-3" strokeWidth={2} />
            {row.email}
          </span>
        </span>
      ),
    },
    {
      key: "departmentId",
      header: "Department",
      render: (row) => conflicts.lookups.departmentById[row.departmentId]?.code?.toUpperCase() ?? row.departmentId,
      value: (row) => row.departmentId,
    },
    {
      key: "subjectIds",
      header: "Subjects",
      searchable: true,
      value: (row) => (row.subjectIds ?? []).join(" "),
      render: (row) => (
        <span className="flex flex-wrap gap-1">
          {(row.subjectIds ?? []).length ? (
            row.subjectIds.map((id) => <Badge key={id} tone="neutral">{id}</Badge>)
          ) : (
            <span className="text-[12px] text-ink-400">No subjects assigned</span>
          )}
        </span>
      ),
    },
    {
      key: "availability",
      header: "Availability",
      render: (row) => {
        const windows = (row.unavailable ?? []).map((u) => `${dayLabel(u.day, "short")} (${u.slots.length} period${u.slots.length === 1 ? "" : "s"})`);
        return windows.length ? (
          <span className="inline-flex items-center gap-1 text-[12px] text-warn-600">
            <CalendarOff className="h-3.5 w-3.5" strokeWidth={2.1} />
            {windows.join(", ")}
          </span>
        ) : (
          <span className="text-[12px] text-ok-600">Fully available</span>
        );
      },
    },
    {
      key: "load",
      header: "Weekly load",
      align: "right",
      render: (row) => {
        const hours = load[row.id] ?? 0;
        const pct = row.maxWeeklyLoad ? Math.round((hours / row.maxWeeklyLoad) * 100) : 0;
        return (
          <span className="inline-flex items-center justify-end gap-2">
            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-ink-100">
              <span
                className={`block h-full rounded-full transition-all duration-500 ${pct > 90 ? "bg-danger-500" : pct > 70 ? "bg-warn-500" : "bg-brand-500"}`}
                style={{ width: `${Math.max(pct, 3)}%` }}
              />
            </span>
            <span className="font-mono text-[11.5px] text-ink-500">
              {hours}/{row.maxWeeklyLoad}h
            </span>
          </span>
        );
      },
    },
  ];

  return (
    <PageShell
      eyebrow="Reference data"
      title="Teachers"
      subtitle="Staff, departments, subjects they own, availability windows and how much of their contracted load the timetable already uses."
      wide
      actions={
        <>
          <Button variant="secondary" onClick={() => navigate("/subjects")}>
            Manage subjects
          </Button>
          <Button
            variant="primary"
            icon={GraduationCap}
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            Add teacher
          </Button>
        </>
      }
    >
      <DataTable
        icon={GraduationCap}
        title="Teaching staff"
        subtitle={`${data.teachers.length} teachers · ${Object.values(load).reduce((a, b) => a + b, 0)} scheduled hours this week`}
        columns={columns}
        rows={data.teachers}
        searchKeys={["name", "email"]}
        searchPlaceholder="Search teachers…"
        filters={[
          {
            key: "departmentId",
            label: "Department",
            options: DEPARTMENTS.map((dep) => ({ value: dep.id, label: dep.code })),
          },
        ]}
        onEdit={(row) => {
          setEditing({ ...row, unavailableDays: (row.unavailable ?? []).map((u) => u.day) });
          setOpen(true);
        }}
        onDelete={(row) => {
          const used = entries.filter((e) => e.teacherId === row.id).length;
          if (used) {
            toast("Teacher has scheduled classes", { tone: "warning", description: `${used} class(es) still assigned to ${row.name}.` });
            return;
          }
          removeRecord("teachers", row.id);
        }}
      />

      <RecordFormModal
        open={open}
        onClose={() => setOpen(false)}
        icon={GraduationCap}
        title={editing ? `Edit ${editing.name}` : "Add teacher"}
        description="Availability windows feed straight into the conflict engine and AI generation."
        fields={fields}
        initialValues={editing ?? undefined}
        size="lg"
        onSubmit={(values) => {
          const id = editing?.id ?? `t-${values.name.toLowerCase().replace(/[^a-z]+/g, "-").slice(1, 18)}`;
          const unavailable = (values.unavailableDays ?? []).map((day) => ({ day, slots: TEACHING_SLOTS }));
          saveRecord("teachers", { ...values, id, unavailable, subjectIds: values.subjectIds ?? [] });
        }}
      />
    </PageShell>
  );
}
