import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  DAYS,
  SLOTS,
  TEACHING_SLOTS,
  SUBJECTS,
  TEACHERS,
  ROOMS,
  DEPARTMENTS,
  TIMETABLE_META,
  SEED_CHAT,
} from "@/data/mockData.js";
import { useHistory } from "@/hooks/useHistory.js";
import { useConflicts } from "@/hooks/useConflicts.js";
import { useToast } from "@/components/common/Toast.jsx";
import * as timetableService from "@/services/timetableService.js";
import * as aiService from "@/services/aiService.js";
import {
  cellKey,
  coveredSlots,
  createEntry,
  nextFreeSlot,
  summarize,
} from "@/utils/timetableUtils.js";
import { previewMove } from "@/utils/conflictDetection.js";

const TimetableContext = createContext(null);

const DEFAULT_SETTINGS = {
  zoom: 100,
  view: "week", // week | day
  activeDay: "mon",
  rowHeight: "comfortable", // comfortable | compact
  showConflicts: true,
  visibleDays: DAYS.filter((d) => !d.optional).map((d) => d.id),
  conflictRules: { teacher: true, room: true, lab: true, division: true, availability: true },
  aiOpenPanel: true,
  respectLocked: true,
  confirmMoves: true,
};

let messageCounter = 0;
const makeMessage = (message) => {
  messageCounter += 1;
  return {
    id: `msg-${Date.now().toString(36)}-${messageCounter}`,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    ...message,
  };
};

