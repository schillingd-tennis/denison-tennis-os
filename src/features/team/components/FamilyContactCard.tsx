import { Mail, MessageSquare, Phone } from "lucide-react";

import type { FamilyContact } from "@/features/people/family";
import { getPreferredContactLabel } from "@/features/people/utils";

import ContactAction from "@/components/ContactAction";
import PlayerAvatar from "@/components/PlayerAvatar";
import StatusBadge from "@/components/StatusBadge";

export default function FamilyContactCard({ contact }: { contact: FamilyContact }) {
  const initials = `${contact.firstName.charAt(0)}${contact.lastName.charAt(0)}`.toUpperCase();
  const preferredLabel = getPreferredContactLabel(contact.preferredContactMethod);

  return (
    <div className="flex flex-col gap-4 rounded-control border border-border p-5">
      <div className="flex items-center gap-3.5">
        <PlayerAvatar photoUrl={contact.photoUrl} initials={initials} size={44} />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-text-primary">
            {contact.firstName} {contact.lastName}
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">{contact.relationship}</p>
        </div>
      </div>

      {contact.isPrimaryContact || contact.isEmergencyContact ? (
        <div className="flex flex-wrap gap-2">
          {contact.isPrimaryContact ? (
            <StatusBadge label="Primary Contact" tone="denison" />
          ) : null}
          {contact.isEmergencyContact ? (
            <StatusBadge label="Emergency Contact" tone="warning" />
          ) : null}
        </div>
      ) : null}

      {contact.cellPhone || contact.email || preferredLabel ? (
        <div className="flex flex-col gap-1 text-sm text-text-secondary">
          {contact.cellPhone ? <p>{contact.cellPhone}</p> : null}
          {contact.email ? <p className="truncate">{contact.email}</p> : null}
          {preferredLabel ? <p className="text-xs">Prefers {preferredLabel}</p> : null}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <ContactAction
          variant="icon"
          href={contact.cellPhone ? `tel:${contact.cellPhone}` : undefined}
          icon={Phone}
          label="Call"
        />
        <ContactAction
          variant="icon"
          href={contact.cellPhone ? `sms:${contact.cellPhone}` : undefined}
          icon={MessageSquare}
          label="Text"
        />
        <ContactAction
          variant="icon"
          href={contact.email ? `mailto:${contact.email}` : undefined}
          icon={Mail}
          label="Email"
        />
      </div>
    </div>
  );
}
