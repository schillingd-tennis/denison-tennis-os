"use client";

import Link from "next/link";

import { INTRA_SQUAD_TABS, type IntraSquadTab } from "../types";
import { intraSquadTabHref } from "../display";
import styles from "./intraSquadDashboard.module.css";

export default function IntraSquadTabs({ active }: { active: IntraSquadTab }) {
  return (
    <nav aria-label="Intra Squad sections" className={styles.tabs}>
      {INTRA_SQUAD_TABS.map((tab) => {
        const selected = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={intraSquadTabHref(tab.id)}
            scroll={false}
            aria-current={selected ? "page" : undefined}
            className={`${styles.tab} ${selected ? styles.tabActive : ""}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
