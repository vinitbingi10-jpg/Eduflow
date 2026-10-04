import { useState } from "react";
import { DoorOpen, Users as UsersIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTimetable } from "@/store/TimetableContext.jsx";
import { useToast } from "@/components/common/Toast.jsx";
import { PageShell } from "@/components/layout/PageShell.jsx";
import { DataTable } from "@/components/common/DataTable.jsx";
import { RecordFormModal } from "@/components/common/RecordFormModal.jsx";
import { Badge, Button } from "@/components/common/Button.jsx";
import { ROOM_TYPES } from "@/data/mockData.js";
import { roomUsage } from "@/utils/timetableUtils.js";

export default function Rooms() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, saveRecord, removeRecord, entries, conflicts } = useTimetable();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const usage = roomUsage(entries, conflicts.lookups);
  const capacity = 35;

  const fields = [
    { key: "name", label: "Room name", required: true, full: true, placeholder: "Computer Lab 1" },
    { key: "capacity", label: "Capacity", type: "number", min: 1, default: 60, required: true },
    {
      key: "type",
      label: "Room type",
      type: "select",
      required: true,
      default: "Classroom",
      options: ROOM_TYPES.map((type) => ({ value: type, label: type })),
    },
    { key: "block", label: "Block", default: "A", hint: "Building block label" },
    {
      key: "available",
      label: "Availability",
      type: "select",
      default: "true",
      options: [
        { value: "true", label: "Available this term" },
        { value: "false", label: "Closed / under maintenance" },
      ],
    },
  ];

  const columns = [
    {
      key: "name",
      header: "Room",
      searchable: true,
      render: (row) => (
        <span className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink-100 text-ink-500">
            <DoorOpen className="h-3.5 w-3.5" strokeWidth={2.1} />
          </span>
          <span>
            <span className="block font-medium text-ink-900">{row.name}</span>
            <span className="block text-[11.5px] text-ink-400">Block {row.block}</span>
          </span>
        </span>
      ),
    },
    {
      key: "capacity",
      header: "Capacity",
      align: "right",
      render: (row) => (
        <span className="inline-flex items-center justify-end gap-1 font-mono text-[12px] text-ink-600">
          <UsersIcon className="h-3.5 w-3.5 text-ink-400" strokeWidth={2} />
          {row.capacity}
        </span>
      ),
    },
    { key: "type", header: "Type", searchable: true, render: (row) => <Badge tone={row.type === "Classroom" ? "neutral" : "info"}>{row.type}</Badge> },
    {
      key: "available",
      header: "Availability",
      render: (row) => (
        <button
          type="button"
          onClick={() => saveRecord("rooms", { ...row, available: !row.available })}
          className={`rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] ring-1 transition ${
            row.available ? "bg-ok-50 text-ok-600 ring-ok-500/25 hover:bg-ok-500 hover:text-white" : "bg-danger-50 text-danger-600 ring-danger-500/25 hover:bg-danger-500 hover:text-white"
          }`}
        >
          {row.available ? "Available" : "Closed"}
        </button>
      ),
      value: (row) => (row.available ? "available" : "closed"),
    },
    {
      key: "usage",
      header: "Booked this week",
      render: (row) => {
        const hours = usage[row.id] ?? 0;
        const pct = Math.round((hours / capacity) * 100);
        return (
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-20 overflow-hidden rounded-full bg-ink-100">
              <span
                className={`block h-full rounded-full transition-all duration-500 ${pct > 80 ? "bg-warn-500" : "bg-info-500"}`}
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </span>
            <span className="font-mono text-[11.5px] text-ink-500">
              {hours}/{capacity}
            </span>
          </span>
        );
      },
    },
  ];

  return (
    <PageShell
      eyebrow="Reference data"
      title="Rooms & labs"
      subtitle="Capacity, type and availability for every space the scheduler can book — classrooms, computer labs, physics and electronics labs, seminar halls."
      wide
      actions={
        <>
          <Button variant="secondary" onClick={() => navigate("/teachers")}>
            Manage teachers
          </Button>
          <Button
            variant="primary"
            icon={DoorOpen}
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            Add room
          </Button>
        </>
      }
    >
      <DataTable
        icon={DoorOpen}
        title="Room inventory"
        subtitle={`${data.rooms.filter((r) => r.available).length} of ${data.rooms.length} rooms available`}
        columns={columns}
        rows={data.rooms}
        searchKeys={["name", "block"]}
        searchPlaceholder="Search rooms…"
        filters={[
          { key: "type", label: "Type", options: ROOM_TYPES.map((type) => ({ value: type, label: type })) },
          {
            key: "available",
            label: "Status",
            options: [
              { value: "true", label: "Available" },
              { value: "false", label: "Closed" },
            ],
            value: (row) => String(row.available),
          },
        ]}
        onEdit={(row) => {
          setEditing({ ...row, available: String(row.available) });
          setOpen(true);
        }}
        onDelete={(row) => {
          const used = entries.filter((e) => e.roomId === row.id).length;
          if (used) {
            toast("Room is booked", { tone: "warning", description: `${used} class(es) still use ${row.name}.` });
            return;
          }
          removeRecord("rooms", row.id);
        }}
      />

      <RecordFormModal
        open={open}
        onClose={() => setOpen(false)}
        icon={DoorOpen}
        title={editing ? `Edit ${editing.name}` : "Add room"}
        description="Closed rooms are skipped by AI generation and flagged by the conflict engine."
        fields={fields}
        initialValues={editing ?? undefined}
        onSubmit={(values) => {
          const id = editing?.id ?? `r-${values.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(1, 18)}`;
          saveRecord("rooms", { ...values, id, available: values.available === "true" || values.available === true });
        }}
      />
    </PageShell>
  );
}
