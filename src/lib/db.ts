import Database from "better-sqlite3";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
} from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { filePathFromImagePath } from "./uploads";

export type Painting = {
  id: string;
  painterName: string;
  imagePath: string;
  createdAt: string;
};

export type AppState = {
  votingOpen: boolean;
  votingFrozen: boolean;
};

type JsonBackup = {
  paintings: Painting[];
  votes: { id: string; paintingId: string; voterId: string; createdAt: string }[];
  appState: AppState;
};

const DATA_DIR = path.join(process.cwd(), "data");
const SQLITE_PATH = path.join(DATA_DIR, "paint-voting.db");
const JSON_PATH = path.join(DATA_DIR, "db.json");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    _db = new Database(SQLITE_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("busy_timeout = 5000");
    _db.pragma("foreign_keys = ON");
    _db.pragma("synchronous = NORMAL");
    initSchema(_db);
    migrateFromJson(_db);
  }
  return _db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS paintings (
      id TEXT PRIMARY KEY,
      painter_name TEXT NOT NULL,
      image_path TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      painting_id TEXT NOT NULL REFERENCES paintings(id) ON DELETE CASCADE,
      voter_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(painting_id, voter_id)
    );

    CREATE INDEX IF NOT EXISTS idx_votes_voter ON votes(voter_id);
    CREATE INDEX IF NOT EXISTS idx_votes_painting ON votes(painting_id);

    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      voting_open INTEGER NOT NULL DEFAULT 0,
      voting_frozen INTEGER NOT NULL DEFAULT 0
    );

    INSERT OR IGNORE INTO app_state (id, voting_open, voting_frozen) VALUES (1, 0, 0);
  `);
}

function migrateFromJson(db: Database.Database): void {
  if (!existsSync(JSON_PATH)) return;

  const backup = JSON.parse(readFileSync(JSON_PATH, "utf-8")) as JsonBackup;
  const count = db.prepare("SELECT COUNT(*) AS n FROM paintings").get() as { n: number };
  if (count.n > 0) {
    renameSync(JSON_PATH, `${JSON_PATH}.bak`);
    return;
  }

  const insertPainting = db.prepare(
    "INSERT INTO paintings (id, painter_name, image_path, created_at) VALUES (?, ?, ?, ?)"
  );
  const insertVote = db.prepare(
    "INSERT OR IGNORE INTO votes (id, painting_id, voter_id, created_at) VALUES (?, ?, ?, ?)"
  );

  const migrate = db.transaction(() => {
    for (const p of backup.paintings) {
      insertPainting.run(p.id, p.painterName, p.imagePath, p.createdAt);
    }
    for (const v of backup.votes) {
      insertVote.run(v.id, v.paintingId, v.voterId, v.createdAt);
    }
    if (backup.appState) {
      db.prepare(
        "UPDATE app_state SET voting_open = ?, voting_frozen = ? WHERE id = 1"
      ).run(backup.appState.votingOpen ? 1 : 0, backup.appState.votingFrozen ? 1 : 0);
    }
  });

  migrate();
  renameSync(JSON_PATH, `${JSON_PATH}.bak`);
}

function rowToPainting(row: {
  id: string;
  painter_name: string;
  image_path: string;
  created_at: string;
}): Painting {
  return {
    id: row.id,
    painterName: row.painter_name,
    imagePath: row.image_path,
    createdAt: row.created_at,
  };
}

export function withDbRetry<T>(fn: () => T, maxAttempts = 5): T {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isBusy =
        message.includes("SQLITE_BUSY") || message.includes("database is locked");
      if (!isBusy || attempt === maxAttempts - 1) throw err;
    }
  }
  throw new Error("Database operation failed after retries");
}

export function getAppState(): AppState {
  const row = getDb()
    .prepare("SELECT voting_open, voting_frozen FROM app_state WHERE id = 1")
    .get() as { voting_open: number; voting_frozen: number };
  return {
    votingOpen: row.voting_open === 1,
    votingFrozen: row.voting_frozen === 1,
  };
}

export function updateAppState(patch: Partial<AppState>): AppState {
  return withDbRetry(() => {
    const db = getDb();
    const current = getAppState();
    const next = {
      votingOpen: patch.votingOpen ?? current.votingOpen,
      votingFrozen: patch.votingFrozen ?? current.votingFrozen,
    };
    if (patch.votingFrozen) next.votingOpen = true;

    db.prepare(
      "UPDATE app_state SET voting_open = ?, voting_frozen = ? WHERE id = 1"
    ).run(next.votingOpen ? 1 : 0, next.votingFrozen ? 1 : 0);

    return next;
  });
}

export function getPaintings(): Painting[] {
  const rows = getDb()
    .prepare("SELECT * FROM paintings ORDER BY created_at ASC")
    .all() as Array<{
    id: string;
    painter_name: string;
    image_path: string;
    created_at: string;
  }>;
  return rows.map(rowToPainting);
}

export function addPainting(painterName: string, imagePath: string): Painting {
  return withDbRetry(() => {
    const painting: Painting = {
      id: randomUUID(),
      painterName,
      imagePath,
      createdAt: new Date().toISOString(),
    };
    getDb()
      .prepare(
        "INSERT INTO paintings (id, painter_name, image_path, created_at) VALUES (?, ?, ?, ?)"
      )
      .run(painting.id, painting.painterName, painting.imagePath, painting.createdAt);
    return painting;
  });
}

export function deletePainting(id: string): void {
  withDbRetry(() => {
    getDb().prepare("DELETE FROM paintings WHERE id = ?").run(id);
  });
}

export function resetCompetition(): void {
  withDbRetry(() => {
    const db = getDb();
    const rows = db
      .prepare("SELECT image_path FROM paintings")
      .all() as Array<{ image_path: string }>;

    const reset = db.transaction(() => {
      db.prepare("DELETE FROM votes").run();
      db.prepare("DELETE FROM paintings").run();
      db.prepare(
        "UPDATE app_state SET voting_open = 0, voting_frozen = 0 WHERE id = 1"
      ).run();
    });
    reset();

    db.pragma("wal_checkpoint(PASSIVE)");

    for (const row of rows) {
      const filePath = filePathFromImagePath(row.image_path);
      if (existsSync(filePath)) {
        try {
          unlinkSync(filePath);
        } catch {
          /* ignore */
        }
      }
      // Legacy path under public/uploads
      const legacyPath = path.join(
        process.cwd(),
        "public",
        row.image_path.replace(/^\//, "")
      );
      if (existsSync(legacyPath)) {
        try {
          unlinkSync(legacyPath);
        } catch {
          /* ignore */
        }
      }
    }
  });
}

export function getVotesByVoter(voterId: string): string[] {
  const rows = getDb()
    .prepare("SELECT painting_id FROM votes WHERE voter_id = ?")
    .all(voterId) as Array<{ painting_id: string }>;
  return rows.map((r) => r.painting_id);
}

export function setVoterVotes(voterId: string, paintingIds: string[]): void {
  withDbRetry(() => {
    const db = getDb();
    const now = new Date().toISOString();

    const save = db.transaction((ids: string[]) => {
      db.prepare("DELETE FROM votes WHERE voter_id = ?").run(voterId);
      const insert = db.prepare(
        "INSERT INTO votes (id, painting_id, voter_id, created_at) VALUES (?, ?, ?, ?)"
      );
      for (const paintingId of ids) {
        insert.run(randomUUID(), paintingId, voterId, now);
      }
    });

    save(paintingIds);
  });
}

export function getVoteCounts(): Array<
  Painting & { voteCount: number; displayNumber: number }
> {
  const rows = getDb()
    .prepare(`
      SELECT p.id, p.painter_name, p.image_path, p.created_at,
             COUNT(v.id) AS vote_count
      FROM paintings p
      LEFT JOIN votes v ON v.painting_id = p.id
      GROUP BY p.id
      ORDER BY p.created_at ASC
    `)
    .all() as Array<{
    id: string;
    painter_name: string;
    image_path: string;
    created_at: string;
    vote_count: number;
  }>;

  return rows.map((row, index) => ({
    ...rowToPainting(row),
    voteCount: row.vote_count,
    displayNumber: index + 1,
  }));
}

export function getTopPaintings(limit = 2) {
  return [...getVoteCounts()]
    .sort((a, b) => b.voteCount - a.voteCount)
    .slice(0, limit);
}
