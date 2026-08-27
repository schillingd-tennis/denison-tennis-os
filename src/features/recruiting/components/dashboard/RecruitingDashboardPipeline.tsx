import type { DashboardPipelineStage } from "../../dashboard";
import styles from "./recruitingDashboard.module.css";

const STAGE_TINT: Record<DashboardPipelineStage["id"], string> = {
  potential: "bg-warning/12 text-warning",
  active: "bg-info/10 text-info",
  offer: "bg-app-background text-text-secondary",
  committed: "bg-success/10 text-success",
};

export default function RecruitingDashboardPipeline({
  stages,
}: {
  stages: DashboardPipelineStage[];
}) {
  return (
    <div data-recruiting-dashboard-pipeline="" className={`${styles.pipeline} px-3.5 py-3`}>
      {stages.map((stage) => (
        <div
          key={stage.id}
          data-recruiting-dashboard-pipeline-stage={stage.id}
          className={`rounded-control px-2 py-2 text-center ${STAGE_TINT[stage.id]}`}
        >
          <p className="truncate text-[10px] font-semibold tracking-wide uppercase">{stage.label}</p>
          <p className="mt-1 text-[16px] leading-none font-semibold tabular-nums">
            {stage.count == null ? "—" : stage.count}
          </p>
          {stage.count == null ? (
            <p className="mt-1 text-[9px] font-medium tracking-wide uppercase">Coming soon</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
