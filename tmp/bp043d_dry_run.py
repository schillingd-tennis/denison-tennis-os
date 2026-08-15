#!/usr/bin/env python3
"""BP-043D Coda recruiting migration dry run. Read-only. No database writes.

BP-043E: Coda Class Year maps to RecruitProfile.recruitClassYear (HS recruiting
class). Person.classYear is Denison college graduation and is never written
from Coda.
"""

from __future__ import annotations

import json
import re
import zipfile
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
XLSX = Path("/Users/davidschilling/Dropbox/@Inbox/zArchive/  Delete/Recruits.xlxs.xlsx")
PEOPLE_TS = ROOT / "src/features/people/data.ts"
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

US_STATES = {
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "IA",
    "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MN", "MO", "MS",
    "MT", "NC", "ND", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OK", "OR", "PA",
    "RI", "SC", "SD", "TN", "TX", "UT", "VA", "VT", "WA", "WI", "WV", "WY",
}

ANALYTICS_COLS = {
    "WTN Rank", "TR Rank", "UTR Rank", "Weighted Score", "Composite Rank",
    "WTN Z", "TR Z", "UTR Z", "Composite Z", "Reliability", "Adjusted TR Rank",
    "Reliability Score", "Tier",
}
BUTTON_COLS = {"Log Interaction", "Send Text", "Send WhatsApp", "Text / WhatsApp Sent"}
COMM_COLS = {
    "Outreach", "Contact History", "Last Contact", "Days Since Contact", "Contact Flag",
    "Last Texted", "Days Since Text", "Draft Text", "Waiting On Me Question",
    "Awaiting Reply Since", "Awaiting Reply Text", "Awaiting Reply Days", "Call Log Entry",
    "Phone E164",
}
SCOUT_COLS = {"Tournaments Scouted", "Tournaments Attended / Upcoming"}


def col_letter_to_idx(ref: str) -> int:
    letters = "".join(c for c in ref if c.isalpha())
    n = 0
    for c in letters:
        n = n * 26 + (ord(c.upper()) - 64)
    return n - 1


def load_xlsx_rows() -> list[list[str]]:
    with zipfile.ZipFile(XLSX) as z:
        ss_root = ET.fromstring(z.read("xl/sharedStrings.xml"))
        strings = []
        for si in ss_root.findall("m:si", NS):
            texts = [t.text or "" for t in si.findall(".//m:t", NS)]
            strings.append("".join(texts))
        sheet = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
        rows = []
        for row in sheet.findall("m:sheetData/m:row", NS):
            cells = {}
            max_idx = -1
            for c in row.findall("m:c", NS):
                ref = c.get("r", "A1")
                idx = col_letter_to_idx(ref)
                max_idx = max(max_idx, idx)
                t = c.get("t")
                v = c.find("m:v", NS)
                is_el = c.find("m:is", NS)
                val = ""
                if t == "s" and v is not None and v.text is not None:
                    val = strings[int(v.text)]
                elif t == "inlineStr" and is_el is not None:
                    val = "".join(x.text or "" for x in is_el.findall(".//m:t", NS))
                elif v is not None and v.text is not None:
                    val = v.text
                cells[idx] = val
            if max_idx < 0:
                rows.append([])
                continue
            rows.append([cells.get(i, "") for i in range(max_idx + 1)])
        return rows


def norm_name(s: str) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r"\s+", " ", s)
    return s


def digits(s: str) -> str:
    return re.sub(r"\D", "", s or "")


def parse_hometown(raw: str) -> dict:
    raw = (raw or "").strip()
    if not raw:
        return {"city": None, "state": None, "country": None, "parse": "blank"}
    # City, ST
    m = re.match(r"^(.+),\s*([A-Z]{2})$", raw)
    if m and m.group(2) in US_STATES:
        return {"city": m.group(1).strip(), "state": m.group(2), "country": "US", "parse": "city_st"}
    # City, StateName
    m = re.match(r"^(.+),\s*(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)$", raw, re.I)
    if m:
        return {"city": m.group(1).strip(), "state": None, "country": "US", "parse": "city_statename"}
    known_countries = {
        "japan": "JP", "thailand": "TH", "italy": "IT", "germany": "DE", "uk": "GB",
        "india": "IN", "canada": "CA", "ireland": "IE", "indonesia": "ID",
        "kazakhstan": "KZ", "bahamas": "BS", "china": "CN", "latvia": "LV",
    }
    low = raw.lower()
    for name, code in known_countries.items():
        if name in low:
            return {"city": raw, "state": None, "country": code, "parse": "country_in_text"}
    if raw in US_STATES or raw in {"NV", "FL", "NY", "CA"}:
        return {"city": None, "state": raw if len(raw) == 2 else None, "country": "US", "parse": "state_only"}
    return {"city": raw, "state": None, "country": None, "parse": "unparsed"}


