import { AlertTriangle, ArrowRight, Ban, MoveRight } from "lucide-react";
import { useTimetable } from "@/store/TimetableContext.jsx";
import { Modal } from "@/components/common/Modal.jsx";
import { Button, Badge } from "@/components/common/Button.jsx";
import { ConflictPanel } from "@/components/timetable/ConflictPanel.jsx";
import { dayLabel, nextFreeSlot, slotLabel } from "@/utils/timetableUtils.js";

/** Full-screen conflict review (also reachable from the status bar). */
export function ConflictModal() {
  const { ui, closeModal } = useTimetable();
  return (
    <Modal
      open={ui.modal === "conflicts"}
      onClose={closeModal}
      size="lg"
      icon={AlertTriangle}
      title="Conflicts & AI improvements"
      description="Detected live from the current grid — teacher, room, lab, division and availability rules."
    >
      <div className="h-[30rem]">
        <ConflictPanel />
      </div>
    </Modal>
  );
}

/**
 * "Move anyway?" dialog raised when a drag & drop would create a conflict.
 */
export function MoveConfirmDialog() {
  const { ui, patchUi, entries, confirmPendingMove, cancelPendingMove, moveEntry, conflicts } = useTimetable();
  const pending = ui.pendingMove;
  if (!pending) return null;

  const entry = entries.find((e) => e.id === pending.entryId);
  if (!entry) return null;

  const subject = conflicts.lookups.subjectById[entry.subjectId];
  const teacher = conflicts.lookups.teacherById[entry.teacherId];
  const alternative = nextFreeSlot(entries, {
    span: entry.span || 1,
    excludeIds: [entry.id],
    teacherId: entry.teacherId,
  });

  return (
    <Modal
      open
      onClose={cancelPendingMove}
      size="sm"
      icon={AlertTriangle}
      title="Scheduling conflict"
      description="This move breaks at least one rule. You decide what happens."
      className="border-danger-500/30"
      footer={
        <>
          <Button variant="ghost" icon={Ban} onClick={cancelPendingMove}>
            Cancel
          </Button>
          {alternative && (
            <Button
              variant="secondary"
              icon={MoveRight}
              onClick={() => {
                patchUi({ pendingMove: null });
                moveEntry(entry.id, alternative.day, alternative.slot, { force: true });
              }}
            >
              Choose another slot
            </Button>
          )}
          <Button variant="primary" icon={ArrowRight} className="bg-danger-500 border-danger-600 hover:bg-danger-600" onClick={confirmPendingMove}>
            Move anyway
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-[13px] leading-relaxed text-ink-700">
          <strong className="font-semibold text-ink-900">{subject?.short ?? entry.label ?? entry.subjectId}</strong> with{" "}
          {teacher?.name ?? "no teacher"} cannot move to{" "}
          <strong className="font-semibold text-ink-900">
            {dayLabel(pending.day)} {slotLabel(pending.slot)}
          </strong>
          .
        </p>

        <ul className="space-y-1.5">
          {pending.conflicts.flatMap((conflict) => conflict.reasons).map((reason, index) => (
            <li key={index} className="flex items-start gap-2 rounded-md border border-danger-500/25 bg-danger-50 p-2.5">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger-500" strokeWidth={2.3} />
              <span className="text-[12px] leading-snug text-danger-600">{reason.message}</span>
            </li>
          ))}
        </ul>

        {alternative ? (
          <p className="flex items-center gap-2 rounded-md border border-ok-500/25 bg-ok-50 p-2.5 text-[12px] text-ok-600">
            <Badge tone="ok">Suggestion</Badge>
            {dayLabel(alternative.day)} {slotLabel(alternative.slot)} is free for this teacher and room.
          </p>
        ) : (
          <p className="rounded-md border border-ink-200 bg-ink-50 p-2.5 text-[12px] text-ink-500">
            No conflict-free slot is available right now. Keep the class where it is, or unlock a neighbouring cell.
          </p>
        )}
      </div>
    </Modal>
  );
}
