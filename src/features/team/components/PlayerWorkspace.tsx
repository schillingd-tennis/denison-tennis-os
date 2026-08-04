import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  GraduationCap,
  Mail,
  MessageSquare,
  Phone,
  Plane,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import type { FamilyContact } from "@/features/people/family";
import type { Person } from "@/features/people/types";
import {
  formatHeight,
  formatWeight,
  getFullDisplayName,
  getHometown,
  getInitials,
  getPermanentAddress,
  getPlayerStatusLabel,
  getPlayerStatusTone,
  getPreferredContactLabel,
  getStatusLabel,
  getStatusTone,
} from "@/features/people/utils";

import ContactAction from "@/components/ContactAction";
import InformationField from "@/components/InformationField";
import PlayerAvatar from "@/components/PlayerAvatar";
import StatusBadge from "@/components/StatusBadge";
import SummaryStat from "@/components/SummaryStat";
import WorkspaceSection from "@/components/WorkspaceSection";

import FamilyContactCard from "./FamilyContactCard";

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const comingLaterModules: { label: string; icon: LucideIcon }[] = [
  { label: "Performance", icon: TrendingUp },
  { label: "Academics", icon: GraduationCap },
  { label: "Travel", icon: Plane },
  { label: "Documents", icon: FileText },
];

