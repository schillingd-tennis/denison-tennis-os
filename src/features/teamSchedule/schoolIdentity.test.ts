import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { SEED_2026_27 } from "./seedData";
import {
  genericScheduleIdentity,
  DENISON_BRAND_LOGO_FILE,
  DENISON_BRAND_LOGO_SRC,
  DENISON_EVENT_LOGO_SRC,
  EXPECTED_SCHOOL_LOGO_FILES,
  LOCAL_SCHOOL_LOGO_FILES,
  resolveScheduleIdentity,
  resolveScheduleIdentityFromLabel,
  scheduleDrawerTitle,
  SCHOOL_LOGOS_BASE_PATH,
} from "./schoolIdentity";

const scheduleIdentityMarkSource = readFileSync(
  path.join(process.cwd(), "src/features/teamSchedule/components/ScheduleIdentityMark.tsx"),
  "utf8",
);

const ENTITY_LOGO_MAP: Record<string, string> = {
  "Hotel Planner Tournament": "hotel-planner-tour.png",
  "Denison Invite": "Denison.png",
  "ITA Regionals": "ITA_New_Logo.png",
  "Big Red Invite": "Denison.png",
  "Skidmore Invite": "Skidmore College.png",
  "Wash U": "Athletic_WashU_Logo_RGB.jpg",
  DePauw: "depauw-tigers-logo-png_seeklogo-454736.png",
  CWRU: "case-western-reserve-spartans-logo-png_seeklogo-436095.png",
  Wooster: "Wooster_Fighting_Scots_logo.svg.webp",
  OWU: "OWU.jpg",
  Kenyon: "kenyon-logo.png",
  Oberlin: "Oberlin_logo_from_NCAA.svg.webp",
  Brandeis: "Brandeis_athletics_logo_2024.png",
  Tufts: "tufts-jumbos-logo-png_seeklogo-326178.png",
  "John Carroll": "John-carroll_logo_from_NCAA.svg.webp",
  "Carnegie Mellon": "carnegie-mellon-logo-png_seeklogo-404230.png",
  Wabash: "Wabash_athletics_logo.png",
  Wittenberg: "w.jpg",
  "Mary Washington": "mary-washington-university-of-mary-washington-mascot-11562990064vz2rof1zel.png",
  "Trinity (TX)": "trinity-tx.svg",
};

