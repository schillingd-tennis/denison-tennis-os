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
  subjectKey?: string;
  subjectLabel?: string;
  subjectType?: "player" | "doubles";
};

export type TeamScoutSubject = {
  subjectKey: string;
  subjectLabel: string;
  subjectType: "player" | "doubles";
};

export type TeamScoutSection = TeamScoutSubject & {
  summary: string;
  priorities: string[];
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
  kind: "player" | "doubles" | "team";
  evidence: ScoutEvidence[];
}) => Promise<ScoutSummaryResult>;

function evidenceText(item: ScoutEvidence): string {
  return [item.strengthsWeaknesses, item.scoutingReport]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ");
}

function conciseEvidence(text: string, maxLength = 420): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  const clipped = normalized.slice(0, maxLength);
  const sentenceEnd = Math.max(clipped.lastIndexOf(". "), clipped.lastIndexOf("; "));
  return `${clipped.slice(0, sentenceEnd > maxLength * 0.55 ? sentenceEnd + 1 : maxLength).trim()}…`;
}

export function buildEvidenceOnlyTeamSummary(input: {
  teamLabel: string;
  subjects: TeamScoutSubject[];
  evidence: ScoutEvidence[];
}) {
  const sections: TeamScoutSection[] = input.subjects.map((subject) => {
    const reports = input.evidence.filter((item) => item.subjectKey === subject.subjectKey);
    const observations = reports.map(evidenceText).filter(Boolean);
    return {
      ...subject,
      summary: conciseEvidence(observations.join(" ")) || "No written scouting observations were available.",
      priorities: observations.slice(0, 3).map((text) => conciseEvidence(text, 140)),
    };
  });
  return {
    body: `Evidence-only team report for ${input.teamLabel}. It consolidates ${input.evidence.length} scouting ${input.evidence.length === 1 ? "report" : "reports"} across ${input.subjects.length} selected ${input.subjects.length === 1 ? "subject" : "subjects"}. Vercel AI Gateway access was unavailable, so the original observations are condensed without adding unsupported conclusions.`,
    quickSummaryBullets: sections.map((section) => `${section.subjectLabel}: ${conciseEvidence(section.summary, 150)}`).slice(0, 6),
    sections,
    citedDirectReportIds: input.evidence.map((item) => item.id),
    model: "evidence-only-fallback",
  };
}

export function buildScoutingSummaryPrompt(input: {
  subjectLabel: string;
  kind: "player" | "doubles" | "team";
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
      input.kind === "team"
        ? "Organize the report by the selected singles players and doubles teams; include only subjects present in the evidence."
        : input.kind === "doubles"
          ? "Treat the subject as one doubles combination and emphasize positioning, returns, serving order, teamwork, and tactical patterns when supported."
          : "Treat the subject as one singles player.",
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
  kind: "player" | "doubles" | "team";
  evidence: ScoutEvidence[];
  apiKey?: string;
  gatewayToken?: string;
  model?: string;
  fetchImpl?: typeof fetch;
}): Promise<ScoutSummaryResult> {
  if (!input.evidence.length) {
    return { error: "No supported evidence to summarize." };
  }

  const directOpenAiKey =
    input.apiKey !== undefined ? input.apiKey.trim() : process.env.OPENAI_API_KEY?.trim();
  const gatewayKey = input.apiKey === undefined
    ? input.gatewayToken?.trim() || process.env.AI_GATEWAY_API_KEY?.trim() || process.env.VERCEL_OIDC_TOKEN?.trim()
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
      const detail = await response.text().catch(() => "");
      const providerMessage = detail.match(/"message"\s*:\s*"([^"]+)"/)?.[1];
      return { error: `AI provider error (${response.status})${providerMessage ? `: ${providerMessage}` : "."}` };
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