export default function PlayerWorkspace({
  person,
  familyContacts,
}: {
  person: Person;
  familyContacts: FamilyContact[];
}) {
  const fullName = getFullDisplayName(person);
  const hometown = getHometown(person);
  const address = getPermanentAddress(person);

  const tel = person.cellPhone ? `tel:${person.cellPhone}` : undefined;
  const sms = person.cellPhone ? `sms:${person.cellPhone}` : undefined;
  const email = person.denisonEmail ?? person.personalEmail;
  const mailto = email ? `mailto:${email}` : undefined;

  const hasContactInfo = Boolean(
    person.cellPhone || person.personalEmail || person.denisonEmail || person.preferredContactMethod,
  );
  const hasCasualDenisonInfo = Boolean(person.classYear || person.major || person.minor);
  const hasAdminDenisonInfo = Boolean(person.denisonId || person.dorm || person.roomNumber);
  const hasTennisInfo = Boolean(
    person.utr !== undefined ||
      person.wtn !== undefined ||
      person.dominantHand ||
      person.heightInches ||
      person.weightLbs ||
      person.playerStatus,
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <Link
        href="/team"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors duration-150 hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        Back to Team
      </Link>

      {/* Header */}
      <div className="rounded-card border border-border bg-surface p-8">
        <div className="flex flex-col gap-7 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-5">
            <PlayerAvatar photoUrl={person.photoUrl} initials={getInitials(person)} size={80} />
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-3xl font-semibold tracking-tight text-text-primary">{fullName}</h1>
                <StatusBadge label={getStatusLabel(person.status)} tone={getStatusTone(person.status)} />
                {person.playerStatus ? (
                  <StatusBadge
                    label={getPlayerStatusLabel(person.playerStatus)}
                    tone={getPlayerStatusTone(person.playerStatus)}
                  />
                ) : null}
              </div>
              <p className="text-sm text-text-secondary">
                {[
                  person.classYear ? `Class of ${person.classYear}` : null,
                  person.major,
                  hometown,
                  person.utr !== undefined ? `UTR ${person.utr.toFixed(1)}` : null,
                  person.wtn !== undefined ? `WTN ${person.wtn.toFixed(1)}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ContactAction href={tel} icon={Phone} label="Call" />
            <ContactAction href={sms} icon={MessageSquare} label="Text" />
            <ContactAction href={mailto} icon={Mail} label="Email" />
          </div>
        </div>
      </div>

      {/* At-a-glance summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryStat label="UTR" value={person.utr !== undefined ? person.utr.toFixed(1) : undefined} />
        <SummaryStat label="WTN" value={person.wtn !== undefined ? person.wtn.toFixed(1) : undefined} />
        <SummaryStat
          label="Class Year"
          value={person.classYear ? String(person.classYear) : undefined}
        />
        <SummaryStat label="Major" value={person.major} />
        <SummaryStat label="Dorm" value={person.dorm} />
        <SummaryStat
          label="Player Status"
          value={person.playerStatus ? getPlayerStatusLabel(person.playerStatus) : undefined}
        />
      </div>

      {/* Overview */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-8 lg:col-span-2">
          <WorkspaceSection title="Contact Information">
            {hasContactInfo ? (
              <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                <InformationField
                  label="Cell Phone"
                  value={person.cellPhone}
                  action={
                    person.cellPhone ? (
                      <span className="flex items-center gap-1">
                        <ContactAction variant="icon" href={tel} icon={Phone} label="Call" />
                        <ContactAction variant="icon" href={sms} icon={MessageSquare} label="Text" />
                      </span>
                    ) : undefined
                  }
                />
                <InformationField
                  label="Personal Email"
                  value={person.personalEmail}
                  action={
                    person.personalEmail ? (
                      <ContactAction
                        variant="icon"
                        href={`mailto:${person.personalEmail}`}
                        icon={Mail}
                        label="Email"
                      />
                    ) : undefined
                  }
                />
                <InformationField
                  label="Denison Email"
                  value={person.denisonEmail}
                  action={
                    person.denisonEmail ? (
                      <ContactAction
                        variant="icon"
                        href={`mailto:${person.denisonEmail}`}
                        icon={Mail}
                        label="Email"
                      />
                    ) : undefined
                  }
                />
                <InformationField
                  label="Preferred Contact"
                  value={getPreferredContactLabel(person.preferredContactMethod)}
                />
              </dl>
            ) : (
              <p className="text-sm text-text-secondary">No contact information on file.</p>
            )}
          </WorkspaceSection>

          <WorkspaceSection title="Denison Information">
            {hasCasualDenisonInfo || hasAdminDenisonInfo ? (
              <div className="flex flex-col gap-5">
                {hasCasualDenisonInfo ? (
                  <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                    <InformationField
                      label="Class Year"
                      value={person.classYear ? String(person.classYear) : undefined}
                    />
                    <InformationField label="Major" value={person.major} />
                    <InformationField label="Minor" value={person.minor} />
                  </dl>
                ) : null}
                {hasAdminDenisonInfo ? (
                  <dl
                    className={`grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 ${
                      hasCasualDenisonInfo ? "border-t border-border pt-5" : ""
                    }`}
                  >
                    <InformationField label="Denison ID" value={person.denisonId} />
                    <InformationField label="Dorm" value={person.dorm} />
                    <InformationField label="Room Number" value={person.roomNumber} />
                  </dl>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">No Denison information on file.</p>
            )}
          </WorkspaceSection>

          <WorkspaceSection title="Tennis Information">
            {hasTennisInfo ? (
              <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                <InformationField label="UTR" value={person.utr?.toFixed(1)} />
                <InformationField label="WTN" value={person.wtn?.toFixed(1)} />
                <InformationField
                  label="Dominant Hand"
                  value={person.dominantHand ? capitalize(person.dominantHand) : undefined}
                />
                <InformationField label="Height" value={formatHeight(person.heightInches)} />
                <InformationField label="Weight" value={formatWeight(person.weightLbs)} />
                <InformationField
                  label="Player Status"
                  value={person.playerStatus ? getPlayerStatusLabel(person.playerStatus) : undefined}
                />
              </dl>
            ) : (
              <p className="text-sm text-text-secondary">No tennis information on file.</p>
            )}
          </WorkspaceSection>

          <WorkspaceSection title="Permanent Address">
            {address ? (
              <p className="text-sm text-text-primary">{address}</p>
            ) : (
              <p className="text-sm text-text-secondary">No permanent address on file.</p>
            )}
          </WorkspaceSection>
        </div>

        <div className="flex flex-col gap-8">
          <WorkspaceSection title="Quick Actions">
            <div className="flex flex-col gap-2">
              <ContactAction href={tel} icon={Phone} label="Call" className="w-full" />
              <ContactAction href={sms} icon={MessageSquare} label="Text" className="w-full" />
              <ContactAction href={mailto} icon={Mail} label="Email" className="w-full" />
            </div>
          </WorkspaceSection>

          <WorkspaceSection title="Family & Contacts">
            {familyContacts.length > 0 ? (
              <div className="flex flex-col gap-4">
                {familyContacts.map((contact) => (
                  <FamilyContactCard key={contact.id} contact={contact} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">No family contacts have been added.</p>
            )}
          </WorkspaceSection>
        </div>
      </div>

      {/* Future modules */}
      <WorkspaceSection title="Coming Later">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {comingLaterModules.map((module) => (
            <div
              key={module.label}
              className="flex flex-col items-center gap-2.5 rounded-control border border-dashed border-border px-4 py-6 text-center opacity-60"
            >
              <module.icon className="h-5 w-5 text-text-secondary" strokeWidth={1.5} />
              <span className="text-sm font-medium text-text-secondary">{module.label}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-text-secondary">
          Additional player modules will be added in future sprints.
        </p>
      </WorkspaceSection>
    </div>
  );
}
