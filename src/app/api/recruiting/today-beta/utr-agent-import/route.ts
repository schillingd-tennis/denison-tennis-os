import { NextResponse } from "next/server";

import {
  importUtrAgentCheckResults,
} from "@/features/recruiting/todayBeta/utrAgentRun";
import type { UtrAgentCheckResult } from "@/features/recruiting/todayBeta/utrAgentClient";
import { UTR_AGENT_BATCH_CHECK_ENABLED } from "@/features/recruiting/todayBeta/utrAgentConfig";
import { summarizeUtrPayload } from "@/features/recruiting/todayBeta/utrPayloadDiagnostics";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ImportBody = {
  mode?: "isaac-only" | "all";
  agentResult?: UtrAgentCheckResult;
};

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
    const mode = body.mode === "isaac-only" ? "isaac-only" : "all";

    if (mode === "all" && !UTR_AGENT_BATCH_CHECK_ENABLED) {
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

    console.info("[utr-agent-import] received", {
      mode,
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
      mode,
      agentResult: body.agentResult,
    });

    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "UTR automatic import failed.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
