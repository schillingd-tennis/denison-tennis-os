"use client";

import { useState, useTransition } from "react";

import { DrawerField } from "@/components/workspace-drawer";
import { submitPublicScoutingFormAction } from "@/features/scouting/actions";

export default function PublicScoutingForm({
  rawToken,
  prefill,
}: {
  rawToken: string;
  prefill: {
    label: string;
    teamDisplayName: string;
    playerDisplayName: string;
    revoked: boolean;
    expiresAt: string | null;
    invalid: boolean;
  };
}) {
  const [message, setMessage] = useState<string>();
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  void prefill.expiresAt; // enforced by SECURITY DEFINER submit RPC

  if (prefill.invalid) {
    return <PublicShell title="Form unavailable" body="This scouting form link is invalid." />;
  }
  if (prefill.revoked) {
    return <PublicShell title="Form unavailable" body="This scouting form link has been revoked." />;
  }

  if (done) {
    return <PublicShell title="Thanks" body="Your scouting notes were submitted." />;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <div className="rounded-card border border-border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-text-primary">{prefill.label || "Post-match scouting"}</h1>
        <p className="mt-1 text-sm text-text-secondary">Denison Tennis · shareable match report form</p>
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              const result = await submitPublicScoutingFormAction(rawToken, formData);
              if (result.success) setDone(true);
              else setMessage(result.message);
            });
          }}
        >
          <DrawerField label="Opponent">
            <input
              name="opponentDisplayName"
              defaultValue={prefill.playerDisplayName}
              className="h-10 w-full rounded-control border border-border px-3 text-sm"
            />
          </DrawerField>
          <DrawerField label="Team">
            <input
              name="teamDisplayName"
              defaultValue={prefill.teamDisplayName}
              className="h-10 w-full rounded-control border border-border px-3 text-sm"
            />
          </DrawerField>
          <DrawerField label="Match date">
            <input name="matchDate" type="date" className="h-10 w-full rounded-control border border-border px-3 text-sm" />
          </DrawerField>
          <DrawerField label="Handedness">
            <select name="handedness" className="h-10 w-full rounded-control border border-border px-3 text-sm">
              <option value="">Unknown</option>
              <option value="Right">Right</option>
              <option value="Left">Left</option>
            </select>
          </DrawerField>
          <DrawerField label="Report by">
            <input name="reportBy" className="h-10 w-full rounded-control border border-border px-3 text-sm" />
          </DrawerField>
          <DrawerField label="Strengths / weaknesses / notes">
            <textarea
              name="strengthsWeaknesses"
              rows={6}
              required
              className="w-full rounded-control border border-border px-3 py-2 text-sm"
            />
          </DrawerField>
          <DrawerField label="Additional scouting report">
            <textarea name="scoutingReport" rows={3} className="w-full rounded-control border border-border px-3 py-2 text-sm" />
          </DrawerField>
          <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
            <input name="isDoubles" type="checkbox" value="true" />
            Doubles
          </label>
          {message ? <p className="text-sm text-red-700">{message}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="h-10 w-full rounded-control bg-[#16a34a] text-sm font-semibold text-white"
          >
            {pending ? "Submitting…" : "Submit report"}
          </button>
        </form>
      </div>
    </main>
  );
}

function PublicShell({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <div className="rounded-card border border-border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-text-secondary">{body}</p>
      </div>
    </main>
  );
}
