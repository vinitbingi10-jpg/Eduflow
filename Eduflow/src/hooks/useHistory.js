import { useCallback, useMemo, useState } from "react";

/**
 * Generic undo/redo stack for one piece of state.
 * Used by the timetable store so every add / move / delete / AI patch
 * can be reversed with Ctrl+Z.
 */
export function useHistory(initialValue, { limit = 60 } = {}) {
  const [stack, setStack] = useState({ past: [], present: initialValue, future: [] });

  const set = useCallback(
    (updater, label = "Edit") => {
      setStack((prev) => {
        const next = typeof updater === "function" ? updater(prev.present) : updater;
        if (next === prev.present) return prev;
        return {
          past: [...prev.past, { value: prev.present, label }].slice(-limit),
          present: next,
          future: [],
        };
      });
    },
    [limit]
  );

  /** Replace state without creating a history entry (initial load, resets). */
  const reset = useCallback((value) => {
    setStack({ past: [], present: value, future: [] });
  }, []);

  const undo = useCallback(() => {
    let label = null;
    setStack((prev) => {
      if (!prev.past.length) return prev;
      const last = prev.past[prev.past.length - 1];
      label = last.label;
      return {
        past: prev.past.slice(0, -1),
        present: last.value,
        future: [{ value: prev.present, label: last.label }, ...prev.future].slice(0, limit),
      };
    });
    return label;
  }, [limit]);

  const redo = useCallback(() => {
    let label = null;
    setStack((prev) => {
      if (!prev.future.length) return prev;
      const next = prev.future[0];
      label = next.label;
      return {
        past: [...prev.past, { value: prev.present, label: next.label }].slice(-limit),
        present: next.value,
        future: prev.future.slice(1),
      };
    });
    return label;
  }, [limit]);

  const value = useMemo(
    () => ({
      present: stack.present,
      set,
      reset,
      undo,
      redo,
      canUndo: stack.past.length > 0,
      canRedo: stack.future.length > 0,
      undoLabel: stack.past.length ? stack.past[stack.past.length - 1].label : null,
      redoLabel: stack.future.length ? stack.future[0].label : null,
      depth: stack.past.length,
    }),
    [stack, set, reset, undo, redo]
  );

  return value;
}
