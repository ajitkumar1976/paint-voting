import path from "path";
import { existsSync, mkdirSync } from "fs";

export const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");

export function ensureUploadsDir(): string {
  if (!existsSync(UPLOADS_DIR)) {
    mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  return UPLOADS_DIR;
}

/** Public URL path stored in the database */
export function uploadUrl(filename: string): string {
  return `/uploads/${filename}`;
}

export function filenameFromImagePath(imagePath: string): string {
  return imagePath.replace(/^\/uploads\//, "");
}

export function filePathFromImagePath(imagePath: string): string {
  return path.join(UPLOADS_DIR, filenameFromImagePath(imagePath));
}
