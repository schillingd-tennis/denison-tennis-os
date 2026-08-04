import type { FieldType, FormMode, SelectOption } from "./types";
import ValidationMessage from "./ValidationMessage";

/**
 * A single labeled value that renders as plain text in view mode (visually
 * identical to `InformationField`) and as a minimal, borderless inline
 * input in edit mode — Notion/Airtable style, not a boxed traditional form
 * field. Deliberately has no knowledge of `Person` or any other record
 * shape: the caller wires `value`/`onChange` to whatever draft object it's
 * editing, which is what makes this reusable across future workspaces.
 */
export default function EditableField({
  label,
  value,
  onChange,
  mode,
  type = "text",
  options,
  error,
  placeholder,
  required,
  step,
  formatDisplay,
  className,
}: {
  label: string;
  value: string | number | undefined;
  onChange: (raw: string) => void;
  mode: FormMode;
  type?: FieldType;
  options?: SelectOption[];
  error?: string;
  placeholder?: string;
  required?: boolean;
  step?: number;
  /** Formats the value for view-mode display (falls back to `String(value)`). */
  formatDisplay?: (value: string | number | undefined) => string | undefined;
  className?: string;
}) {
  if (mode === "view") {
    const displayValue = formatDisplay
      ? formatDisplay(value)
      : value !== undefined && value !== ""
        ? String(value)
        : undefined;

    if (!displayValue) return null;

    return (
      <div className={className}>
        <dt className="text-xs font-medium tracking-wide text-text-secondary uppercase">{label}</dt>
        <dd className="mt-1 text-sm whitespace-pre-wrap text-text-primary">{displayValue}</dd>
      </div>
    );
  }

  const inputClassName =
    "-mx-2 w-full rounded-control border border-transparent bg-transparent px-2 py-1.5 text-sm text-text-primary transition-colors duration-150 placeholder:text-text-secondary hover:border-border hover:bg-app-background focus:border-denison-red focus:bg-surface focus:ring-1 focus:ring-denison-red focus:outline-none";

  return (
    <div className={className}>
      <label className="text-xs font-medium tracking-wide text-text-secondary uppercase">
        {label}
        {required ? <span className="text-denison-red"> *</span> : null}
      </label>
      {type === "textarea" ? (
        <textarea
          value={value !== undefined ? String(value) : ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={5}
          className={`${inputClassName} mt-1 resize-none`}
        />
      ) : type === "select" ? (
        <select
          value={value !== undefined ? String(value) : ""}
          onChange={(event) => onChange(event.target.value)}
          className={`${inputClassName} mt-1`}
        >
          <option value="">—</option>
          {options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type === "number" ? "number" : type}
          value={value !== undefined ? String(value) : ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          step={step}
          className={`${inputClassName} mt-1`}
        />
      )}
      <ValidationMessage message={error} />
    </div>
  );
}
