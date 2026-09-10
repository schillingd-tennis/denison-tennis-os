/**
 * Idempotent Officials List seed — normalized from Officials List.csv (25 rows).
 * Address fields intentionally blank (CSV had no street addresses).
 * is_area_assignor stays false unless a later user edit sets it.
 * import_key = md5("officials-list.csv:" + lower(name) + ":" + lower(email))
 */

export type OfficialSeedRow = {
  importKey: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  rate: string | null;
  notes: string | null;
  ranking: number | null;
  isAreaAssignor: boolean;
  assignorArea: string | null;
};

export type ImportDecision = {
  official: string;
  decision: string;
};

export const OFFICIAL_SEED_ROWS: OfficialSeedRow[] = [
  { importKey: "eefb8cabb6a1534b79bb5ed2e1e0b0be", name: "Barry Fittes", email: "bfittes10s@gmail.com", phone: "(513) 265-0090", city: "Cincinnati", rate: "$135 for 2", notes: null, ranking: 4, isAreaAssignor: false, assignorArea: null },
  { importKey: "4afedccb52d3ea4c539b5eaf9834165e", name: "Jim Nelson", email: "essenhaus@aol.com", phone: "330-465-0078", city: "Wooster", rate: null, notes: null, ranking: 4, isAreaAssignor: false, assignorArea: null },
  { importKey: "cff088fdc73c30bb2398599739afbc93", name: "Julio Colon", email: "juliocatopr@gmail.com", phone: "?(614) 999-2735?", city: null, rate: null, notes: "Source phone marked uncertain: ?(614) 999-2735?", ranking: 5, isAreaAssignor: false, assignorArea: null },
  { importKey: "4af87904df0e14e22c114166fddd009d", name: "Matt Swaim", email: "matthew.swaim.2013@owu.edu", phone: null, city: null, rate: "ITA referee, young guy at NCAC", notes: null, ranking: 5, isAreaAssignor: false, assignorArea: null },
  { importKey: "429d141fc990fd1f4f664d202d909f74", name: "Mark Anderson", email: "msanderson891@gmail.com", phone: null, city: null, rate: null, notes: null, ranking: 1, isAreaAssignor: false, assignorArea: null },
  { importKey: "c9002215641ae50d78ceffa68f458f4a", name: "Joel Moor", email: "jmmoor10s@gmail.com", phone: null, city: null, rate: null, notes: null, ranking: 3, isAreaAssignor: false, assignorArea: null },
  { importKey: "22a4f4aee6442c602bac041f121fafcc", name: "Dave Engle", email: "dengle3@woh.rr.com", phone: null, city: null, rate: null, notes: null, ranking: 1, isAreaAssignor: false, assignorArea: null },
  { importKey: "15865d99abd46805efc2371d4d5812bc", name: "Marcus Lee", email: "mlee1458@aol.com", phone: null, city: null, rate: null, notes: null, ranking: 5, isAreaAssignor: false, assignorArea: null },
  { importKey: "00ce89e1dc818d5a3587148c8fc77b4d", name: "Martin Smith", email: "vector4tfc@protonmail.com", phone: null, city: null, rate: null, notes: "Ysu invite. Based in Cleveland", ranking: 5, isAreaAssignor: false, assignorArea: null },
  { importKey: "3fab02e57cfeefdbaa65e87e7db07106", name: "Steve Chenenko", email: "schenenko@gmail.com", phone: "(614) 746-9715", city: null, rate: null, notes: "No longer in OH.", ranking: null, isAreaAssignor: false, assignorArea: null },
  { importKey: "7f4dd0e6a0d8917d0fabef6ff5cbff14", name: "Alma Makurat", email: "amakurat@aol.com", phone: null, city: null, rate: "Indianapolis", notes: "Indy", ranking: null, isAreaAssignor: false, assignorArea: null },
  { importKey: "19098774a15318e3c0ae0f9a7bcbfe3c", name: "James Patton", email: "jaelpatton@yahoo.com", phone: null, city: null, rate: "Indianapolis", notes: "Indy", ranking: null, isAreaAssignor: false, assignorArea: null },
  { importKey: "d9c40472c3ea9b854c6514f7031cdb1f", name: "Phil Christman", email: "phil.d.christman@gmail.com", phone: null, city: null, rate: null, notes: null, ranking: 4, isAreaAssignor: false, assignorArea: null },
  { importKey: "ee67112bdb5848f3e565d644c1c9e414", name: "Deanna Brougher", email: "deannatennis@gmail.com", phone: null, city: null, rate: null, notes: null, ranking: 2, isAreaAssignor: false, assignorArea: null },
  { importKey: "057bfd79e8edbb48787f852f158250ce", name: "Wynndel Burns", email: "wynndelb@gmail.com", phone: null, city: null, rate: null, notes: "OVTA supervisor?", ranking: null, isAreaAssignor: false, assignorArea: null },
  { importKey: "7e5821aa3e83f8df3f1ab1713485894e", name: "Gary Samuels", email: "ghsamuels@gmail.com", phone: null, city: null, rate: null, notes: null, ranking: 5, isAreaAssignor: false, assignorArea: null },
  { importKey: "55a77e81a9f064a567c523ea832fe0fe", name: "Deb Hodges", email: "dh2044103@gmail.com", phone: null, city: null, rate: "Coordinator", notes: "NEO Supervisor. Name had trailing asterisk (*) in source CSV.", ranking: 5, isAreaAssignor: false, assignorArea: null },
  { importKey: "a63629803f045620f97ac870101dec94", name: "Joe Zabowski", email: "lazijoe@gmail.com", phone: "419-262-9059", city: null, rate: "Canton", notes: "originally Fri/Sat", ranking: null, isAreaAssignor: false, assignorArea: null },
  { importKey: "f12540e43aa3cf58ea3b3945e5f92df5", name: "Sue Nugent", email: "suenugent1@aol.com", phone: null, city: null, rate: null, notes: null, ranking: 1, isAreaAssignor: false, assignorArea: null },
  { importKey: "1487515c45b48cd27280ed9aed6a9516", name: "Robert Velasco", email: "velascorobert@yahoo.com", phone: null, city: null, rate: "NWU -", notes: null, ranking: null, isAreaAssignor: false, assignorArea: null },
  { importKey: "d4b7b3c058961286dd6d20c490c96458", name: "Kay Meyers", email: "myk740@yahoo.com", phone: null, city: null, rate: null, notes: null, ranking: null, isAreaAssignor: false, assignorArea: null },
  { importKey: "df7303677adf2b7b5d0ab1fa91aa689b", name: "Udeme Ukutt", email: "uukutt007@gmail.com", phone: null, city: null, rate: "Buffalo", notes: null, ranking: null, isAreaAssignor: false, assignorArea: null },
  { importKey: "9d2960df0285b2ae662d6a1f0c7f6bea", name: "Michael Scrogham", email: "voyager3n1@msn.com", phone: null, city: null, rate: null, notes: null, ranking: null, isAreaAssignor: false, assignorArea: null },
  { importKey: "f9aafba37983872b7dc2bd48eac57a47", name: "Scott Elbin", email: "scott.elbin@gmail.com", phone: null, city: null, rate: null, notes: null, ranking: null, isAreaAssignor: false, assignorArea: null },
  { importKey: "5a182a8e27cc75b1ae6d15e31f9bc0df", name: "Sheila Shiu", email: "sheilashiu13@gmail.com", phone: "330-329-1743", city: null, rate: null, notes: "NEO", ranking: null, isAreaAssignor: false, assignorArea: null },
];

