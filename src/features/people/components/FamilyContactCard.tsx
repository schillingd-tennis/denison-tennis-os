import { Mail, MessageSquare, Phone } from "lucide-react";

import { formatPhoneDisplay, phoneHrefDigits } from "@/components/inline-edit";
import type { FamilyContact } from "@/features/people/family";
import { getPreferredContactLabel } from "@/features/people/utils";

import PlayerAvatar from "@/components/PlayerAvatar";
import QuickActionButton from "@/components/QuickActionButton";
import StatusBadge from "@/components/StatusBadge";

export default function FamilyContactCard({ contact }: { contact: FamilyContact }) {
  const initials = `${contact.firstName.charAt(0)}${contact.lastName.charAt(0)}`.toUpperCase();
  const preferredLabel = getPreferredContactLabel(contact.preferredContactMethod);
  const phoneDisplay = formatPhoneDisplay(contact.cellPhone);
  const phoneDigits = phoneHrefDigits(contact.cellPhone);

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

      {phoneDisplay || contact.email || preferredLabel ? (
        <div className="flex flex-col gap-1 text-sm text-text-secondary">
          {phoneDisplay ? <p>{phoneDisplay}</p> : null}
          {contact.email ? <p className="truncate">{contact.email}</p> : null}
          {preferredLabel ? <p className="text-xs">Prefers {preferredLabel}</p> : null}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <QuickActionButton
          href={phoneDigits ? `sms:${phoneDigits}` : undefined}
          icon={MessageSquare}
          label="Text"
          tone="denison"
        />
        <QuickActionButton
          href={phoneDigits ? `tel:${phoneDigits}` : undefined}
          icon={Phone}
          label="Call"
          tone="success"
        />
        <QuickActionButton
          href={contact.email ? `mailto:${contact.email}` : undefined}
          icon={Mail}
          label="Email"
          tone="info"
        />
      </div>
    </div>
  );
}
