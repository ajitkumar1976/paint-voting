import { NextResponse } from "next/server";
import { getAppState, isAdminAuthenticated } from "@/lib/auth";
import { updateAppState } from "@/lib/db";

export async function GET() {
  const state = getAppState();
  const authenticated = await isAdminAuthenticated();

  return NextResponse.json({
    votingOpen: state.votingOpen,
    votingFrozen: state.votingFrozen,
    authenticated,
  });
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const state = getAppState();

  if (state.votingFrozen && body.votingOpen === true) {
    return NextResponse.json(
      { error: "Voting is frozen and cannot be reopened" },
      { status: 400 }
    );
  }

  const updated = updateAppState({
    ...(typeof body.votingOpen === "boolean" && { votingOpen: body.votingOpen }),
    ...(typeof body.votingFrozen === "boolean" && {
      votingFrozen: body.votingFrozen,
    }),
  });

  return NextResponse.json(updated);
}
