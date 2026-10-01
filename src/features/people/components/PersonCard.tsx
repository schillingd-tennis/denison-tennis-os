"use client";

import Link from "next/link";
import { useState } from "react";

import {
  isValidUtr,
  isValidWtn,
  toOptionalNumber,
} from "@/components/editor";
import ContactActionSlots from "@/components/ContactActionSlots";
import {
  InlineEditCell,
  phoneHrefDigits,
  useSaveIndicator,
} from "@/components/inline-edit";
import { moduleDirectoryCardClass } from "@/components/module-theme";
import PlayerAvatar from "@/components/PlayerAvatar";
import { typeClass, typeRole } from "@/components/typography";
import { updatePersonAction } from "@/features/people/actions";
import { toPersonWritePatch } from "@/features/people/personWritePatch";
import type { Person } from "@/features/people/types";
import {
  getDisplayFirstName,
  getHometown,
  getInitials,
  getPersonRoleDisplay,
  isCoachDirectoryPerson,
} from "@/features/people/utils";
import { EMPTY_VALUE, formatDisplay, formatUtr, formatWtn } from "@/lib/formatting";
import { playersCoachesPersonPath } from "@/lib/module-routes";

type CardEditableField = "hometown" | "classYear" | "utr" | "wtn";

function parseHometown(raw: string): { city?: string; state?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { city: undefined, state: undefined };
  const comma = trimmed.lastIndexOf(",");
  if (comma === -1) {
    return { city: trimmed };
  }
  const city = trimmed.slice(0, comma).trim();
  const state = trimmed.slice(comma + 1).trim();
  const patch: { city?: string; state?: string } = {};
  if (city) patch.city = city;
  else patch.city = undefined;
  if (state) patch.state = state;
  else patch.state = undefined;
  return patch;
}

/**
 * Team directory card (BP-025F / BP-027) + restored inline editing for
 * visible stored Person fields. Visual chrome unchanged when not editing.
 */
