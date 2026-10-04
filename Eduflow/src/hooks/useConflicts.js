import { useMemo } from "react";
import { detectConflicts, conflictsByEntry, getImprovements } from "@/utils/conflictDetection.js";
import { makeLookups } from "@/utils/timetableUtils.js";

/**
 * Real-time conflict engine binding: recomputes whenever the timetable or the
 * reference data changes, and exposes ready-to-paint lookup maps.
 */
export function useConflicts(entries, data, rules) {
  const lookups = useMemo(
    () => makeLookups(data),
    [data?.subjects, data?.teachers, data?.rooms, data?.departments]
  );

  const allConflicts = useMemo(() => detectConflicts(entries, lookups), [entries, lookups]);

  /** Rules can be switched off in Settings → they are applied here. */
  const conflicts = useMemo(() => {
    if (!rules) return allConflicts;
    return allConflicts.filter((conflict) => conflict.types.some((type) => rules[type] !== false));
  }, [allConflicts, rules]);
  const byEntry = useMemo(() => conflictsByEntry(conflicts), [conflicts]);
  const improvements = useMemo(() => getImprovements(entries, lookups), [entries, lookups]);

  const counts = useMemo(() => {
    const acc = { teacher: 0, room: 0, lab: 0, division: 0, availability: 0 };
    conflicts.forEach((conflict) => {
      conflict.types.forEach((type) => {
        acc[type] = (acc[type] ?? 0) + 1;
      });
    });
    return acc;
  }, [conflicts]);

  return useMemo(
    () => ({
      lookups,
      conflicts,
      byEntry,
      improvements,
      counts,
      total: conflicts.length,
      critical: conflicts.filter((c) => c.severity === "critical").length,
    }),
    [lookups, conflicts, byEntry, improvements, counts]
  );
}
