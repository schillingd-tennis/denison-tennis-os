import type { IntraSquadWeight, MatchStatus } from "./types";

export type AiMatchExtraction = {
  status: MatchStatus;
  playerAName: string;
  playerBName: string;
  winnerName: string | null;
  loserName: string | null;
  leaderName: string | null;
  trailingName: string | null;
  score: string;
  weight: 1 | 2 | 3 | null;
  dateText: string | null;
  confidence: number;
  interpretation: string;
};

export const AI_PARSE_UNAVAILABLE =
  "I couldn’t interpret that automatically. Try a simpler result format or enter it manually.";

export const MATCH_EXTRACTION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "status",
    "playerAName",
    "playerBName",
    "winnerName",
    "loserName",
    "leaderName",
    "trailingName",
    "score",
    "weight",
    "dateText",
    "confidence",
    "interpretation",
  ],
  properties: {
    status: { type: "string", enum: ["completed", "unfinished"] },
    playerAName: { type: "string" },
    playerBName: { type: "string" },
    winnerName: { anyOf: [{ type: "string" }, { type: "null" }] },
    loserName: { anyOf: [{ type: "string" }, { type: "null" }] },
    leaderName: { anyOf: [{ type: "string" }, { type: "null" }] },
    trailingName: { anyOf: [{ type: "string" }, { type: "null" }] },
    score: { type: "string" },
    weight: {
      anyOf: [{ type: "integer", enum: [1, 2, 3] }, { type: "null" }],
    },
    dateText: { anyOf: [{ type: "string" }, { type: "null" }] },
    confidence: { type: "number" },
    interpretation: { type: "string" },
  },
} as const;

export function buildMatchExtractionPrompt(input: {
  text: string;
  rosterNames: readonly string[];
  selectedDate: string;
  selectedWeight: IntraSquadWeight;
}): { system: string; user: string } {
  const rosterList = input.rosterNames.join(", ");
  return {
    system: [
      "You extract Denison men’s tennis intra-squad match results from coach natural language.",
      "Return ONLY JSON matching the schema.",
      "Use only roster names from the provided list. Never invent players.",
      "status=completed for finished matches; unfinished when stopped early / leading / trailing / didn’t finish.",
      "For completed: set winnerName and loserName; leaderName/trailingName null.",
      "For unfinished: set leaderName and trailingName; winnerName/loserName null.",
      "Normalize score to hyphenated sets from the winner/leader perspective (e.g. 61 → 6-1, trailing 4-6 → 6-4).",
      "weight is 1, 2, or 3 when stated; otherwise null.",
      "dateText is any date phrase found; otherwise null.",
      "confidence is 0-1.",
      "interpretation is one short coach sentence summarizing the result.",
    ].join(" "),
    user: [
      `Roster: ${rosterList}`,
      `Selected date (default if none in text): ${input.selectedDate}`,
      `Selected weight (default if none in text): ${input.selectedWeight}`,
      `Match text: ${input.text}`,
    ].join("\n"),
  };
}

export function parseAiExtractionJson(raw: string): AiMatchExtraction | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "AI returned invalid JSON." };
  }
  if (!parsed || typeof parsed !== "object") return { error: "AI returned invalid JSON." };
  const row = parsed as Record<string, unknown>;
  const status = row.status === "completed" || row.status === "unfinished" ? row.status : null;
  if (!status) return { error: "AI returned an invalid match status." };
  const score = typeof row.score === "string" ? row.score.trim() : "";
  if (!score) return { error: "AI did not return a score." };
  const weight =
    row.weight === 1 || row.weight === 2 || row.weight === 3 || row.weight === null ? row.weight : null;
  if (row.weight != null && weight == null) return { error: "AI returned an invalid weight." };
  const confidence = typeof row.confidence === "number" ? row.confidence : Number(row.confidence);
  if (!Number.isFinite(confidence)) return { error: "AI returned an invalid confidence." };

  return {
    status,
    playerAName: String(row.playerAName ?? "").trim(),
    playerBName: String(row.playerBName ?? "").trim(),
    winnerName: row.winnerName == null ? null : String(row.winnerName).trim(),
    loserName: row.loserName == null ? null : String(row.loserName).trim(),
    leaderName: row.leaderName == null ? null : String(row.leaderName).trim(),
    trailingName: row.trailingName == null ? null : String(row.trailingName).trim(),
    score,
    weight,
    dateText: row.dateText == null ? null : String(row.dateText).trim() || null,
    confidence: Math.max(0, Math.min(1, confidence)),
    interpretation: String(row.interpretation ?? "").trim() || "Interpreted match result",
  };
}

export type AiExtractFn = (input: {
  text: string;
  rosterNames: readonly string[];
  selectedDate: string;
  selectedWeight: IntraSquadWeight;
}) => Promise<AiMatchExtraction | { error: string }>;

export async function extractMatchWithOpenAi(input: {
  text: string;
  rosterNames: readonly string[];
  selectedDate: string;
  selectedWeight: IntraSquadWeight;
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
}): Promise<AiMatchExtraction | { error: string }> {
  const apiKey = input.apiKey ?? process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return { error: AI_PARSE_UNAVAILABLE };

  const model = input.model ?? process.env.OPENAI_INTRA_SQUAD_MODEL?.trim() ?? "gpt-4o-mini";
  const prompts = buildMatchExtractionPrompt(input);
  const fetchImpl = input.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: "system", content: prompts.system },
          { role: "user", content: prompts.user },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "intra_squad_match_extraction",
            strict: true,
            schema: MATCH_EXTRACTION_JSON_SCHEMA,
          },
        },
      }),
    });

    if (!response.ok) {
      return { error: AI_PARSE_UNAVAILABLE };
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null; refusal?: string | null } }>;
    };
    const message = payload.choices?.[0]?.message;
    if (message?.refusal) return { error: AI_PARSE_UNAVAILABLE };
    const content = message?.content?.trim();
    if (!content) return { error: AI_PARSE_UNAVAILABLE };
    return parseAiExtractionJson(content);
  } catch {
    return { error: AI_PARSE_UNAVAILABLE };
  }
}
