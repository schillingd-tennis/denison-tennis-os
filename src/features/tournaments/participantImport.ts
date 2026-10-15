import type { TournamentParticipantInput } from "./types";

const HEADER = /^Participant name\s+Events\s+City, State\s+Gender$/i;
const LETTER_ROW = /^[A-Z]$/;

function titleCaseName(value: string): string {
  const [last = "", first = ""] = value.split(/,\s*/, 2);
  const convert = (part: string) => part.toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (match) => match.toUpperCase());
  return first ? `${convert(first)} ${convert(last)}`.trim() : convert(last).trim();
}

export function parseTournamentParticipants(text: string): TournamentParticipantInput[] {
  const participants: TournamentParticipantInput[] = [];
  const seen = new Set<string>();

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || HEADER.test(line) || LETTER_ROW.test(line) || /^Total players:/i.test(line)) continue;

    const columns = line.includes("\t") ? line.split("\t") : line.split(/\s{2,}/);
    if (columns.length < 4) continue;
    const [rawName, rawEvents, rawLocation, rawGender] = columns.map((value) => value.trim());
    if (!rawName || !rawName.includes(",")) continue;

    const participantName = titleCaseName(rawName);
    const key = participantName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const locationMatch = rawLocation.match(/^(.*?),\s*([A-Z]{2})$/);

    participants.push({
      participantName,
      events: rawEvents.split(/,\s*(?=(?:Boys|Girls|Men|Women)'?s?\s)/i).map((event) => event.trim()).filter(Boolean),
      city: locationMatch?.[1]?.trim() || rawLocation || null,
      state: locationMatch?.[2] || null,
      gender: rawGender || null,
    });
  }

  return participants;
}
