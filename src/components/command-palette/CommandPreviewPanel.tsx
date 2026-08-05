"use client";

import type { ReactNode } from "react";

import PlayerAvatar from "@/components/PlayerAvatar";
import type {
  ActionPreviewData,
  CommandDefinition,
  CommandPreviewData,
  DocumentPreviewData,
  GenericPreviewData,
  OperationsPreviewData,
  PersonPreviewData,
  RecruitPreviewData,
} from "@/components/command-palette/types";

function PreviewRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="shrink-0 text-xs text-text-secondary">{label}</dt>
      <dd className="min-w-0 text-right text-xs font-medium text-text-primary break-all">
        {value}
      </dd>
    </div>
  );
}

function formatRating(value: number | undefined): string | undefined {
  return value !== undefined ? value.toFixed(1) : undefined;
}

function PersonPreview({ data }: { data: PersonPreviewData }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <PlayerAvatar photoUrl={data.photoUrl} initials={data.initials} size={48} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-primary">{data.name}</p>
          <p className="truncate text-xs text-text-secondary">{data.roleLabel}</p>
        </div>
      </div>
      <dl className="divide-y divide-border/70">
        <PreviewRow label="Roles" value={data.roles.join(" · ")} />
        <PreviewRow label="Class" value={data.classYear} />
        <PreviewRow label="D#" value={data.denisonIdDisplay} />
        <PreviewRow label="UTR" value={formatRating(data.utr)} />
        <PreviewRow label="WTN" value={formatRating(data.wtn)} />
        <PreviewRow label="Hometown" value={data.hometown} />
        <PreviewRow label="Email" value={data.email} />
        <PreviewRow label="Phone" value={data.phone} />
        <PreviewRow label="Recent" value={data.recentActivity} />
      </dl>
    </div>
  );
}

function RecruitPreview({ data }: { data: RecruitPreviewData }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-text-primary">{data.name}</p>
      <dl className="divide-y divide-border/70">
        <PreviewRow label="Rating" value={data.rating} />
        <PreviewRow label="Status" value={data.status} />
        <PreviewRow label="Notes" value={data.notes} />
        <PreviewRow
          label="Tasks"
          value={data.upcomingTasks?.length ? data.upcomingTasks.join(" · ") : undefined}
        />
      </dl>
    </div>
  );
}

function OperationsPreview({ data }: { data: OperationsPreviewData }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-text-primary">{data.title}</p>
      <dl className="divide-y divide-border/70">
        <PreviewRow label="Date" value={data.date} />
        <PreviewRow label="Owner" value={data.owner} />
        <PreviewRow label="Status" value={data.status} />
      </dl>
    </div>
  );
}

function DocumentPreview({ data }: { data: DocumentPreviewData }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-text-primary">{data.title}</p>
      {data.description ? (
        <p className="text-xs leading-relaxed text-text-secondary">{data.description}</p>
      ) : null}
      <dl className="divide-y divide-border/70">
        <PreviewRow label="Modified" value={data.lastModified} />
      </dl>
    </div>
  );
}

function ActionPreview({ data }: { data: ActionPreviewData }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-semibold tracking-wide text-text-secondary uppercase">
        Action
      </p>
      <p className="text-sm leading-relaxed text-text-primary">{data.explanation}</p>
    </div>
  );
}

function GenericPreview({ data }: { data: GenericPreviewData }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-text-primary">{data.title}</p>
      {data.body ? <p className="text-xs leading-relaxed text-text-secondary">{data.body}</p> : null}
      {data.lines?.length ? (
        <dl className="divide-y divide-border/70">
          {data.lines.map((line) => (
            <PreviewRow key={line.label} label={line.label} value={line.value} />
          ))}
        </dl>
      ) : null}
    </div>
  );
}

function renderPreviewData(data: CommandPreviewData): ReactNode {
  switch (data.kind) {
    case "person":
      return <PersonPreview data={data} />;
    case "recruit":
      return <RecruitPreview data={data} />;
    case "operations":
      return <OperationsPreview data={data} />;
    case "document":
      return <DocumentPreview data={data} />;
    case "action":
      return <ActionPreview data={data} />;
    case "generic":
      return <GenericPreview data={data} />;
    default:
      return null;
  }
}

function resolvePreview(command: CommandDefinition): ReactNode {
  const preview = command.preview;
  if (!preview) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-text-primary">{command.label}</p>
        {command.subtitle ? (
          <p className="text-xs leading-relaxed text-text-secondary">{command.subtitle}</p>
        ) : (
          <p className="text-xs text-text-secondary">No preview for this result.</p>
        )}
      </div>
    );
  }
  if (typeof preview === "function") {
    const result = preview();
    if (result == null) return null;
    if (typeof result === "object" && result !== null && "kind" in result) {
      return renderPreviewData(result as CommandPreviewData);
    }
    return result;
  }
  return renderPreviewData(preview);
}

/**
 * Right-rail preview. Updates with highlight only — never navigates.
 */
export default function CommandPreviewPanel({
  command,
}: {
  command: CommandDefinition | undefined;
}) {
  if (!command) {
    return (
      <div className="flex h-full items-center justify-center px-5 py-8">
        <p className="text-center text-xs text-text-secondary">
          Highlight a result to preview.
        </p>
      </div>
    );
  }

  return <div className="h-full overflow-y-auto px-5 py-4">{resolvePreview(command)}</div>;
}
