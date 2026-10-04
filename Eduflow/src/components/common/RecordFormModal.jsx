import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { cn } from "@/utils/cn.js";
import { Modal, Field, Select, TextInput, inputClass } from "@/components/common/Modal.jsx";
import { Button } from "@/components/common/Button.jsx";

/**
 * Generic add/edit dialog driven by a field schema.
 * Used by the Subjects, Teachers and Rooms pages.
 */
export function RecordFormModal({ open, onClose, onSubmit, title, description, icon, fields, initialValues, size = "md" }) {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    const base = {};
    fields.forEach((field) => {
      base[field.key] = initialValues?.[field.key] ?? field.default ?? "";
    });
    setValues(base);
    setErrors({});
    // `fields` is intentionally not a dependency: it is rebuilt on every parent
    // render, which would wipe what the user is typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues]);

  if (!open) return null;

  const set = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));

  function submit() {
    const nextErrors = {};
    fields.forEach((field) => {
      if (field.required && !String(values[field.key] ?? "").trim()) {
        nextErrors[field.key] = `${field.label} is required`;
      }
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const payload = { ...initialValues, ...values };
    fields.forEach((field) => {
      if (field.type === "number" || field.type === "multiselect") {
        payload[field.key] = field.type === "number" ? Number(payload[field.key] ?? 0) : payload[field.key];
      }
    });
    onSubmit(payload);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size={size}
      icon={icon}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" icon={Save} onClick={submit}>
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <Field
            key={field.key}
            label={field.label}
            hint={field.hint}
            required={field.required}
            error={errors[field.key]}
            className={cn(field.full && "sm:col-span-2")}
          >
            {field.type === "select" ? (
              <Select value={values[field.key] ?? ""} onChange={(event) => set(field.key, event.target.value)}>
                {field.placeholder && <option value="">{field.placeholder}</option>}
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            ) : field.type === "multiselect" ? (
              <div className="scroll-slim max-h-40 space-y-1 overflow-y-auto rounded-md border border-ink-200 p-1.5">
                {field.options.map((option) => {
                  const selected = (values[field.key] ?? []).includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-[12.5px] transition",
                        selected ? "bg-brand-50 text-brand-700" : "text-ink-600 hover:bg-ink-50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          set(field.key, selected ? values[field.key].filter((id) => id !== option.value) : [...(values[field.key] ?? []), option.value])
                        }
                        className="h-3.5 w-3.5 accent-brand-600"
                      />
                      {option.label}
                    </label>
                  );
                })}
              </div>
            ) : field.type === "textarea" ? (
              <textarea
                value={values[field.key] ?? ""}
                onChange={(event) => set(field.key, event.target.value)}
                rows={2}
                placeholder={field.placeholder}
                className={cn(inputClass, "resize-none")}
              />
            ) : (
              <TextInput
                type={field.type === "number" ? "number" : "text"}
                value={values[field.key] ?? ""}
                min={field.min}
                placeholder={field.placeholder}
                onChange={(event) => set(field.key, event.target.value)}
              />
            )}
          </Field>
        ))}
      </div>
    </Modal>
  );
}