def star_rating(raw: str):
    s = (raw or "").strip()
    if not s:
        return None
    if s == "⭐⭐⭐⭐⭐":
        return 5
    if s == "⭐⭐⭐⭐":
        return 4
    if s == "⭐⭐⭐":
        return 3
    return "UNMAPPED:" + s


def parse_utr(raw: str):
    s = (raw or "").strip()
    if not s:
        return None, None
    try:
        return float(s), None
    except ValueError:
        m = re.match(r"^([0-9.]+)", s)
        if m:
            return float(m.group(1)), s
        return None, s


def to_float(x):
    if x is None:
        return None
    s = str(x).strip()
    if s == "":
        return None
    try:
        return float(s.replace(",", ""))
    except ValueError:
        return None


def is_blank(x) -> bool:
    return x is None or str(x).strip() == ""


def load_people() -> list[dict]:
    text = PEOPLE_TS.read_text()
    blocks = re.split(r"\n  \{\n", text)[1:]
    people = []
    for block in blocks:
        def grab(key):
            m = re.search(rf"{key}: \"([^\"]*)\"", block)
            if m:
                return m.group(1)
            m = re.search(rf"{key}: (\d+)", block)
            return m.group(1) if m else None
        pid = grab("id")
        if not pid or pid.startswith("a1000000") or pid.startswith("b1000000"):
            # first id in block after role/status
            ids = re.findall(r"id: \"([^\"]+)\"", block)
            pid = next((i for i in ids if i.startswith("player-") or i.startswith("person-")), ids[0] if ids else None)
        people.append({
            "id": pid,
            "firstName": grab("firstName"),
            "lastName": grab("lastName"),
            "personalEmail": grab("personalEmail"),
            "cellPhone": grab("cellPhone"),
            "classYear": int(grab("classYear")) if grab("classYear") else None,
            "city": grab("city"),
            "state": grab("state"),
        })
    # Filter: data.ts objects include nested role/status; grab firstName is unique to person
    people = [p for p in people if p.get("firstName") and p.get("lastName")]
    return people


def map_pipeline(stage: str) -> dict:
    s = (stage or "").strip()
    raw = s if s else None
    table = {
        "Potential": ("potential", None, None),
        "Active Recruit": ("active", None, None),
        "Committed - Denison": ("committed", "committed_denison", None),
        "Committed - Elsewhere": ("committed", "committed_elsewhere", None),
        "Closed": ("closed", "no_longer_recruiting", None),
        "Transfer": ("unknown", None, "transfer"),  # type, not pipeline; pipeline unknown pending review
    }
    if not s:
        return {"pipeline": "unknown", "outcome": None, "recruitTypeHint": None, "raw": raw, "flag": None}
    if s in table:
        p, o, t = table[s]
        flag = "transfer_as_type" if s == "Transfer" else None
        return {"pipeline": p, "outcome": o, "recruitTypeHint": t, "raw": raw, "flag": flag}
    return {"pipeline": None, "outcome": None, "recruitTypeHint": None, "raw": raw, "flag": "unmapped_pipeline"}


def map_interest(interest: str) -> dict:
    s = (interest or "").strip()
    raw = s if s else None
    if not s:
        return {"interest": "unknown", "raw": raw, "flag": None, "contactHint": None}
    table = {
        "High Interest": ("high", None, None),
        "Medium Interest": ("medium", None, None),
        "Little or No Interest": ("low", None, None),
        "No Contact": ("unknown", "overloaded_no_contact", "not_contacted"),
        "Committed elsewhere": ("unknown", "overloaded_committed_elsewhere", None),
    }
    if s in table:
        i, flag, contact = table[s]
        return {"interest": i, "raw": raw, "flag": flag, "contactHint": contact}
    return {"interest": None, "raw": raw, "flag": "unmapped_interest", "contactHint": None}


