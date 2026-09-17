import type { RosterPlayer } from "./types";

export const FIXTURE_ROSTER: RosterPlayer[] = [
  { id: "p-arya", firstName: "Arya", lastName: "Patel", preferredName: "Arya", classYear: 2027 },
  { id: "p-aidan", firstName: "Aidan", lastName: "Miller", preferredName: "Aidan", classYear: 2026 },
  { id: "p-ben", firstName: "Ben", lastName: "Nguyen", preferredName: "Ben", classYear: 2028 },
  { id: "p-chris", firstName: "Chris", lastName: "Nguyen", preferredName: "Chris", classYear: 2027 },
  { id: "p-drew", firstName: "Drew", lastName: "Smith", preferredName: "Drew", classYear: 2026 },
  { id: "p-evan", firstName: "Evan", lastName: "Lee", preferredName: "Evan", classYear: 2025 },
];

export const FIXTURE_COMPLETE_DUAL = `
Denison vs Kenyon
2027-04-03
Home · Granville, OH
Final: 5-2
ncaa doubles point

Doubles 1. Arya/Aidan def. Jones/Smith (Kenyon) 8-6
Doubles 2. Ben/Drew def. Adams/Bell 8-3
Doubles 3. Evan/Chris unfinished 4-5

1. Arya def. Jones 6-1, 6-2
2. Aidan def. Adams 6-3, 7-6(5)
3. Ben lost to Bell 4-6, 6-7(4)
4. Drew def. Cole 6-4, 6-2
5. Evan unfinished 3-4 clinch
6. Chris def. Dunn 6-0, 6-1
`.trim();

export const FIXTURE_DOUBLES_SEPARATE = `
Denison vs Oberlin
2027-04-09
Away
Final: 6-3
doubles separate

D1. Arya/Aidan def. A/B 8-5
D2. Ben/Drew lost to C/D 5-8
D3. Evan/Chris def. E/F 8-4
1. Arya def. Opp1 6-2, 6-2
2. Aidan def. Opp2 6-3, 6-3
3. Ben def. Opp3 6-4, 6-4
4. Drew lost to Opp4 3-6, 4-6
5. Evan def. Opp5 6-1, 6-1
6. Chris lost to Opp6 2-6, 3-6
`.trim();

export const FIXTURE_CLINCH_UNFINISHED = `
Denison vs Wooster
2027-03-27
Away
Final: 4-0
Doubles 1. Arya/Aidan def. X/Y 8-3
Doubles 2. Ben/Drew unfinished
Doubles 3. Evan/Chris unfinished
1. Arya def. X 6-1, 6-1
2. Aidan def. Y 6-2, 6-2
3. Ben unfinished clinch
4. Drew unfinished
5. Evan unfinished
6. Chris unfinished
`.trim();

export const FIXTURE_TOURNAMENT_MULTI_ROUND = `
Denison Invite
2026-09-18 to 2026-09-20
Granville, OH

Main Draw
Round of 16: Arya def. Sam (Kenyon) 6-2, 6-3
QF: Arya def. Jordan (CWRU) 6-4, 7-6(3)
SF: Arya lost to Alex (CMU) 3-6, 4-6

Consolation
First round: Aidan def. Pat (Wooster) 6-1, 6-1
Consolation final: Aidan def. Riley (Oberlin) 6-3, 6-4

Doubles Main Draw
QF: Arya/Aidan def. Lee/Kim (Kenyon) 8-5
SF: Arya/Aidan lost to Park/Cho (CWRU) 6-8
`.trim();

export const FIXTURE_MULTI_FLIGHT = `
ITA Regionals
2026-10-02
Main Draw
Flight A
R16: Ben def. OppA 6-3, 6-2
Flight B
R16: Drew def. OppB 6-4, 6-4
Consolation
Flight A
First round: Chris bye
`.trim();

export const FIXTURE_DOUBLES_REVERSED = `
Denison Invite Doubles
Aidan/Arya def. Smith/Jones (Kenyon) 8-6
`.trim();

export const FIXTURE_MIXED_SD = `
Mixed block
1. Arya def. Opp 6-1, 6-1
Doubles 1. Arya/Aidan def. A/B 8-4
Round of 16: Ben def. C (School) 6-2, 6-2
`.trim();

export const FIXTURE_AMBIGUOUS_NAMES = `
Denison vs Kenyon
1. Nguyen def. Opp 6-1, 6-1
`.trim();

export const FIXTURE_STATUS_SCORES = `
Tournament
Arya def. Opp 6-1, 6-1
Aidan def. Opp2 7-6(5), 6-4
Ben def. Opp3 10-8
Drew retired Opp4 3-6, 1-0 ret.
Evan wo Opp5
Chris default Opp6
Bye: Aidan bye
`.trim();

export const FIXTURE_INVALID_AI_JSON = `{not json`;
