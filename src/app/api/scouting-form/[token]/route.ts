import { NextResponse } from "next/server";

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

    const result = await submitPublicForm(rawToken, parsed.payload);
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
