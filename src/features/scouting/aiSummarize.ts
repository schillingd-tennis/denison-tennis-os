/**
 * Scouting AI summarization — direct OpenAI or Vercel AI Gateway.
 * Never invents evidence; never overwrites source direct reports.
 * Full body + quick_summary_bullets are produced in one generation.
 */

export const AI_SCOUTING_UNAVAILABLE =
  "AI scouting summaries are unavailable. Configure OPENAI_API_KEY or Vercel AI Gateway authentication.";

export type ScoutEvidence = {
  id: string;
  matchDate: string | null;
  reportBy: string;
  isDoubles: boolean;
  opponentDisplayName: string;
  strengthsWeaknesses: string;
  scoutingReport: string;
  handedness?: string | null;
  source?: string;
};

export type ScoutSummaryResult =
  | {
      body: string;
      quickSummaryBullets: string[];
      citedDirectReportIds: string[];
      model: string;
    }
  | { error: string };

export type ScoutSummarizeFn = (input: {
  subjectLabel: string;
  kind: "player" | "team";
  evidence: ScoutEvidence[];
}) => Promise<ScoutSummaryResult>;

export function buildScoutingSummaryPrompt(input: {
  subjectLabel: string;
  kind: "player" | "team";
  evidence: ScoutEvidence[];
}): { system: string; user: string } {
  return {
    system: [
      "You write concise tennis scouting summaries for Denison men’s tennis coaches.",
      "Use ONLY the provided evidence snippets. Do not invent players, scores, tactics, or statistics.",
      "Cite evidence by id in brackets like [id] when making claims in the full body.",
      "Separate Strengths and Weaknesses when the evidence supports it; otherwise keep a Notes section.",
      "If evidence conflicts, note the conflict. If evidence is thin, say so.",
      "Distinguish repeated evidence from one-off observations; never present a single report as a repeated tendency.",
      "For quick_summary_bullets: 4–7 concise actionable bullets (one idea each), plain tennis language,",
      "covering only supported points such as strengths, weaknesses, patterns, what worked, and match-plan priorities.",
      "No generic filler, no repetition, no unsupported claims.",
      'Return JSON only with keys "body" (plain text full summary) and "quick_summary_bullets" (string array). No markdown fences.',
    ].join(" "),
    user: [
      `Subject (${input.kind}): ${input.subjectLabel}`,
      `Evidence count: ${input.evidence.length}`,
      "Evidence:",
      ...input.evidence.map((item) =>
        [
          `id=${item.id}`,
          `date=${item.matchDate ?? "unknown"}`,
          `by=${item.reportBy || "unknown"}`,
          `doubles=${item.isDoubles}`,
          `hand=${item.handedness || "unknown"}`,
          `source=${item.source || "unknown"}`,
          `opponent=${item.opponentDisplayName}`,
          `notes=${item.strengthsWeaknesses || "(none)"}`,
          `report=${item.scoutingReport || "(none)"}`,
        ].join(" | "),
      ),
    ].join("\n"),
  };
}

export function parseScoutSummaryResponse(
  raw: string,
  evidenceIds: string[],
  model: string,
): ScoutSummaryResult {
  const trimmed = raw.trim();
  if (!trimmed) return { error: "AI returned an empty summary." };

  const jsonPayload = extractJsonObject(trimmed);
  if (jsonPayload) {
    try {
      const parsed = JSON.parse(jsonPayload) as {
        body?: unknown;
        quick_summary_bullets?: unknown;
      };
      const body = typeof parsed.body === "string" ? parsed.body.trim() : "";
      const bullets = normalizeBullets(parsed.quick_summary_bullets);
      if (body || bullets.length) {
        return {
          body: body || bullets.map((item) => `• ${item}`).join("\n"),
          quickSummaryBullets: bullets,
          citedDirectReportIds: evidenceIds,
          model,
        };
      }
    } catch {
      // fall through to plain-text handling
    }
  }

  return {
    body: trimmed,
    quickSummaryBullets: bulletsFromPlainText(trimmed),
    citedDirectReportIds: evidenceIds,
    model,
  };
}

function extractJsonObject(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? text).trim();
  if (candidate.startsWith("{") && candidate.endsWith("}")) return candidate;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start >= 0 && end > start) return candidate.slice(start, end + 1);
  return null;
}

function normalizeBullets(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const cleaned = item.replace(/^[-•*\d.)\s]+/, "").trim();
    if (cleaned) out.push(cleaned);
  }
  return out.slice(0, 7);
}

function bulletsFromPlainText(body: string): string[] {
  const lines = body
    .split(/\n+/)
    .map((line) => line.replace(/^[-•*]\s+/, "").trim())
    .filter(Boolean);
  // Only treat as bullets when the model returned a short list-like body.
  if (lines.length >= 3 && lines.length <= 8 && lines.every((line) => line.length < 220)) {
    return lines.slice(0, 7);
  }
  return [];
}

export async function summarizeScoutingWithOpenAi(input: {
  subjectLabel: string;
  kind: "player" | "team";
  evidence: ScoutEvidence[];
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
}): Promise<ScoutSummaryResult> {
  if (!input.evidence.length) {
    return { error: "No supported evidence to summarize." };
  }

  const directOpenAiKey =
    input.apiKey !== undefined ? input.apiKey.trim() : process.env.OPENAI_API_KEY?.trim();
  const gatewayKey = input.apiKey === undefined
    ? process.env.AI_GATEWAY_API_KEY?.trim() || process.env.VERCEL_OIDC_TOKEN?.trim()
    : undefined;
  const apiKey = directOpenAiKey || gatewayKey;
  if (!apiKey) return { error: AI_SCOUTING_UNAVAILABLE };

  const usesGateway = !directOpenAiKey && Boolean(gatewayKey);

  const configuredModel =
    input.model ??
    process.env.OPENAI_SCOUTING_MODEL?.trim() ??
    process.env.OPENAI_INTRA_SQUAD_MODEL?.trim();
  const model = configuredModel
    ? usesGateway && !configuredModel.includes("/")
      ? `openai/${configuredModel}`
      : configuredModel
    : usesGateway
      ? "openai/gpt-4o-mini"
      : "gpt-4o-mini";
  const endpoint = usesGateway
    ? "https://ai-gateway.vercel.sh/v1/chat/completions"
    : "https://api.openai.com/v1/chat/completions";

  const prompt = buildScoutingSummaryPrompt(input);
  const fetchImpl = input.fetchImpl ?? fetch;
  const evidenceIds = input.evidence.map((item) => item.id);

  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
      }),
    });

    if (!response.ok) {
      return { error: `AI provider error (${response.status}).` };
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) return { error: "AI returned an empty summary." };

    return parseScoutSummaryResponse(content, evidenceIds, model);
  } catch {
    return { error: "AI provider request failed." };
  }
}
