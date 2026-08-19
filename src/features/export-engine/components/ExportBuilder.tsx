"use client";

import { useEffect, useMemo, useState } from "react";

import { moduleFieldClass } from "@/components/module-theme";
import SegmentedControl from "@/components/toolbar/SegmentedControl";
import { typeRole } from "@/components/typography";

import { downloadExport } from "../generate";
import { initialFieldIdsForPreset, resolveExportFields } from "../matrix";
import { exportGroupLabel } from "../personFields";
import { availableWhoOptions, resolveExportRows } from "../resolveRows";
import type {
  ExportBuilderEntry,
  ExportFormat,
  ExportWho,
} from "../types";

const WHO_LABEL: Record<ExportWho, string> = {
  all: "All Players",
  found_set: "Current Found Set",
  selection: "Selected Players",
  current: "Current Player",
};

function SectionLabel({ children }: { children: string }) {
  return <p className={`mb-2 ${typeRole.sectionLabel}`}>{children}</p>;
}

/**
 * Reusable Export Builder body.
 *
 * Entry context (preset, who, populations) is supplied by the caller so Team
 * workspaces can open the same builder later without a second exporter.
 */
export default function ExportBuilder<TRow>({
  entry,
  bindExport,
}: {
  entry: ExportBuilderEntry<TRow>;
  /** Latest export runner for the drawer primary action. Returns false when invalid. */
  bindExport: (run: () => boolean) => void;
}) {
  const { module, populations } = entry;
  const whoOptions = useMemo(() => availableWhoOptions(populations), [populations]);
  const initialPreset =
    module.presets.find((preset) => preset.id === entry.initialPresetId) ?? module.presets[0];

  const [who, setWho] = useState<ExportWho>(() => {
    const preferred = entry.initialWho ?? "found_set";
    return whoOptions.includes(preferred) ? preferred : (whoOptions[0] ?? "all");
  });
  const [presetId, setPresetId] = useState(initialPreset?.id ?? "custom");
  const [fieldIds, setFieldIds] = useState<string[]>(() =>
    initialFieldIdsForPreset(initialPreset ?? { fieldIds: [], custom: true }, module.defaultFieldIds),
  );
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [error, setError] = useState<string | undefined>();

  const preset = module.presets.find((entryPreset) => entryPreset.id === presetId) ?? initialPreset;
  const rows = resolveExportRows(who, populations);

  const checkboxFields = useMemo(() => {
    if (preset?.custom) return [...module.fields];
    return resolveExportFields(module.fields, preset?.fieldIds ?? []);
  }, [module.fields, preset]);

  const groupedFields = useMemo(() => {
    if (!preset?.custom) {
      return [{ group: "", fields: checkboxFields }];
    }
    const groups: { group: string; fields: typeof checkboxFields }[] = [];
    const index = new Map<string, number>();
    for (const field of checkboxFields) {
      const existing = index.get(field.group);
      if (existing === undefined) {
        index.set(field.group, groups.length);
        groups.push({ group: field.group, fields: [field] });
      } else {
        groups[existing].fields.push(field);
      }
    }
    return groups;
  }, [checkboxFields, preset?.custom]);

  function handlePresetChange(nextId: string) {
    const next = module.presets.find((entryPreset) => entryPreset.id === nextId);
    if (!next) return;
    setPresetId(nextId);
    setFieldIds(initialFieldIdsForPreset(next, module.defaultFieldIds));
    setError(undefined);
  }

  function toggleField(id: string, checked: boolean) {
    setFieldIds((current) => {
      if (checked) {
        if (current.includes(id)) return current;
        const order = checkboxFields.map((field) => field.id);
        const next = [...current, id];
        next.sort((a, b) => order.indexOf(a) - order.indexOf(b));
        return next;
      }
      return current.filter((fieldId) => fieldId !== id);
    });
    setError(undefined);
  }

  useEffect(() => {
    bindExport(() => {
      if (fieldIds.length === 0) {
        setError("Select at least one field.");
        return false;
      }
      if (rows.length === 0) {
        setError("No records to export.");
        return false;
      }
      downloadExport({
        module,
        rows,
        fieldIds,
        format,
        presetId,
        who,
      });
      return true;
    });
  }, [bindExport, fieldIds, format, module, presetId, rows, who]);

  return (
    <div className="space-y-5">
      <section>
        <SectionLabel>Who</SectionLabel>
        <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Who to export">
          {whoOptions.map((option) => {
            const count = resolveExportRows(option, populations).length;
            return (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-2.5 rounded-control px-1 py-0.5 text-sm text-text-primary"
              >
                <input
                  type="radio"
                  name="export-who"
                  value={option}
                  checked={who === option}
                  onChange={() => {
                    setWho(option);
                    setError(undefined);
                  }}
                  className="accent-[var(--module-accent)]"
                />
                <span>
                  {WHO_LABEL[option]}
                  <span className={`ml-1.5 ${typeRole.metadataSm}`}>({count})</span>
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <section>
        <SectionLabel>Preset</SectionLabel>
        <select
          className={moduleFieldClass}
          value={presetId}
          aria-label="Export preset"
          onChange={(event) => handlePresetChange(event.target.value)}
        >
          {module.presets.map((entryPreset) => (
            <option key={entryPreset.id} value={entryPreset.id}>
              {entryPreset.label}
            </option>
          ))}
        </select>
      </section>

      <section>
        <SectionLabel>Fields</SectionLabel>
        <div className="space-y-3">
          {groupedFields.map((group) => (
            <div key={group.group || "preset"}>
              {group.group ? (
                <p className={`mb-1.5 ${typeRole.workspaceGroupTitle}`}>{exportGroupLabel(group.group)}</p>
              ) : null}
              <div className="flex flex-col gap-1">
                {group.fields.map((field) => (
                  <label
                    key={field.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-control px-1 py-0.5 text-sm text-text-primary"
                  >
                    <input
                      type="checkbox"
                      checked={fieldIds.includes(field.id)}
                      onChange={(event) => toggleField(field.id, event.target.checked)}
                      className="accent-[var(--module-accent)]"
                    />
                    {field.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionLabel>Format</SectionLabel>
        <SegmentedControl
          ariaLabel="Export format"
          value={format}
          onChange={setFormat}
          options={[
            { value: "xlsx", label: "Excel (.xlsx)" },
            { value: "csv", label: "CSV" },
          ]}
        />
      </section>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