def map_priority(v: str):
    s = (v or "").strip()
    m = {
        "1 - Elite": "elite",
        "2 - Significant": "significant",
        "3 - Potential": "potential",
        "4 - Probably Not": "probably_not",
    }
    if not s:
        return None, None
    return m.get(s), None if s in m else s


def map_getability(v: str):
    s = (v or "").strip()
    m = {
        "1 - Highly Likely": "highly_likely",
        "2 - Great Chance": "great_chance",
        "3 - Have a Chance": "have_a_chance",
        "4 - Unlikely": "unlikely",
        "5 - No Chance": "no_chance",
    }
    if not s:
        return None, None
    return m.get(s), None if s in m else s


def map_preread(v: str):
    s = (v or "").strip()
    m = {"Green": "green", "Yellow": "yellow"}
    if not s:
        return None, None
    return m.get(s), None if s in m else s


def nick_from_player_name(player_name: str, first: str, last: str):
    m = re.search(r"\(([^)]+)\)", player_name or "")
    if m:
        return m.group(1).strip()
    return None


def main():
    xrows = load_xlsx_rows()
    headers = xrows[1]
    data = []
    for i, r in enumerate(xrows[2:], start=3):
        if not any(str(c).strip() for c in r):
            continue
        rec = {h: (r[j] if j < len(r) else "") for j, h in enumerate(headers)}
        rec["_sheetRow"] = i
        rec["_codaRowId"] = f"xlsx-row-{i}"
        data.append(rec)

    people = load_people()
    print("CODA_ROWS", len(data), "HEADERS", len(headers), "PEOPLE", len(people))

    # Person matching
    by_email = {}
    by_phone = {}
    by_name = defaultdict(list)
    for p in people:
        if p.get("personalEmail"):
            by_email[p["personalEmail"].strip().lower()] = p
        d = digits(p.get("cellPhone") or "")
        if len(d) >= 10:
            by_phone[d[-10:]] = p
        by_name[(norm_name(p["firstName"]), norm_name(p["lastName"]))].append(p)

    match_cats = Counter()
    person_matches = []
    for rec in data:
        email = (rec.get("Email") or "").strip().lower()
        phone = digits(rec.get("Phone") or "")[-10:] if len(digits(rec.get("Phone") or "")) >= 10 else ""
        fn = norm_name(rec.get("First Name") or "")
        ln = norm_name(rec.get("Last Name") or "")

        hits = []
        if email and email in by_email:
            hits.append(("email", by_email[email]))
        if phone and phone in by_phone:
            hits.append(("phone", by_phone[phone]))
        name_hits = by_name.get((fn, ln), [])

        strong = []
        seen = set()
        for reason, p in hits:
            if p["id"] not in seen:
                strong.append((reason, p))
                seen.add(p["id"])

        if strong:
            if len({p["id"] for _, p in strong}) > 1:
                cat = "manual_review_conflicting_ids"
            else:
                cat = "existing_person_strong"
            match_cats[cat] += 1
            person_matches.append((cat, rec, strong, name_hits))
            continue

        if name_hits:
            # name only — never auto merge
            # BP-043E: Coda Class Year is HS recruiting class; Person.classYear is
            # Denison college graduation. Do not compare them as the same field
            # (equality is not a match; 2026 vs 2030 is not a conflict).
            cat = "manual_review_name_only"
            match_cats[cat] += 1
            person_matches.append((cat, rec, [("name", p) for p in name_hits], name_hits))
            continue

        # fuzzy last name only?
        match_cats["new_person"] += 1
        person_matches.append(("new_person", rec, [], []))

    print("MATCH_CATS", dict(match_cats))
    print(
        "CLASS_YEAR_SEMANTICS coda Class Year -> recruitClassYear; "
        "Person.classYear is Denison college year and is never written from Coda"
    )
    print("\n=== EXISTING / REVIEW MATCHES ===")
    for cat, rec, strong, name_hits in person_matches:
        if cat == "new_person":
            continue
        print(cat, rec.get("Player Name"), "CY", rec.get("Class Year"), "pipe", rec.get("Pipeline Stage"),
              "->", [(r, p["id"], p.get("classYear")) for r, p in strong or [("name", p) for p in name_hits]])

    # Duplicate Coda names
    by_coda_name = defaultdict(list)
    for rec in data:
        n = (rec.get("Player Name") or "").strip()
        by_coda_name[n].append(rec)

    print("\n=== DUPLICATE NAMES ===")
    dup_pairs = []
    for name, rows in sorted(by_coda_name.items(), key=lambda x: x[0] or ""):
        if not name or len(rows) < 2:
            continue
        print("NAME", name, "n", len(rows))
        fields = [
            "Class Year", "Hometown", "TRN Rank", "UTR", "WTN", "Email", "Phone",
            "Pipeline Stage", "TRN URL", "High School", "Created on",
        ]
        for rec in rows:
            print(" ", rec["_codaRowId"], {f: rec.get(f) for f in fields})

        a, b = rows[0], rows[1]
        matching, conflicting = [], []
        for f in fields:
            va, vb = (a.get(f) or "").strip(), (b.get(f) or "").strip()
            if not va and not vb:
                continue
            if va == vb:
                matching.append(f)
            else:
                conflicting.append((f, va, vb))
        url_same = (a.get("TRN URL") or "").strip() and (a.get("TRN URL") or "").strip() == (b.get("TRN URL") or "").strip()
        email_same = (a.get("Email") or "").strip() and (a.get("Email") or "").strip().lower() == (b.get("Email") or "").strip().lower()
        phone_same = digits(a.get("Phone") or "") and digits(a.get("Phone") or "") == digits(b.get("Phone") or "")
        trn_cy_ht = (
            (a.get("TRN Rank") or "").strip()
            and (a.get("TRN Rank") or "").strip() == (b.get("TRN Rank") or "").strip()
            and (a.get("Class Year") or "").strip() == (b.get("Class Year") or "").strip()
            and (a.get("Hometown") or "").strip()
            and (a.get("Hometown") or "").strip() == (b.get("Hometown") or "").strip()
        )
        if url_same or email_same or phone_same:
            rec_action = "Merge"
            same = True
        elif trn_cy_ht:
            rec_action = "Merge"
            same = True
        elif (a.get("Hometown") or "").strip() and (a.get("Hometown") or "").strip() == (b.get("Hometown") or "").strip() and (a.get("Class Year") or "").strip() == (b.get("Class Year") or "").strip():
            rec_action = "Manual review"
            same = "likely"
        else:
            rec_action = "Manual review"
            same = "uncertain"
        dup_pairs.append({
            "name": name,
            "ids": [r["_codaRowId"] for r in rows],
            "matching": matching,
            "conflicting": conflicting,
            "same": same,
            "action": rec_action,
        })
        print("  ACTION", rec_action, "same", same, "match", matching, "conflict", conflicting)

    # Mapping stats
    pipeline_map = Counter()
    interest_map = Counter()
    interest_flags = Counter()
    prio = Counter()
    geta = Counter()
    prer = Counter()
    types = Counter()
    hometown_parse = Counter()
    utr_dirty = []
    star_unmapped = []
    trn_neg1 = 0
    utr_rank_neg1 = 0
    adj_9048 = 0
    intl = Counter()
    blank_name = 0
    video_filled = 0
    act_filled = 0
    preread_dollar_zero = 0
    matches_zero = 0
    focus_n = 0
    lossless_ok = 0

    for rec in data:
        export = {h: rec.get(h, "") for h in headers}
        if set(export.keys()) == set(headers) and len(export) == 67:
            lossless_ok += 1
        if is_blank(rec.get("Player Name")):
            blank_name += 1
        intl[str(rec.get("International"))] += 1
        if not is_blank(rec.get("Video URL")):
            video_filled += 1
        if not is_blank(rec.get("ACT")):
            act_filled += 1
        mp = map_pipeline(rec.get("Pipeline Stage") or "")
        pipeline_map[(mp["pipeline"], mp["outcome"], mp["recruitTypeHint"], mp["flag"] or "ok")] += 1
        if mp["recruitTypeHint"] == "transfer":
            types["transfer"] += 1
        ht = parse_hometown(rec.get("Hometown") or "")
        hometown_parse[ht["parse"]] += 1
        if ht["country"] and ht["country"] != "US":
            types["international_geo_hint"] += 1
        im = map_interest(rec.get("Interest") or "")
        interest_map[im["interest"]] += 1
        if im["flag"]:
            interest_flags[im["flag"]] += 1
        k, u = map_priority(rec.get("Priority") or "")
        prio[k or ("unmapped:" + (u or "blank"))] += 1
        k, u = map_getability(rec.get("Getability") or "")
        geta[k or ("unmapped:" + (u or "blank"))] += 1
        k, u = map_preread(rec.get("Preread") or "")
        prer[k or ("unmapped:" + (u or "blank"))] += 1
        if str(rec.get("Preread $") or "").strip() == "0":
            preread_dollar_zero += 1
        _, dirty = parse_utr(rec.get("UTR") or "")
        if dirty:
            utr_dirty.append((rec.get("Player Name"), dirty))
        st = star_rating(rec.get("TR Star Rating") or "")
        if isinstance(st, str) and st.startswith("UNMAPPED"):
            star_unmapped.append(st)
        if to_float(rec.get("TR Rank")) == -1:
            trn_neg1 += 1
        if to_float(rec.get("UTR Rank")) == -1:
            utr_rank_neg1 += 1
        if str(rec.get("Adjusted TR Rank") or "").strip() in {"90.48", "90.48000000000002"}:
            adj_9048 += 1
        if to_float(rec.get("Matches Played")) == 0:
            matches_zero += 1
        if (rec.get("Focus") or "").strip() == "Focus":
            focus_n += 1

    types["high_school_default"] = len(data) - types["transfer"] - blank_name

    print("\nLOSSLESS", lossless_ok, "/", len(data), "headers", len(headers))
    print("PIPELINE", dict(pipeline_map))
    print("INTEREST", dict(interest_map), "flags", dict(interest_flags))
    print("PRIORITY", dict(prio))
    print("GETABILITY", dict(geta))
    print("PREREAD", dict(prer), "dollar0", preread_dollar_zero)
    print("HOMETOWN", dict(hometown_parse))
    print("UTR_DIRTY", utr_dirty)
    print("STAR_UNMAPPED", star_unmapped)
    print("TR_RANK_-1", trn_neg1, "UTR_RANK_-1", utr_rank_neg1, "ADJ_90.48", adj_9048)
    print("INTL", dict(intl), "VIDEO", video_filled, "ACT", act_filled, "BLANK_NAME", blank_name)
    print("MATCHES_0", matches_zero, "FOCUS", focus_n)
    print("TYPES", dict(types))

    # Closed + interest
    print("\n=== CLOSED ROWS ===")
    for rec in data:
        if (rec.get("Pipeline Stage") or "").strip() == "Closed":
            print(rec.get("Player Name"), "interest", rec.get("Interest"), "notes", (rec.get("Notes") or "")[:80])

    print("\n=== TRANSFER ===")
    for rec in data:
        if (rec.get("Pipeline Stage") or "").strip() == "Transfer":
            print({k: rec.get(k) for k in ["Player Name", "Class Year", "Interest", "UTR", "WTN", "Hometown"]})

    print("\n=== COMMITTED DENISON ===")
    for rec in data:
        if (rec.get("Pipeline Stage") or "").strip() == "Committed - Denison":
            print(rec.get("Player Name"), rec.get("Class Year"), rec.get("First Name"), rec.get("Last Name"), rec.get("Email"), rec.get("Phone"))

    # Columns accounting
    person_mapped = {
        "Player Name", "First Name", "Last Name", "Email", "Phone", "Hometown",
        "UTR", "WTN", "TRN Rank", "TR Star Rating", "TRN URL", "UTR URL",
        "Matches Played", "Video URL", "High School", "Created on", "Phone E164",
    }
    profile_mapped = {
        "Class Year",  # BP-043E → recruitClassYear, never Person.classYear
        "Pipeline Stage", "Interest", "Priority", "Getability", "Focus", "GPA", "SAT", "ACT",
        "Academic Interests", "Preread", "Preread $", "Schools of Interest", "School Chosen",
        "Notes", "Game Notes", "Key Pitch Angle",
    }
    skip_import_value = {"International"}
    accounted = person_mapped | profile_mapped | ANALYTICS_COLS | BUTTON_COLS | COMM_COLS | SCOUT_COLS | skip_import_value
    # Created on -> person createdAt; Phone E164 derived
    missing = [h for h in headers if h not in accounted]
    print("\nUNACCOUNTED COLUMNS", missing)
    extra = accounted - set(headers)
    print("ACCOUNTED_NOT_IN_HEADERS", extra)

    # Numeric text issues
    print("\n=== GPA ===")
    for rec in data:
        if not is_blank(rec.get("GPA")):
            print(repr(rec.get("GPA")), rec.get("Player Name"))

    print("DONE")


if __name__ == "__main__":
    main()
