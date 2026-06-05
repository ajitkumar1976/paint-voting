import { createHash } from "crypto";

export function performerKey(painterName: string): string {
  return createHash("sha256")
    .update(painterName.trim().toLowerCase())
    .digest("hex")
    .slice(0, 16);
}