describe("school identity resolver", () => {
  it("17. CWRU alias resolution uses local PNG asset", () => {
    for (const label of ["CWRU", "Case Western Reserve", "Case Western Reserve University"]) {
      const identity = resolveScheduleIdentityFromLabel(label);
      assert.ok(identity);
      assert.equal(identity.slug, "case-western");
      assert.equal(identity.initials, "CWRU");
      assert.equal(
        identity.logoSrc,
        `${SCHOOL_LOGOS_BASE_PATH}/case-western-reserve-spartans-logo-png_seeklogo-436095.png`,
      );
    }
  });

  it("18. OWU alias resolution uses OWU.jpg asset", () => {
    for (const label of ["OWU", "Ohio Wesleyan", "Ohio Wesleyan University"]) {
      const identity = resolveScheduleIdentityFromLabel(label);
      assert.ok(identity);
      assert.equal(identity.slug, "ohio-wesleyan");
      assert.equal(identity.initials, "OWU");
      assert.equal(identity.logoSrc, `${SCHOOL_LOGOS_BASE_PATH}/OWU.jpg`);
    }
  });

  it("19. Wash U alias resolution uses local JPG asset", () => {
    for (const label of ["Wash U", "Washington University in St. Louis"]) {
      const identity = resolveScheduleIdentityFromLabel(label);
      assert.ok(identity);
      assert.equal(identity.slug, "wash-u");
      assert.equal(identity.logoSrc, `${SCHOOL_LOGOS_BASE_PATH}/Athletic_WashU_Logo_RGB.jpg`);
      assert.equal(identity.initials, "WU");
    }
  });

  it("20. missing logo uses initials fallback safely", () => {
    const identity = genericScheduleIdentity("Mystery College");
    assert.equal(identity.kind, "generic");
    assert.equal(identity.initials, "MC");
    assert.equal(identity.logoSrc, null);
    assert.ok(identity.accentColor);
  });

  it("Trinity University resolves to trinity-tx.svg asset", () => {
    for (const label of ["Trinity (TX)", "Trinity University", "Trinity University (Texas)"]) {
      const identity = resolveScheduleIdentityFromLabel(label);
      assert.ok(identity);
      assert.equal(identity.slug, "trinity-tx");
      assert.equal(identity.initials, "TU");
      assert.equal(identity.logoSrc, `${SCHOOL_LOGOS_BASE_PATH}/trinity-tx.svg`);
    }
  });

  it("Denison Invite and Big Red Invite use Denison.png asset", () => {
    const denisonInvite = SEED_2026_27.find((event) => event.eventName === "Denison Invite");
    const bigRedInvite = SEED_2026_27.find((event) => event.eventName === "Big Red Invite");
    assert.ok(denisonInvite && bigRedInvite);

    const denisonLogoSrc = `${SCHOOL_LOGOS_BASE_PATH}/Denison.png`;
    assert.equal(resolveScheduleIdentity(denisonInvite).logoSrc, denisonLogoSrc);
    assert.equal(resolveScheduleIdentity(denisonInvite).initials, "DU");
    assert.equal(resolveScheduleIdentity(bigRedInvite).logoSrc, denisonLogoSrc);
  });

  it("Hotel Planner Tournament uses hotel-planner-tour.png asset", () => {
    const hotel = SEED_2026_27.find((event) => event.eventName === "Hotel Planner Tournament");
    assert.ok(hotel);

    const hotelLogoSrc = `${SCHOOL_LOGOS_BASE_PATH}/hotel-planner-tour.png`;
    assert.equal(resolveScheduleIdentity(hotel).slug, "hotel-planner-tournament");
    assert.equal(resolveScheduleIdentity(hotel).logoSrc, hotelLogoSrc);
    assert.equal(resolveScheduleIdentity(hotel).initials, "HP");
  });

  it("ITA events use ITA_New_Logo.png asset", () => {
    const itaLogoSrc = `${SCHOOL_LOGOS_BASE_PATH}/ITA_New_Logo.png`;
    for (const eventName of ["ITA Regionals", "ITA Indoors #1", "ITA Indoors #2", "ITA Indoors #3"]) {
      const event = SEED_2026_27.find((row) => row.eventName === eventName);
      assert.ok(event);
      assert.equal(resolveScheduleIdentity(event).slug, "ita");
      assert.equal(resolveScheduleIdentity(event).logoSrc, itaLogoSrc);
      assert.equal(resolveScheduleIdentity(event).initials, "ITA");
    }
  });

  it("Skidmore Invite uses Skidmore College.png with SC initials fallback", () => {
    const skidmore = SEED_2026_27.find((event) => event.eventName === "Skidmore Invite");
    assert.ok(skidmore);
    assert.equal(resolveScheduleIdentity(skidmore).slug, "skidmore-invite");
    assert.equal(resolveScheduleIdentity(skidmore).initials, "SC");
    assert.equal(resolveScheduleIdentity(skidmore).logoSrc, `${SCHOOL_LOGOS_BASE_PATH}/Skidmore College.png`);
  });

  it("21. tournament identity resolves appropriately", () => {
    const spring = SEED_2026_27.find((event) => event.eventName === "Spring Break #1");
    assert.ok(spring);
    assert.equal(resolveScheduleIdentity(spring).slug, "travel");
    assert.equal(resolveScheduleIdentity(spring).initials, "SB");
    assert.equal(resolveScheduleIdentity(spring).logoSrc, null);
  });

  it("every 2026–27 schedule entity maps to a local logo or initials", () => {
    for (const [label, logoFile] of Object.entries(ENTITY_LOGO_MAP)) {
      const event = SEED_2026_27.find((row) => row.opponentName === label || row.eventName === label);
      assert.ok(event, `missing seed row for ${label}`);
      const identity = resolveScheduleIdentity(event);
      assert.equal(identity.logoSrc, `${SCHOOL_LOGOS_BASE_PATH}/${logoFile}`, label);
      assert.ok(identity.initials.length >= 2 && identity.initials.length <= 4, label);
    }

    const oberlin = SEED_2026_27.find((event) => event.opponentName === "Oberlin");
    assert.ok(oberlin);
    assert.equal(
      resolveScheduleIdentity(oberlin).logoSrc,
      `${SCHOOL_LOGOS_BASE_PATH}/Oberlin_logo_from_NCAA.svg.webp`,
    );
    assert.equal(resolveScheduleIdentity(oberlin).initials, "OC");

    const spring = SEED_2026_27.find((event) => event.eventName === "Spring Break #1");
    assert.ok(spring);
    assert.equal(resolveScheduleIdentity(spring).logoSrc, null);
    assert.equal(resolveScheduleIdentity(spring).initials, "SB");
  });

  it("2026–27 schedule rows with logos vs initials fallback", () => {
    const withLogo = SEED_2026_27.filter((event) => resolveScheduleIdentity(event).logoSrc != null);
    const withInitials = SEED_2026_27.filter((event) => resolveScheduleIdentity(event).logoSrc == null);

    assert.equal(withLogo.length, 23);
    assert.equal(withInitials.length, 1);
    assert.deepEqual(
      withInitials.map((event) => event.opponentName ?? event.eventName).sort(),
      ["Spring Break #1"],
    );
  });

  it("all local logo files are mapped", () => {
    const mappedFiles = new Set([...EXPECTED_SCHOOL_LOGO_FILES, DENISON_BRAND_LOGO_FILE]);
    for (const file of LOCAL_SCHOOL_LOGO_FILES) {
      assert.ok(mappedFiles.has(file), `expected identity mapping for ${file}`);
    }
  });

  it("ScheduleIdentityMark falls back to initials on image error", () => {
    assert.match(scheduleIdentityMarkSource, /onError=\{\(\) => setUseFallback\(true\)\}/);
    assert.match(scheduleIdentityMarkSource, /if \(!identity\.logoSrc \|\| useFallback\)/);
    assert.match(scheduleIdentityMarkSource, /object-contain/);
  });

  it("PNG, JPG, SVG, and WEBP asset extensions resolve", () => {
    assert.match(resolveScheduleIdentityFromLabel("DePauw")!.logoSrc!, /\.png$/);
    assert.match(resolveScheduleIdentityFromLabel("Wash U")!.logoSrc!, /\.jpg$/);
    assert.match(resolveScheduleIdentityFromLabel("Trinity University")!.logoSrc!, /\.svg$/);
    assert.match(resolveScheduleIdentityFromLabel("Wooster")!.logoSrc!, /\.webp$/);
  });

  it("Denison sidebar branding and invite events use distinct logo assets", () => {
    assert.equal(DENISON_BRAND_LOGO_SRC, `${SCHOOL_LOGOS_BASE_PATH}/Denison_transparent.png`);
    assert.equal(DENISON_EVENT_LOGO_SRC, `${SCHOOL_LOGOS_BASE_PATH}/Denison.png`);
    assert.equal(resolveScheduleIdentityFromLabel("Denison Invite")?.logoSrc, DENISON_EVENT_LOGO_SRC);
    assert.equal(resolveScheduleIdentityFromLabel("Big Red Invite")?.logoSrc, DENISON_EVENT_LOGO_SRC);
  });

  it("Oberlin aliases use local Oberlin logo asset", () => {
    const oberlinLogoSrc = `${SCHOOL_LOGOS_BASE_PATH}/Oberlin_logo_from_NCAA.svg.webp`;
    for (const label of ["Oberlin", "Oberlin College"]) {
      const identity = resolveScheduleIdentityFromLabel(label);
      assert.ok(identity, label);
      assert.equal(identity.slug, "oberlin", label);
      assert.equal(identity.initials, "OC", label);
      assert.equal(identity.logoSrc, oberlinLogoSrc, label);
    }
  });

  it("NCAC Championships and aliases use NCAC conference logo asset", () => {
    const ncacLogoSrc = `${SCHOOL_LOGOS_BASE_PATH}/lg-679c39ec9aa3d-North-Coast-Athletic-Conferenc.webp`;
    const labels = [
      "NCAC Championships",
      "NCAC Championship",
      "NCAC Tournament",
      "North Coast Athletic Conference Championships",
      "North Coast Athletic Conference",
    ];

    for (const label of labels) {
      const identity = resolveScheduleIdentityFromLabel(label);
      assert.ok(identity, label);
      assert.equal(identity.slug, "ncac-championships", label);
      assert.equal(identity.initials, "NCAC", label);
      assert.equal(identity.logoSrc, ncacLogoSrc, label);
    }

    const event = {
      id: "ncac-test",
      seasonYear: 2027,
      competitionDateNumber: null,
      competitionDateGroup: null,
      eventType: "tournament" as const,
      opponentName: null,
      eventName: "NCAC Championships",
      itaRank: null,
      startDate: "2027-04-30",
      endDate: "2027-05-02",
      timeText: null,
      venueName: null,
      city: null,
      state: null,
      locationText: null,
      siteDesignation: "neutral" as const,
      travelRequired: false,
      ncac: true,
      seasonSegment: "postseason" as const,
      status: "tentative" as const,
      doubleheaderStatus: "none" as const,
      officialsNeeded: null,
      teamsInEvent: null,
      countsAsCompetitionDate: true,
      notes: null,
      sortOrder: 999,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    assert.equal(resolveScheduleIdentity(event).logoSrc, ncacLogoSrc);
  });

  it("schedule drawer title distinguishes match vs event", () => {
    const match = SEED_2026_27.find((event) => event.opponentName === "Kenyon");
    const tournament = SEED_2026_27.find((event) => event.eventName === "ITA Regionals");
    assert.ok(match && tournament);
    assert.equal(scheduleDrawerTitle(match), "Edit Match");
    assert.equal(scheduleDrawerTitle(tournament), "Edit Event");
    assert.equal(scheduleDrawerTitle(undefined), "Add Match");
  });
});
