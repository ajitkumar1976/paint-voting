import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import path from "path";
import {
  ensureUploadsDir,
  filenameFromImagePath,
  UPLOADS_DIR,
} from "@/lib/uploads";

export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  if (!filename || filename.includes("..") || filename.includes("/")) {
    return new NextResponse("Not found", { status: 404 });
  }

  ensureUploadsDir();

  const filePath = path.join(UPLOADS_DIR, filename);
  if (!existsSync(filePath)) {
    // Fallback: legacy files saved under public/uploads before this fix
    const legacyPath = path.join(process.cwd(), "public", "uploads", filename);
    if (!existsSync(legacyPath)) {
      return new NextResponse("Not found", { status: 404 });
    }
    const ext = path.extname(filename).toLowerCase();
    const buffer = readFileSync(legacyPath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  const ext = path.extname(filename).toLowerCase();
  const buffer = readFileSync(filePath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
