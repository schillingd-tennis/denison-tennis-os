"use client";

import SearchInput from "@/components/SearchInput";
import { useMemo, useState } from "react";

import { ChangeLogTable, RECRUIT_CARD_EMPTY_LOG } from "./ChangeLogList";
import { changeLogMatchesQuery } from "./display";
import { recruitCardChangeLogSummaries } from "./summaries";
import type { ChangeLogEvent } from "./types";
import styles from "./changeLog.module.css";

export default function RecruitingChangeLogWorkspace({ events }: { events: ChangeLogEvent[] }) {
  const [query, setQuery] = useState("");
  const summaries = recruitCardChangeLogSummaries(events);
  const visible = useMemo(
    () => events.filter((event) => changeLogMatchesQuery(event, query)),
    [events, query],
  );

  return (
    <div className="flex min-w-0 flex-col gap-3" data-recruit-change-log="">
      <div className={styles.strip} aria-label="Change log summary">
        <div className={styles.kpi}>
          <p className={styles.kpiLabel}>Updates this month</p>
          <p className={styles.kpiValue}>{summaries.updatesThisMonth}</p>
        </div>
        <div className={styles.kpi}>
          <p className={styles.kpiLabel}>Ranking changes</p>
          <p className={styles.kpiValue}>{summaries.rankingChanges}</p>
        </div>
        <div className={styles.kpi}>
          <p className={styles.kpiLabel}>Recruiting changes</p>
          <p className={styles.kpiValue}>{summaries.recruitingChanges}</p>
        </div>
      </div>
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search this recruit’s updates"
        aria-label="Search recruit log"
      />
      <ChangeLogTable events={visible} showRecruit={false} emptyLabel={RECRUIT_CARD_EMPTY_LOG} />
    </div>
  );
}
