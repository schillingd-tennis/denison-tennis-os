import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

import { readPublicScoutingFormData } from "@/features/scouting/formData";
import { submitPublicForm } from "@/features/scouting/repository";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const rawToken = decodeURIComponent(token);

  try {
    const formData = await request.formData();
    const parsed = readPublicScoutingFormData(formData);
    if (!parsed.ok) {
      return NextResponse.json({ success: false, message: parsed.message }, { status: 400 });
    }

    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
    const clientFingerprint = createHash("sha256")
      .update(`${forwardedFor}:${request.headers.get("user-agent") ?? "unknown"}`)
      .digest("hex");
    const result = await submitPublicForm(rawToken, parsed.payload, clientFingerprint);
    if ("error" in result) {
      return NextResponse.json({ success: false, message: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Could not submit the scouting report." },
      { status: 500 },
    );
  }
}
