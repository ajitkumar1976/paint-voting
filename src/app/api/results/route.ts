import { NextResponse } from "next/server";
import { getAppState } from "@/lib/auth";
import { getTopPaintings } from "@/lib/votes";

export async function GET() {
  const state = getAppState();

  if (!state.votingFrozen) {
    return NextResponse.json(
      { error: "Results available after voting is frozen" },
      { status: 403 }
    );
  }

  const winners = await getTopPaintings(3);
  return NextResponse.json({ winners });
}
