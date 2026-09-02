import { NextResponse } from "next/server";

import {
  finalizeIncrementalUtrAgentBatch,
  importSingleUtrAgentRecruitResult,
  importUtrAgentCheckResults,
} from "@/features/recruiting/todayBeta/utrAgentRun";
import type { UtrAgentCheckResult } from "@/features/recruiting/todayBeta/utrAgentClient";
import { estimateJsonPayloadBytes } from "@/features/recruiting/todayBeta/utrAgentIncremental";
import { UTR_AGENT_BATCH_CHECK_ENABLED } from "@/features/recruiting/todayBeta/utrAgentConfig";
import { summarizeUtrPayload } from "@/features/recruiting/todayBeta/utrPayloadDiagnostics";
import type { UtrAgentRecruitRunRow } from "@/features/recruiting/todayBeta/utrAgentRun";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const LARGE_SINGLE_RECRUIT_PAYLOAD_BYTES = 2_000_000;

type ImportBody = {
  mode?: "single" | "finalize" | "isaac-only" | "all";
  agentResult?: UtrAgentCheckResult;
  payloadBytes?: number;
  batch?: {
    runId: string;
    startedAt: string;
    finishedAt: string;
    stoppedEarly: boolean;
    stopReason?: string;
    recruitRows: UtrAgentRecruitRunRow[];
    cohortSize: number;
    configured: number;
  };
};

function logSingleRecruitPayload(input: {
  displayName: string;
  payloadBytes: number;
  reportedBytes?: number;
}) {
  const logPayload = {
    displayName: input.displayName,
    payloadBytes: input.payloadBytes,
    reportedBytes: input.reportedBytes,
    largePayload: input.payloadBytes >= LARGE_SINGLE_RECRUIT_PAYLOAD_BYTES,
  };
  if (logPayload.largePayload) {
    console.warn("[utr-agent-import] large single-recruit payload", logPayload);
  } else {
    console.info("[utr-agent-import] single-recruit payload", logPayload);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Sign in to import UTR results." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as ImportBody;
    const mode = body.mode ?? "all";

    if ((mode === "all" || mode === "finalize") && !UTR_AGENT_BATCH_CHECK_ENABLED) {
      return NextResponse.json(
        { success: false, error: "Monitored-recruit automatic check is disabled." },
        { status: 403 },
      );
    }

    if (mode === "single") {
      if (!body.agentResult?.runId || body.agentResult.recruits?.length !== 1) {
        return NextResponse.json(
          { success: false, error: "Single import requires exactly one recruit result." },
          { status: 400 },
        );
      }

      const recruit = body.agentResult.recruits[0];
      const payloadSummary = summarizeUtrPayload(recruit.payload);
      const payloadBytes =
        body.payloadBytes ??
        estimateJsonPayloadBytes({ mode: "single", agentResult: body.agentResult });

      logSingleRecruitPayload({
        displayName: recruit.displayName,
        payloadBytes,
        reportedBytes: body.payloadBytes,
      });

      console.info("[utr-agent-import] received single recruit", {
        runId: body.agentResult.runId,
        displayName: recruit.displayName,
        status: recruit.status,
        matchesRead: recruit.matchesRead,
        payloadExists: payloadSummary.payloadPresent,
        payloadType: payloadSummary.payloadType,
        isValidUtrResults: payloadSummary.isValidUtrResults,
        importableMatchCount: payloadSummary.importableMatchCount,
      });

      const result = await importSingleUtrAgentRecruitResult({
        agentResult: body.agentResult,
      });

      return NextResponse.json({
        success: true,
        data: {
          recruitRow: result.recruitRow,
          payloadBytes: result.payloadBytes,
          authRequired: result.authRequired,
        },
      });
    }

    if (mode === "finalize") {
      if (!body.batch?.runId || !Array.isArray(body.batch.recruitRows)) {
        return NextResponse.json(
          { success: false, error: "Finalize import requires batch metadata." },
          { status: 400 },
        );
      }

      const summary = await finalizeIncrementalUtrAgentBatch(body.batch);
      return NextResponse.json({ success: true, data: summary });
    }

    const legacyMode = mode === "isaac-only" ? "isaac-only" : "all";

    if (legacyMode === "all" && !UTR_AGENT_BATCH_CHECK_ENABLED) {
      return NextResponse.json(
        { success: false, error: "Monitored-recruit automatic check is disabled." },
        { status: 403 },
      );
    }

    if (!body.agentResult?.runId || !Array.isArray(body.agentResult.recruits)) {
      return NextResponse.json(
        { success: false, error: "Invalid agent result payload." },
        { status: 400 },
      );
    }

    console.info("[utr-agent-import] received legacy bulk", {
      mode: legacyMode,
      recruitsReceived: body.agentResult.recruits.length,
      recruits: body.agentResult.recruits.map((recruit) => {
        const payloadSummary = summarizeUtrPayload(recruit.payload);
        return {
          displayName: recruit.displayName,
          status: recruit.status,
          matchesRead: recruit.matchesRead,
          payloadExists: payloadSummary.payloadPresent,
          payloadType: payloadSummary.payloadType,
          isValidUtrResults: payloadSummary.isValidUtrResults,
          topLevelKeys: payloadSummary.topLevelKeys,
          eventsCount: payloadSummary.eventsCount,
          resultsCount: payloadSummary.resultsCount,
          drawsCount: payloadSummary.drawsCount,
          rawMatchCount: payloadSummary.rawMatchCount,
          importableMatchCount: payloadSummary.importableMatchCount,
        };
      }),
    });

    const summary = await importUtrAgentCheckResults({
      mode: legacyMode,
      agentResult: body.agentResult,
    });

    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "UTR automatic import failed.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
