import PublicScoutingForm from "@/features/scouting/components/PublicScoutingForm";
import { resolvePublicFormLink } from "@/features/scouting/repository";

export const dynamic = "force-dynamic";

export default async function PublicScoutingFormPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const rawToken = decodeURIComponent(token);
  let prefill = {
    label: "Post-match scouting",
    teamDisplayName: "",
    playerDisplayName: "",
    revoked: false,
    expiresAt: null as string | null,
    invalid: false,
  };

  try {
    const link = await resolvePublicFormLink(rawToken);
    if (!link) {
      prefill = { ...prefill, invalid: true, label: "Invalid link" };
    } else {
      prefill = {
        label: link.label || "Post-match scouting",
        teamDisplayName: link.teamDisplayName,
        playerDisplayName: link.playerDisplayName,
        revoked: link.revoked,
        expiresAt: link.expiresAt,
        invalid: false,
      };
    }
  } catch {
    prefill = { ...prefill, invalid: true, label: "Form unavailable" };
  }

  return <PublicScoutingForm rawToken={rawToken} prefill={prefill} />;
}
