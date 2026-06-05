import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getVotesByVoter, setVoterVotes, getPaintings, getAppState } from "@/lib/db";
import { getVoterId, VOTER_COOKIE } from "@/lib/auth";
import { REQUIRED_VOTES } from "@/lib/constants";
import { performerKey } from "@/lib/performer";

function validateSelection(paintingIds: string[]): string | null {
  if (paintingIds.length < REQUIRED_VOTES) {
    return `Please select exactly ${REQUIRED_VOTES} paintings. You chose ${paintingIds.length}.`;
  }
  if (paintingIds.length > REQUIRED_VOTES) {
    return `You can only select exactly ${REQUIRED_VOTES} paintings.`;
  }

  const uniqueIds = [...new Set(paintingIds)];
  if (uniqueIds.length !== paintingIds.length) {
    return "Each painting can only be selected once.";
  }

  const all = getPaintings();
  const validIds = new Set(all.map((p) => p.id));
  if (!uniqueIds.every((id) => validIds.has(id))) {
    return "Invalid painting selection.";
  }

  const selected = all.filter((p) => uniqueIds.includes(p.id));
  const keys = selected.map((p) => performerKey(p.painterName));
  if (new Set(keys).size !== keys.length) {
    return "You can only vote once per performer.";
  }

  return null;
}

export async function GET() {
  const voterId = await getVoterId();
  if (!voterId) {
    return NextResponse.json({ votes: [], voterId: null, hasVoted: false });
  }

  const votes = getVotesByVoter(voterId);
  return NextResponse.json({
    votes,
    voterId,
    hasVoted: votes.length > 0,
  });
}

export async function POST(request: NextRequest) {
  const state = getAppState();

  if (!state.votingOpen) {
    return NextResponse.json({ error: "Voting is not open yet" }, { status: 403 });
  }
  if (state.votingFrozen) {
    return NextResponse.json({ error: "Voting is frozen" }, { status: 403 });
  }

  const { paintingIds } = await request.json();
  if (!Array.isArray(paintingIds)) {
    return NextResponse.json({ error: "Invalid selection." }, { status: 400 });
  }

  const validationError = validateSelection(paintingIds as string[]);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const uniqueIds = [...new Set(paintingIds as string[])];

  let voterId = await getVoterId();
  if (!voterId) voterId = randomUUID();

  try {
    setVoterVotes(voterId, uniqueIds);
  } catch {
    return NextResponse.json(
      { error: "Server is busy — please try again in a moment." },
      { status: 503 }
    );
  }

  const response = NextResponse.json({ ok: true, votes: uniqueIds });
  response.cookies.set(VOTER_COOKIE, voterId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
