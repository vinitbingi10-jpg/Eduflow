import { useEffect, useState } from "react";
import { Check, Copy, Download, FileSpreadsheet, FileText, Link2, Printer, Share2 } from "lucide-react";
import { cn } from "@/utils/cn.js";
import { useTimetable } from "@/store/TimetableContext.jsx";
import { Modal } from "@/components/common/Modal.jsx";
import { Button } from "@/components/common/Button.jsx";

const FORMATS = [
  { id: "pdf", label: "PDF document", detail: "Print-ready A4 landscape with header block", icon: FileText },
  { id: "xlsx", label: "CSV / Excel", detail: "One row per class, opens in Excel", icon: FileSpreadsheet },
  { id: "print", label: "Browser print", detail: "Uses the native print dialog right now", icon: Printer },
  { id: "share", label: "Share read-only link", detail: "Copy a link teachers can open", icon: Share2 },
];

const OPTIONS = [
  { id: "conflicts", label: "Highlight conflicts", hint: "Red outline on clashing cells" },
  { id: "teachers", label: "Include teacher names", hint: "Shown under each subject" },
  { id: "rooms", label: "Include rooms", hint: "Room name on every card" },
  { id: "locked", label: "Mark locked cells", hint: "Padlock icon in the corner" },
  { id: "grid", label: "Include free periods", hint: "Empty cells stay visible" },
];

export function ExportModal() {
  const { ui, closeModal, exportAs, meta, summary } = useTimetable();
  const open = ui.modal === "export";
  const [format, setFormat] = useState("pdf");
  const [options, setOptions] = useState(["conflicts", "teachers", "rooms", "locked"]);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFormat(ui.modalPayload?.format ?? "pdf");
    setCopied(false);
    setBusy(false);
  }, [open, ui.modalPayload]);

  if (!open) return null;

  const shareLink = `${window.location.origin}${window.location.pathname}#/editor?dept=${meta.departmentId}&sem=${meta.semester}&div=${meta.division}`;

  async function run() {
    setBusy(true);
    await exportAs(format);
    setBusy(false);
    closeModal();
  }

  return (
    <Modal
      open={open}
      onClose={closeModal}
      size="md"
      icon={Download}
      title="Export timetable"
      description={`${meta.title} · ${summary.classes} classes · ${meta.academicYear}`}
      footer={
        <>
          <span className="mr-auto text-[11.5px] text-ink-400">
            {format === "pdf" ? "Uses the browser print dialog — pick “Save as PDF”." : format === "xlsx" ? "Downloads a CSV file that opens in Excel." : ""}
          </span>
          <Button variant="ghost" onClick={closeModal}>
            Cancel
          </Button>
          <Button variant="primary" icon={format === "share" ? Link2 : Download} onClick={run} disabled={busy}>
            {busy ? "Preparing…" : format === "print" ? "Print now" : format === "share" ? "Copy link" : `Export ${format.toUpperCase()}`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {FORMATS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFormat(item.id)}
              className={cn(
                "flex items-start gap-2.5 rounded-md border p-2.5 text-left transition",
                format === item.id ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500/20" : "border-ink-200 bg-white hover:border-ink-300"
              )}
            >
              <span className={cn("mt-0.5 flex h-7 w-7 items-center justify-center rounded", format === item.id ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-500")}>
                <item.icon className="h-3.5 w-3.5" strokeWidth={2.2} />
              </span>
              <span>
                <span className="block text-[12.5px] font-semibold text-ink-900">{item.label}</span>
                <span className="block text-[11.5px] leading-snug text-ink-500">{item.detail}</span>
              </span>
            </button>
          ))}
        </div>

        {format === "share" ? (
          <div className="rounded-md border border-ink-200 bg-ink-50/60 p-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-400">Read-only link</p>
            <div className="mt-1.5 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded border border-ink-200 bg-white px-2 py-1.5 font-mono text-[11.5px] text-ink-600">
                {shareLink}
              </code>
              <Button
                size="sm"
                icon={copied ? Check : Copy}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareLink);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1600);
                  } catch {
                    setCopied(false);
                  }
                }}
              >
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>

          </div>
        ) : (
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-400">Include in export</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {OPTIONS.map((option) => {
                const active = options.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setOptions((prev) => (active ? prev.filter((id) => id !== option.id) : [...prev, option.id]))}
                    className={cn(
                      "flex items-center gap-2 rounded border px-2.5 py-1.5 text-left transition",
                      active ? "border-brand-300 bg-brand-50" : "border-ink-200 bg-white hover:border-ink-300"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border",
                        active ? "border-brand-600 bg-brand-600 text-white" : "border-ink-300 bg-white"
                      )}
                    >
                      {active && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-medium text-ink-800">{option.label}</span>
                      <span className="block truncate text-[10.5px] text-ink-400">{option.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