export function TimetableProvider({ children }) {
  const { toast } = useToast();
  const history = useHistory([]);
  const entries = history.present;

  const [ready, setReady] = useState(false);
  const [meta, setMetaState] = useState(TIMETABLE_META);
  const [data, setData] = useState({
    subjects: SUBJECTS,
    teachers: TEACHERS,
    rooms: ROOMS,
    departments: DEPARTMENTS,
  });
  const [settings, setSettingsState] = useState(DEFAULT_SETTINGS);
  const [mode, setMode] = useState("hybrid");
  const [selection, setSelection] = useState({ entryIds: [], cell: null });
  const [clipboard, setClipboard] = useState(null);
  const [saveState, setSaveState] = useState({ status: "idle", at: null });
  const [highlight, setHighlight] = useState(null);
  const [ui, setUi] = useState({
    // phones start with the asset drawer closed so the canvas gets the screen
    sidebar: typeof window === "undefined" ? true : window.innerWidth >= 768,
    sidebarTab: "classes",
    aiOpen: true,
    modal: null,
    modalPayload: null,
    contextMenu: null,
    pendingMove: null,
    notifications: false,
    search: false,
    shortcuts: false,
    rightPanel: "properties", // properties | conflicts
  });
  const [chat, setChat] = useState({ messages: SEED_CHAT.map(makeMessage), typing: false });

  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const conflictState = useConflicts(entries, data, settings.conflictRules);
  const { lookups } = conflictState;
  const conflictRef = useRef(conflictState);
  conflictRef.current = conflictState;
  const lookupsRef = useRef(lookups);
  lookupsRef.current = lookups;

  /* ------------------------------ Bootstrapping ---------------------------- */

  useEffect(() => {
    let cancelled = false;
    Promise.all([timetableService.fetchTimetable(), timetableService.fetchReferenceData()]).then(([result, reference]) => {
      if (cancelled) return;
      history.reset(result.entries);
      setMetaState(result.meta);
      if (reference) setData((prev) => ({ ...prev, ...reference }));
      setReady(true);
      setSaveState({ status: "saved", at: new Date() });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------------------- Autosave ------------------------------- */

  const firstRun = useRef(true);
  useEffect(() => {
    if (!ready) return;
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setSaveState((prev) => ({ ...prev, status: "saving" }));
    const timer = setTimeout(() => {
      timetableService.saveTimetable({ entries, meta }).then((res) => {
        setSaveState({ status: "saved", at: new Date(res.savedAt) });
      });
    }, 900);
    return () => clearTimeout(timer);
  }, [entries, meta, ready]);

  /* --------------------------------- Helpers ------------------------------- */

  const commit = useCallback(
    (updater, label) => {
      history.set((list) => updater(list), label);
    },
    [history]
  );

  const openModal = useCallback((modal, modalPayload = null) => {
    setUi((prev) => ({ ...prev, modal, modalPayload, contextMenu: null }));
  }, []);

  const closeModal = useCallback(() => {
    setUi((prev) => ({ ...prev, modal: null, modalPayload: null }));
  }, []);

  const patchUi = useCallback((patch) => setUi((prev) => ({ ...prev, ...patch })), []);

  const setSettings = useCallback((patch) => setSettingsState((prev) => ({ ...prev, ...patch })), []);

  const setMeta = useCallback((patch) => setMetaState((prev) => ({ ...prev, ...patch })), []);

  /* ------------------------------ Entry actions ---------------------------- */

  const addEntry = useCallback(
    (payload, options = {}) => {
      const entry = createEntry(payload);
      const clashes = previewMove(entriesRef.current, entry, { day: entry.day, slot: entry.slot }, lookupsRef.current);
      commit((list) => [...list, entry], options.label ?? "Add class");
      if (clashes.length && !options.silent) {
        toast("Class added with a conflict", {
          tone: "warning",
          description: clashes[0].message,
        });
      } else if (!options.silent) {
        toast("Class added", { tone: "success", description: `${lookupsRef.current.subjectById[entry.subjectId]?.short} · ${DAYS.find((d) => d.id === entry.day)?.label} ${SLOTS.find((s) => s.id === entry.slot)?.start}` });
      }
      setSelection({ entryIds: [entry.id], cell: { day: entry.day, slot: entry.slot } });
      return entry;
    },
    [commit, toast]
  );

  const updateEntry = useCallback(
    (id, patch, label = "Edit class") => {
      commit((list) => list.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)), label);
    },
    [commit]
  );

  const deleteEntries = useCallback(
    (ids) => {
      const list = entriesRef.current;
      const targets = list.filter((entry) => ids.includes(entry.id));
      const locked = targets.filter((entry) => entry.locked);
      const removable = targets.filter((entry) => !entry.locked);

      if (locked.length) {
        toast("Locked cells cannot be deleted", {
          tone: "warning",
          description: `Unlock ${locked.length} cell(s) first — locked means locked.`,
        });
      }
      if (!removable.length) return false;

      commit((current) => current.filter((entry) => !removable.some((r) => r.id === entry.id)), "Delete class");
      setSelection((prev) => ({ ...prev, entryIds: prev.entryIds.filter((id) => !removable.some((r) => r.id === id)) }));
      toast(removable.length > 1 ? `${removable.length} classes deleted` : "Class deleted", { tone: "success" });
      return true;
    },
    [commit, toast]
  );

  /**
   * Move an entry. Locked cells refuse to move; conflicts raise a confirm
   * dialog (ui.pendingMove) unless `force` is set.
   */
  const moveEntry = useCallback(
    (id, day, slot, options = {}) => {
      const entry = entriesRef.current.find((e) => e.id === id);
      if (!entry) return false;
      if (entry.locked && !options.force) {
        toast("Unable to move class", { tone: "error", description: "This cell is locked. Unlock it to move the session." });
        return false;
      }
      if (entry.day === day && entry.slot === slot) return false;

      const clashes = previewMove(entriesRef.current, entry, { day, slot }, lookupsRef.current);
      const askFirst = settingsRef.current.confirmMoves !== false;
      if (clashes.length && !options.force && askFirst) {
        patchUi({ pendingMove: { entryId: id, day, slot, conflicts: clashes } });
        return false;
      }

      commit(
        (list) => list.map((e) => (e.id === id ? { ...e, day, slot, source: options.source ?? e.source } : e)),
        options.label ?? "Move class"
      );
      setSelection({ entryIds: [id], cell: { day, slot } });
      if (clashes.length) {
        toast("Class moved — conflict detected", { tone: "warning", description: clashes[0].message });
      } else if (!options.silent) {
        toast("Timetable updated", { tone: "success" });
      }
      return true;
    },
    [commit, patchUi, toast]
  );

  const confirmPendingMove = useCallback(() => {
    const pending = ui.pendingMove;
    if (!pending) return;
    patchUi({ pendingMove: null });
    moveEntry(pending.entryId, pending.day, pending.slot, { force: true });
  }, [moveEntry, patchUi, ui.pendingMove]);

  const cancelPendingMove = useCallback(() => {
    patchUi({ pendingMove: null });
    toast("Move cancelled", { tone: "info", description: "The session stayed in its original slot." });
  }, [patchUi, toast]);

  const toggleLock = useCallback(
    (ids, value) => {
      const targets = entriesRef.current.filter((e) => ids.includes(e.id));
      if (!targets.length) return;
      const next = value ?? !targets.every((t) => t.locked);
      commit((list) => list.map((e) => (ids.includes(e.id) ? { ...e, locked: next } : e)), next ? "Lock cells" : "Unlock cells");
      toast(next ? "Class locked" : "Class unlocked", {
        tone: next ? "info" : "success",
        description: next ? "AI and drag & drop will skip this cell." : "The cell is editable again.",
      });
    },
    [commit, toast]
  );

  const lockRow = useCallback(
    (day) => {
      const ids = entriesRef.current.filter((e) => e.day === day).map((e) => e.id);
      if (!ids.length) {
        toast("Nothing to lock", { tone: "info", description: "That day has no scheduled classes." });
        return;
      }
      commit((list) => list.map((e) => (e.day === day ? { ...e, locked: true } : e)), "Lock day");
      toast(`${DAYS.find((d) => d.id === day)?.label} locked`, { tone: "info", description: `${ids.length} sessions frozen.` });
    },
    [commit, toast]
  );

  const lockColumn = useCallback(
    (slot) => {
      const ids = entriesRef.current.filter((e) => coveredSlots(e).includes(slot)).map((e) => e.id);
      if (!ids.length) {
        toast("Nothing to lock", { tone: "info", description: "That period has no scheduled classes." });
        return;
      }
      commit(
        (list) => list.map((e) => (coveredSlots(e).includes(slot) ? { ...e, locked: true } : e)),
        "Lock period"
      );
      toast(`Period ${SLOTS.find((s) => s.id === slot)?.start} locked`, { tone: "info", description: `${ids.length} sessions frozen.` });
    },
    [commit, toast]
  );

  const duplicateEntry = useCallback(
    (id) => {
      const entry = entriesRef.current.find((e) => e.id === id);
      if (!entry) return;
      const target = nextFreeSlot(entriesRef.current, {
        span: entry.span || 1,
        excludeIds: [entry.id],
        teacherId: entry.teacherId,
      });
      if (!target) {
        toast("No free slot to duplicate into", { tone: "warning" });
        return;
      }
      const copy = createEntry({ ...entry, id: undefined, day: target.day, slot: target.slot, locked: false });
      commit((list) => [...list, copy], "Duplicate class");
      setSelection({ entryIds: [copy.id], cell: { day: copy.day, slot: copy.slot } });
      toast("Class duplicated", { tone: "success", description: `Placed at ${DAYS.find((d) => d.id === target.day)?.short} ${SLOTS.find((s) => s.id === target.slot)?.start}` });
    },
    [commit, toast]
  );

  const copyEntry = useCallback(
    (id) => {
      const entry = entriesRef.current.find((e) => e.id === id);
      if (!entry) return;
      setClipboard(entry);
      toast("Copied to clipboard", { tone: "info", description: `${lookupsRef.current.subjectById[entry.subjectId]?.short ?? entry.subjectId} — paste into any empty period.` });
    },
    [toast]
  );

  const pasteEntry = useCallback(
    (cell) => {
      if (!clipboard) {
        toast("Clipboard is empty", { tone: "info", description: "Copy a class first (Ctrl+C)." });
        return;
      }
      const target = cell ?? selection.cell;
      if (!target) return;
      const copy = createEntry({ ...clipboard, id: undefined, day: target.day, slot: target.slot, locked: false });
      commit((list) => [...list, copy], "Paste class");
      setSelection({ entryIds: [copy.id], cell: target });
      toast("Class pasted", { tone: "success" });
    },
    [clipboard, commit, selection.cell, toast]
  );

  const replaceEntries = useCallback(
    (next, label = "AI update", options = {}) => {
      commit(() => next, label);
      if (!options.silent) {
        toast("Timetable updated", { tone: "ai", description: options.description ?? label });
      }
    },
    [commit, toast]
  );

  const clearTimetable = useCallback(() => {
    commit(() => [], "Clear timetable");
    toast("Timetable cleared", { tone: "info", description: "Locked cells were cleared too — use Undo (Ctrl+Z) to restore." });
  }, [commit, toast]);

  /* ---------------------------- Generation flow ---------------------------- */

  const generate = useCallback(
    async (params, onProgress) => {
      const steps = [
        "Loading subjects",
        "Checking teacher availability",
        "Checking rooms & labs",
        "Applying constraints",
        "Optimizing schedule",
      ];
      for (let i = 0; i < steps.length; i += 1) {
        onProgress?.({ step: i, label: steps[i], percent: Math.round(((i + 1) / steps.length) * 100) });
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 420));
      }
      const result = await timetableService.generateTimetable({
        ...params,
        entries: entriesRef.current,
        subjects: params.subjectIds?.length ? data.subjects.filter((s) => params.subjectIds.includes(s.id)) : data.subjects,
        teachers: data.teachers,
        rooms: data.rooms,
      });
      commit(() => result.entries, "AI generation");
      onProgress?.({ done: true, percent: 100, count: result.entries.length, unplaced: result.unplaced });
      toast("Timetable generated successfully", {
        tone: "ai",
        description: `${result.entries.length} sessions placed · ${result.entries.filter((e) => e.locked).length} locked cells preserved`,
      });
      return result;
    },
    [commit, data.rooms, data.subjects, data.teachers, toast]
  );

  /* -------------------------------- Selection ------------------------------ */

  const selectEntry = useCallback((id, options = {}) => {
    setSelection((prev) => {
      if (options.multi) {
        const has = prev.entryIds.includes(id);
        return {
          entryIds: has ? prev.entryIds.filter((x) => x !== id) : [...prev.entryIds, id],
          cell: prev.cell,
        };
      }
      return { entryIds: [id], cell: prev.cell };
    });
    setUi((prev) => ({ ...prev, rightPanel: "properties" }));
  }, []);

  const selectCell = useCallback((cell, options = {}) => {
    setSelection((prev) => ({
      entryIds: options.keepEntries ? prev.entryIds : [],
      cell,
    }));
    setHighlight(null);
  }, []);

  const clearSelection = useCallback(() => {
    setSelection({ entryIds: [], cell: null });
  }, []);

  const focusEntry = useCallback((id) => {
    const entry = entriesRef.current.find((e) => e.id === id);
    if (!entry) return;
    setSelection({ entryIds: [id], cell: { day: entry.day, slot: entry.slot } });
    setHighlight({ key: cellKey(entry.day, entry.slot), entryId: id });
    setUi((prev) => ({ ...prev, rightPanel: "properties", search: false }));
    setTimeout(() => setHighlight(null), 2600);
  }, []);

  /* ------------------------------ History control -------------------------- */

  const undo = useCallback(() => {
    const label = history.undo();
    if (label) toast(`Undid: ${label}`, { tone: "info", duration: 2200 });
    return Boolean(label);
  }, [history, toast]);

  const redo = useCallback(() => {
    const label = history.redo();
    if (label) toast(`Redid: ${label}`, { tone: "info", duration: 2200 });
    return Boolean(label);
  }, [history, toast]);

  /* ------------------------------ Reference data --------------------------- */

  const mutateCollection = useCallback(
    (key, updater, label) => {
      setData((prev) => ({ ...prev, [key]: updater(prev[key]) }));
      if (label) toast(label, { tone: "success" });
    },
    [toast]
  );

  const saveRecord = useCallback(
    (key, record) => {
      const exists = data[key].some((item) => item.id === record.id);
      mutateCollection(
        key,
        (list) => (exists ? list.map((item) => (item.id === record.id ? { ...item, ...record } : item)) : [...list, record]),
        exists ? `${singular(key)} updated` : `${singular(key)} added`
      );
      if (exists) timetableService.updateRecord(key, record.id, record);
      else timetableService.createRecord(key, record);
    },
    [data, mutateCollection]
  );

  const removeRecord = useCallback(
    (key, id) => {
      mutateCollection(key, (list) => list.filter((item) => item.id !== id), `${singular(key)} deleted`);
      timetableService.deleteRecord(key, id);
    },
    [mutateCollection]
  );

  const saveRecordRef = useRef(saveRecord);
  saveRecordRef.current = saveRecord;

  /* --------------------------------- AI chat -------------------------------- */

  const pushMessage = useCallback((message) => {
    setChat((prev) => ({ ...prev, messages: [...prev.messages, makeMessage(message)] }));
  }, []);

  const setTyping = useCallback((typing) => setChat((prev) => ({ ...prev, typing })), []);

  const clearChat = useCallback(() => {
    setChat({ messages: SEED_CHAT.map(makeMessage), typing: false });
    toast("Chat cleared", { tone: "info", duration: 2200 });
  }, [toast]);

  const runPrompt = useCallback(
    async (prompt, options = {}) => {
      if (!options.hideUserMessage) pushMessage({ role: "user", text: prompt });
      setTyping(true);
      try {
        let result = await aiService.sendPrompt(prompt, {
          entries: entriesRef.current,
          lookups: lookupsRef.current,
          conflicts: conflictRef.current.conflicts,
          improvements: conflictRef.current.improvements,
          meta,
        });

        const patch = result?.patch;
        // Manual mode: the assistant may advise, but never edits the board.
        const wantsPatch = Boolean(
          patch?.entries || patch?.lockIds || patch?.unlockIds || patch?.add?.length || patch?.removeIds?.length || patch?.update?.length
        );
        if (modeRef.current === "manual" && wantsPatch) {
          result = {
            ...result,
            patch: undefined,
            reply: `${result.reply}\n\nManual mode is on, so I have not touched the board. Switch to Hybrid or AI and I will apply it.`,
          };
        }

        setChat((prev) => ({
          typing: false,
          messages: [
            ...prev.messages,
            makeMessage({
              role: "assistant",
              text: result.reply,
              intent: result.intent,
              choices: result.choices,
            }),
          ],
        }));

        const applied = result.patch;
        if (applied?.entries) {
          commit(() => applied.entries, `AI · ${result.intent}`);
          toast("AI applied a timetable change", { tone: "ai", description: "Ctrl+Z reverts it." });
        }
        if (applied?.add?.length) {
          commit((list) => [...list, ...applied.add], `AI · ${result.intent}`);
          toast("AI added to the timetable", { tone: "ai", description: "Ctrl+Z reverts it." });
        }
        if (applied?.removeIds?.length) {
          const force = Boolean(applied.force);
          commit((list) => list.filter((e) => !applied.removeIds.includes(e.id) || (!force && e.locked)), `AI · ${result.intent}`);
          toast("AI removed classes", { tone: "ai", description: "Ctrl+Z reverts it." });
        }
        if (applied?.update?.length) {
          const patchesById = Object.fromEntries(applied.update.map((item) => [item.id, item]));
          commit((list) => list.map((e) => (patchesById[e.id] ? { ...e, ...patchesById[e.id], id: e.id } : e)), `AI · ${result.intent}`);
          toast("AI edited classes", { tone: "ai", description: "Ctrl+Z reverts it." });
        }
        if (applied?.lockIds) {
          commit((list) => list.map((e) => (applied.lockIds.includes(e.id) ? { ...e, locked: true } : e)), "AI · lock");
          toast("Sessions locked", { tone: "info" });
        }
        if (applied?.unlockIds) {
          commit((list) => list.map((e) => (applied.unlockIds.includes(e.id) ? { ...e, locked: false } : e)), "AI · unlock");
          toast("Sessions unlocked", { tone: "info" });
        }
        ["subjects", "teachers", "rooms"].forEach((key) => {
          if (applied?.[key]?.length) {
            const list = [...applied[key]];
            setTimeout(() => list.forEach((record) => saveRecordRef.current(key, record)), 250);
          }
        });
        return result;
      } catch (error) {
        setTyping(false);
        pushMessage({ role: "assistant", text: "Something went wrong while processing that request. Please try again." });
        return null;
      }
    },
    [commit, meta, pushMessage, setTyping, toast]
  );

  const applyChoice = useCallback(
    (choice) => {
      const action = choice?.action;
      if (!action) return;
      pushMessage({ role: "user", text: choice.label });
      if (action.type === "prompt") {
        runPrompt(action.prompt, { hideUserMessage: true });
        return;
      }
      if (action.type === "open-generate") {
        openModal("generate");
        pushMessage({ role: "assistant", text: "Opening the generator — pick your constraints and I will take it from there." });
        return;
      }
      if (action.type === "open-modal") {
        openModal(action.modal, action.modalPayload ?? null);
        pushMessage({ role: "assistant", text: "Opening the form for you. Fill it in and it appears in the sidebar." });
        return;
      }
      if (action.type === "move-entry") {
        setTyping(true);
        setTimeout(() => {
          moveEntry(action.entryId, action.day, action.slot, { force: true, source: "ai", silent: true });
          setTyping(false);
          pushMessage({
            role: "assistant",
            text: `Done — moved to ${DAYS.find((d) => d.id === action.day)?.label} ${SLOTS.find((s) => s.id === action.slot)?.start}.`,
          });
        }, 500);
        return;
      }
      if (action.type === "add") {
        addEntry({ subjectId: action.subjectId, day: action.day, slot: action.slot, source: "ai" }, { silent: true });
        pushMessage({ role: "assistant", text: "Added to the board. Check the cell — it is unlocked, so you can still move it." });
        return;
      }
      if (action.type === "focus") {
        selectCell({ day: action.day, slot: action.slot });
        setHighlight({ key: cellKey(action.day, action.slot) });
        setTimeout(() => setHighlight(null), 2400);
        pushMessage({ role: "assistant", text: "Highlighted the free period on the canvas." });
      }
    },
    [addEntry, moveEntry, openModal, pushMessage, runPrompt, selectCell, setTyping]
  );

  const regenerateLast = useCallback(() => {
    const lastUser = [...chat.messages].reverse().find((m) => m.role === "user");
    if (!lastUser) {
      toast("Nothing to regenerate", { tone: "info" });
      return;
    }
    // Drop the previous answer, then ask again.
    setChat((prev) => {
      const messages = [...prev.messages];
      while (messages.length && messages[messages.length - 1].role === "assistant") messages.pop();
      return { ...prev, messages };
    });
    runPrompt(lastUser.text, { hideUserMessage: true });
  }, [chat.messages, runPrompt, toast]);

  /* --------------------------------- Exports -------------------------------- */

  const save = useCallback(async () => {
    setSaveState({ status: "saving", at: null });
    const res = await timetableService.saveTimetable({ entries: entriesRef.current, meta });
    setSaveState({ status: "saved", at: new Date(res.savedAt) });
    toast("Timetable saved", { tone: "success", description: `${res.entries} sessions stored locally.` });
  }, [meta, toast]);

  const exportAs = useCallback(
    async (format) => {
      if (format === "print" || format === "pdf") {
        window.print();
        toast(format === "pdf" ? "Choose “Save as PDF” in the print dialog" : "Print dialog opened", { tone: "info" });
      } else if (format === "xlsx" || format === "csv") {
        timetableService.downloadCsv(entriesRef.current, lookupsRef.current, meta);
        toast("CSV downloaded", { tone: "success", description: "Open it in Excel or Google Sheets." });
      } else {
        toast("Link copied", { tone: "success" });
      }
    },
    [meta, toast]
  );

  const summary = useMemo(() => summarize(entries, lookups), [entries, lookups]);

  const value = useMemo(
    () => ({
      // data
      entries,
      meta,
      data,
      settings,
      mode,
      ready,
      selection,
      clipboard,
      saveState,
      highlight,
      ui,
      chat,
      summary,
      conflicts: conflictState,
      history: { canUndo: history.canUndo, canRedo: history.canRedo, depth: history.depth, undoLabel: history.undoLabel, redoLabel: history.redoLabel },
      teachingSlots: TEACHING_SLOTS,
      // ui
      openModal,
      closeModal,
      patchUi,
      setSettings,
      setMeta,
      setMode,
      // entries
      addEntry,
      updateEntry,
      deleteEntries,
      moveEntry,
      confirmPendingMove,
      cancelPendingMove,
      toggleLock,
      lockRow,
      lockColumn,
      duplicateEntry,
      copyEntry,
      pasteEntry,
      replaceEntries,
      clearTimetable,
      generate,
      // selection
      selectEntry,
      selectCell,
      clearSelection,
      focusEntry,
      // history
      undo,
      redo,
      // reference data
      saveRecord,
      removeRecord,
      // ai
      runPrompt,
      applyChoice,
      clearChat,
      regenerateLast,
      pushMessage,
      setTyping,
      // files
      save,
      exportAs,
    }),
    [
      entries, meta, data, settings, mode, ready, selection, clipboard, saveState, highlight, ui, chat, summary,
      conflictState, history.canUndo, history.canRedo, history.depth, history.undoLabel, history.redoLabel,
      openModal, closeModal, patchUi, setSettings, setMeta, addEntry, updateEntry, deleteEntries, moveEntry,
      confirmPendingMove, cancelPendingMove, toggleLock, lockRow, lockColumn, duplicateEntry, copyEntry,
      pasteEntry, replaceEntries, clearTimetable, generate, selectEntry, selectCell, clearSelection, focusEntry,
      undo, redo, saveRecord, removeRecord, runPrompt, applyChoice, clearChat, regenerateLast, pushMessage,
      setTyping, save, exportAs,
    ]
  );

  return <TimetableContext.Provider value={value}>{children}</TimetableContext.Provider>;
}

function singular(key) {
  return { subjects: "Subject", teachers: "Teacher", rooms: "Room", departments: "Department" }[key] ?? "Record";
}

export function useTimetable() {
  const ctx = useContext(TimetableContext);
  if (!ctx) throw new Error("useTimetable must be used inside <TimetableProvider>");
  return ctx;
}

/** Narrow selectors keep re-renders down in heavy components. */
export function useEntries() {
  return useTimetable().entries;
}

export function useLookups() {
  return useTimetable().conflicts.lookups;
}