export async function summarizeTeamReportWithOpenAi(input: {
  teamLabel: string;
  subjects: TeamScoutSubject[];
  evidence: ScoutEvidence[];
  apiKey?: string;
  gatewayToken?: string;
  model?: string;
  fetchImpl?: typeof fetch;
}): Promise<{ body: string; quickSummaryBullets: string[]; sections: TeamScoutSection[]; citedDirectReportIds: string[]; model: string } | { error: string }> {
  if (!input.subjects.length || !input.evidence.length) return { error: "Choose at least one subject with scouting evidence." };
  const directKey = input.apiKey !== undefined ? input.apiKey.trim() : process.env.OPENAI_API_KEY?.trim();
  const gatewayKey = input.apiKey === undefined ? input.gatewayToken?.trim() || process.env.AI_GATEWAY_API_KEY?.trim() || process.env.VERCEL_OIDC_TOKEN?.trim() : undefined;
  const apiKey = directKey || gatewayKey;
  if (!apiKey) return { error: AI_SCOUTING_UNAVAILABLE };
  const usesGateway = !directKey && Boolean(gatewayKey);
  const configuredModel = input.model ?? process.env.OPENAI_SCOUTING_MODEL?.trim() ?? process.env.OPENAI_INTRA_SQUAD_MODEL?.trim();
  const model = configuredModel ? usesGateway && !configuredModel.includes("/") ? `openai/${configuredModel}` : configuredModel : usesGateway ? "openai/gpt-4o-mini" : "gpt-4o-mini";
  const endpoint = usesGateway ? "https://ai-gateway.vercel.sh/v1/chat/completions" : "https://api.openai.com/v1/chat/completions";
  const subjectKeys = new Set(input.subjects.map((subject) => subject.subjectKey));
  try {
    const response = await (input.fetchImpl ?? fetch)(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Create a concise, coach-ready tennis team scouting report using only supplied evidence. Return JSON with team_overview (string), team_priorities (3-6 strings), and sections. Include exactly one section per requested subject, in requested order. Each section must contain subject_key, subject_type, subject_label, summary (2-4 concise sentences), and priorities (2-4 short actionable strings). Note thin or conflicting evidence instead of inventing facts. Distinguish singles players from doubles teams." },
          { role: "user", content: [
            `Team: ${input.teamLabel}`,
            `Requested subjects: ${JSON.stringify(input.subjects)}`,
            "Evidence:",
            ...input.evidence.map((item) => `${item.subjectKey} | ${item.subjectLabel} | ${item.subjectType} | id=${item.id} | date=${item.matchDate ?? "unknown"} | notes=${item.strengthsWeaknesses || "(none)"} | report=${item.scoutingReport || "(none)"}`),
          ].join("\n") },
        ],
      }),
    });
    if (!response.ok) return { error: `AI provider error (${response.status}).` };
    const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content?.trim();
    if (!raw) return { error: "AI returned an empty team report." };
    const parsed = JSON.parse(extractJsonObject(raw) ?? raw) as { team_overview?: unknown; team_priorities?: unknown; sections?: unknown };
    const byKey = new Map<string, TeamScoutSection>();
    if (Array.isArray(parsed.sections)) for (const entry of parsed.sections) {
      if (!entry || typeof entry !== "object") continue;
      const row = entry as Record<string, unknown>;
      const key = typeof row.subject_key === "string" ? row.subject_key : "";
      const expected = input.subjects.find((subject) => subject.subjectKey === key);
      if (!expected || !subjectKeys.has(key) || typeof row.summary !== "string") continue;
      byKey.set(key, { ...expected, summary: row.summary.trim(), priorities: normalizeBullets(row.priorities).slice(0, 4) });
    }
    const sections = input.subjects.map((subject) => byKey.get(subject.subjectKey)).filter((section): section is TeamScoutSection => Boolean(section));
    if (sections.length !== input.subjects.length) return { error: "AI did not return a complete summary for every selected subject." };
    const body = typeof parsed.team_overview === "string" ? parsed.team_overview.trim() : "";
    const quickSummaryBullets = normalizeBullets(parsed.team_priorities).slice(0, 6);
    return { body, quickSummaryBullets, sections, citedDirectReportIds: input.evidence.map((item) => item.id), model };
  } catch {
    return { error: "AI provider returned an invalid team report." };
  }
}
