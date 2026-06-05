import { cookies } from "next/headers";

export { getAppState } from "./db";
export { REQUIRED_VOTES as MAX_VOTES } from "./constants";

export const ADMIN_COOKIE = "paint-admin-auth";
export const VOTER_COOKIE = "paint-voter-id";

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "admin123";
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE)?.value === "authenticated";
}

export async function getVoterId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(VOTER_COOKIE)?.value ?? null;
}

export async function hasVoterCookie(): Promise<boolean> {
  return (await getVoterId()) !== null;
}