export default function PersonCard({
  person,
  onPersonCommit,
}: {
  person: Person;
  onPersonCommit?: (person: Person) => void;
}) {
  const hometown = getHometown(person);
  const email = person.denisonEmail ?? person.personalEmail;
  const phoneDigits = phoneHrefDigits(person.cellPhone);
  const coachDirectory = isCoachDirectoryPerson(person);
  const roleDisplay = getPersonRoleDisplay(person);
  const classLabel =
    !coachDirectory && person.classYear !== undefined
      ? `Class of ${person.classYear}`
      : undefined;
  const utrDisplay = formatUtr(person.utr);
  const wtnDisplay = formatWtn(person.wtn);
  const [editing, setEditing] = useState<CardEditableField | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const { runSave } = useSaveIndicator();

  async function commit(field: CardEditableField, raw: string) {
    let patch: Partial<Person> = {};
    if (field === "hometown") {
      patch = parseHometown(raw);
    } else if (field === "classYear") {
      if (raw.trim() === "") patch = { classYear: undefined };
      else {
        const value = toOptionalNumber(raw);
        if (value === undefined || !Number.isInteger(value)) {
          setFieldError("Class year must be a whole number.");
          return;
        }
        patch = { classYear: value };
      }
    } else if (field === "utr") {
      if (raw.trim() === "") patch = { utr: undefined };
      else {
        const value = toOptionalNumber(raw);
        if (value === undefined) {
          setFieldError("UTR must be a number.");
          return;
        }
        const error = isValidUtr(value);
        if (error) {
          setFieldError(error);
          return;
        }
        patch = { utr: value };
      }
    } else {
      if (raw.trim() === "") patch = { wtn: undefined };
      else {
        const value = toOptionalNumber(raw);
        if (value === undefined) {
          setFieldError("WTN must be a number.");
          return;
        }
        const error = isValidWtn(value);
        if (error) {
          setFieldError(error);
          return;
        }
        patch = { wtn: value };
      }
    }

    setFieldError(undefined);
    setEditing(null);
    const previous = person;
    onPersonCommit?.({ ...person, ...patch });

    const ok = await runSave(async () => {
      const result = await updatePersonAction(person.id, toPersonWritePatch(patch));
      if (!result.success) throw new Error(result.error);
      onPersonCommit?.(result.person);
    });
    if (!ok) onPersonCommit?.(previous);
  }

  return (
    <div className={moduleDirectoryCardClass}>
      <Link
        href={playersCoachesPersonPath(person.id)}
        className="relative z-10 flex min-w-0 items-center gap-2.5 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-[var(--module-accent)]/40"
        aria-label={`Open workspace for ${getDisplayFirstName(person)} ${person.lastName}`}
      >
        <PlayerAvatar photoUrl={person.photoUrl} initials={getInitials(person)} size={44} />
        <div className="min-w-0">
          <p className={typeRole.personName}>
            {getDisplayFirstName(person)} {person.lastName}
          </p>
          <p className={typeClass("metadataSm", "mt-0.5 truncate")}>
            {formatDisplay(roleDisplay)}
          </p>
        </div>
      </Link>

      <div className={`relative z-10 flex flex-col gap-0.5 ${typeRole.metadata}`}>
        <InlineEditCell
          label="Hometown"
          type="text"
          value={hometown ?? ""}
          displayValue={hometown || EMPTY_VALUE}
          editOn="click"
          emphasis="metadata"
          className="relative z-10 !mx-0 !px-0 !py-0"
          editing={editing === "hometown"}
          error={editing === "hometown" ? fieldError : undefined}
          onRequestEdit={() => {
            setFieldError(undefined);
            setEditing("hometown");
          }}
          onCancel={() => {
            setFieldError(undefined);
            setEditing(null);
          }}
          onCommit={(raw) => commit("hometown", raw)}
        />
        {!coachDirectory ? (
          <InlineEditCell
            label="Class year"
            type="number"
            step={1}
            value={person.classYear !== undefined ? String(person.classYear) : ""}
            displayValue={classLabel ?? EMPTY_VALUE}
            editOn="click"
            emphasis="metadata"
            className="relative z-10 !mx-0 !px-0 !py-0"
            editing={editing === "classYear"}
            error={editing === "classYear" ? fieldError : undefined}
            onRequestEdit={() => {
              setFieldError(undefined);
              setEditing("classYear");
            }}
            onCancel={() => {
              setFieldError(undefined);
              setEditing(null);
            }}
            onCommit={(raw) => commit("classYear", raw)}
          />
        ) : null}
      </div>

      {!coachDirectory ? (
        <div className="relative z-10 grid grid-cols-2 gap-2 rounded-control bg-app-background px-3 py-2.5 text-center">
          <div>
            <p className={typeRole.sectionLabel}>UTR</p>
            <InlineEditCell
              label="UTR"
              type="number"
              step={0.01}
              value={person.utr !== undefined ? String(person.utr) : ""}
              editOn="click"
              className="relative z-10 !mx-0 justify-center !px-0 !py-0"
              editing={editing === "utr"}
              error={editing === "utr" ? fieldError : undefined}
              renderDisplay={
                <p
                  className={`text-sm font-medium tabular-nums ${
                    utrDisplay !== EMPTY_VALUE ? "text-text-primary" : typeRole.metadataEmpty
                  }`}
                >
                  {utrDisplay}
                </p>
              }
              onRequestEdit={() => {
                setFieldError(undefined);
                setEditing("utr");
              }}
              onCancel={() => {
                setFieldError(undefined);
                setEditing(null);
              }}
              onCommit={(raw) => commit("utr", raw)}
            />
          </div>
          <div>
            <p className={typeRole.sectionLabel}>WTN</p>
            <InlineEditCell
              label="WTN"
              type="number"
              step={0.01}
              value={person.wtn !== undefined ? String(person.wtn) : ""}
              editOn="click"
              className="relative z-10 !mx-0 justify-center !px-0 !py-0"
              editing={editing === "wtn"}
              error={editing === "wtn" ? fieldError : undefined}
              renderDisplay={
                <p
                  className={`text-sm font-medium tabular-nums ${
                    wtnDisplay !== EMPTY_VALUE ? "text-text-primary" : typeRole.metadataEmpty
                  }`}
                >
                  {wtnDisplay}
                </p>
              }
              onRequestEdit={() => {
                setFieldError(undefined);
                setEditing("wtn");
              }}
              onCancel={() => {
                setFieldError(undefined);
                setEditing(null);
              }}
              onCommit={(raw) => commit("wtn", raw)}
            />
          </div>
        </div>
      ) : null}

      <div className="relative z-10 mt-auto flex justify-end pt-0.5">
        <ContactActionSlots
          tel={phoneDigits ? `tel:${phoneDigits}` : undefined}
          sms={phoneDigits ? `sms:${phoneDigits}` : undefined}
          mailto={email ? `mailto:${email}` : undefined}
        />
      </div>
    </div>
  );
}