export const IMPORT_DECISIONS: ImportDecision[] = [
  { official: "Barry Fittes", decision: "City typo Cincinnnati → Cincinnati. Rate '$135 for 2' preserved as rate text." },
  { official: "Jim Nelson", decision: "Trimmed trailing space on phone. City Wooster preserved." },
  { official: "Julio Colon", decision: "Phone left as ?(614) 999-2735? (uncertainty preserved). Same uncertainty copied into notes. City/rate blank." },
  { official: "Matt Swaim", decision: "CSV Rate column held note-like text 'ITA referee, young guy at NCAC'; preserved in rate (not rewritten into notes). City blank." },
  { official: "Mark Anderson", decision: "Email trimmed and lowercased (Msanderson891@gmail.com → msanderson891@gmail.com)." },
  { official: "Joel Moor", decision: "Imported as-is; ranking 3." },
  { official: "Dave Engle", decision: "Imported as-is; ranking 1." },
  { official: "Marcus Lee", decision: "Email lowercased. Ranking 5." },
  { official: "Martin Smith", decision: "Safe name capitalization Martin smith → Martin Smith. Notes trimmed trailing space." },
  { official: "Steve Chenenko", decision: "Email lowercased. Notes 'No longer in OH.' preserved. Ranking blank (not ranked)." },
  { official: "Alma Makurat", decision: "City column blank. Rate='Indianapolis' and Notes='Indy' preserved as-is (ambiguous location not moved into city)." },
  { official: "James Patton", decision: "Same as Alma: Rate='Indianapolis', Notes='Indy' preserved; city blank." },
  { official: "Phil Christman", decision: "Email lowercased. Ranking 4." },
  { official: "Deanna Brougher", decision: "Email lowercased. Ranking 2." },
  { official: "Wynndel Burns", decision: "Trailing semicolon stripped from email. Notes 'OVTA supervisor?' preserved. is_area_assignor left false (no auto-Yes)." },
  { official: "Gary Samuels", decision: "Imported as-is; ranking 5." },
  { official: "Deb Hodges", decision: "Trailing asterisk removed from name; note added. Rate='Coordinator', Notes include 'NEO Supervisor'. is_area_assignor left false (no auto-Yes)." },
  { official: "Joe Zabowski", decision: "Rate='Canton' preserved in rate (looks like city; not moved). Notes 'originally Fri/Sat' preserved." },
  { official: "Sue Nugent", decision: "Imported as-is; ranking 1." },
  { official: "Robert Velasco", decision: "Rate 'NWU -' preserved (trailing space trimmed only). Ambiguous abbreviation left in rate." },
  { official: "Kay Meyers", decision: "Imported with blank optional fields; not ranked." },
  { official: "Udeme Ukutt", decision: "Rate='Buffalo' preserved in rate (looks like city; not moved). City blank." },
  { official: "Michael Scrogham", decision: "Imported with blank optional fields; not ranked." },
  { official: "Scott Elbin", decision: "Imported with blank optional fields; not ranked." },
  { official: "Sheila Shiu", decision: "Notes 'NEO' preserved. is_area_assignor left false (no auto-Yes from NEO)." },
  { official: "(all rows)", decision: "Street address fields blank — CSV had no street addresses. preferred_contact blank. All 25 imported. Seed uses ON CONFLICT DO NOTHING so later user edits are not overwritten." },
];

export function officialLocationLabel(city: string, state: string): string {
  const parts = [city.trim(), state.trim()].filter(Boolean);
  return parts.join(", ");
}
