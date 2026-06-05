import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { addPainting, deletePainting as removePainting } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";
import { getVoteCounts } from "@/lib/votes";
import { performerKey } from "@/lib/performer";
import { ensureUploadsDir, uploadUrl } from "@/lib/uploads";

export const dynamic = "force-dynamic";

const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

export async function GET(request: NextRequest) {
  const revealNames = request.nextUrl.searchParams.get("reveal") === "true";
  const paintings = await getVoteCounts();

  return NextResponse.json(
    paintings.map((p) => ({
      id: p.id,
      imagePath: p.imagePath,
      displayNumber: p.displayNumber,
      performerKey: performerKey(p.painterName),
      voteCount: revealNames ? p.voteCount : undefined,
      ...(revealNames ? { painterName: p.painterName } : {}),
    })),
    { headers: NO_CACHE }
  );
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("image") as File | null;
  const painterName = (formData.get("painterName") as string)?.trim();

  if (!file || !painterName) {
    return NextResponse.json(
      { error: "Image and painter name are required" },
      { status: 400 }
    );
  }

  const uploadsDir = ensureUploadsDir();
  const ext = path.extname(file.name) || ".jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsDir, filename), buffer);

  const painting = addPainting(painterName, uploadUrl(filename));
  return NextResponse.json(painting, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  removePainting(id);
  return NextResponse.json({ ok: true });
}
