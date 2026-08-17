import ContactActionSlots from "@/components/ContactActionSlots";
import { formatPhoneDisplay, phoneHrefDigits } from "@/components/inline-edit";
import PlayerAvatar from "@/components/PlayerAvatar";
import RoleBadge from "@/components/RoleBadge";
import { typeClass, typeRole } from "@/components/typography";
import type { FamilyContact } from "@/features/people/family";
import { getPreferredContactLabel } from "@/features/people/utils";

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
          <p className={typeRole.personName}>
            {contact.firstName} {contact.lastName}
          </p>
          <p className={typeClass("metadataSm", "mt-0.5")}>{contact.relationship}</p>
        </div>
      </div>

      {contact.isPrimaryContact || contact.isEmergencyContact ? (
        <RoleBadge
          label={[
            contact.isPrimaryContact ? "Primary Contact" : null,
            contact.isEmergencyContact ? "Emergency Contact" : null,
          ]
            .filter(Boolean)
            .join(" · ")}
          className="mt-0.5"
        />
      ) : null}

      {phoneDisplay || contact.email || preferredLabel ? (
        <div className={`flex flex-col gap-1 ${typeRole.metadata}`}>
          {phoneDisplay ? <p>{phoneDisplay}</p> : null}
          {contact.email ? <p className="truncate">{contact.email}</p> : null}
          {preferredLabel ? (
            <p className={typeRole.metadataSm}>Prefers {preferredLabel}</p>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center">
        <ContactActionSlots
          tel={phoneDigits ? `tel:${phoneDigits}` : undefined}
          sms={phoneDigits ? `sms:${phoneDigits}` : undefined}
          mailto={contact.email ? `mailto:${contact.email}` : undefined}
        />
      </div>
    </div>
  );
}
