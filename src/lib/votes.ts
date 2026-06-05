import { getVoteCounts as readVoteCounts, getTopPaintings as readTop } from "./db";

export async function getVoteCounts() {
  return readVoteCounts();
}

export async function getTopPaintings(limit = 2) {
  return readTop(limit);
}
