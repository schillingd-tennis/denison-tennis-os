"use client";

import { useCallback, useState, type ReactNode } from "react";
import { ClipboardList, Download } from "lucide-react";

import type { FoundSetColumn } from "@/components/found-set";
import { copyFoundSet, exportFoundSetCsv } from "@/components/found-set";
import QuickActionButton from "@/components/QuickActionButton";

import type { RecruitDirectoryRow } from "./directory";
import {
  RECRUITING_FOUND_SET_COLUMNS,
  RECRUITING_FOUND_SET_FILENAME_BASE,
} from "./directoryColumns";

export function useRecruitingFoundSetActions(
  rows: RecruitDirectoryRow[],
  columns: FoundSetColumn<RecruitDirectoryRow>[] = RECRUITING_FOUND_SET_COLUMNS,
  filenameBase: string = RECRUITING_FOUND_SET_FILENAME_BASE,
) {
  const [foundSetFeedback, setFoundSetFeedback] = useState<string | undefined>(undefined);

  const handleCopyFoundSet = useCallback(async () => {
    if (rows.length === 0) return;
    try {
      await copyFoundSet(rows, columns);
      setFoundSetFeedback("Found set copied");
      window.setTimeout(() => setFoundSetFeedback(undefined), 2000);
    } catch {
      setFoundSetFeedback("Copy failed");
      window.setTimeout(() => setFoundSetFeedback(undefined), 2000);
    }
  }, [rows, columns]);

  const handleExportFoundSet = useCallback(() => {
    if (rows.length === 0) return;
    exportFoundSetCsv({
      rows,
      columns,
      filenameBase,
    });
  }, [rows, columns, filenameBase]);

  const actionButtons: ReactNode = (
    <>
      <QuickActionButton
        onAction={rows.length > 0 ? handleCopyFoundSet : undefined}
        icon={ClipboardList}
        label="Copy Found Set"
        tone="neutral"
        unavailableTitle="No records in found set"
      />
      <QuickActionButton
        onAction={rows.length > 0 ? handleExportFoundSet : undefined}
        icon={Download}
        label="Export Found Set"
        tone="neutral"
        unavailableTitle="No records in found set"
      />
    </>
  );

  return { foundSetFeedback, actionButtons };
}
