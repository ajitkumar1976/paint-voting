import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { resetCompetition } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    resetCompetition();
  } catch {
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
