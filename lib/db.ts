import { Database } from "bun:sqlite";
import type { Changes, SQLQueryBindings } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DB_PATH = process.env.DATABASE_PATH ?? "data/app.db";

/**
 * The `user`/`session`/`account`/`verification` DDL is the output of better-auth
 * 1.6.27's own migration compiler, kept verbatim apart from `IF NOT EXISTS`.
 * Column names are camelCase and date columns are declared `date` on purpose:
 * better-auth introspects existing tables and rejects `TEXT` for date fields
 * (values themselves are ISO-8601 strings). `notes` follows SPEC.md 5.1/5.2.
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS "user" (
  "id" text NOT NULL PRIMARY KEY,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "emailVerified" integer NOT NULL,
  "image" text,
  "createdAt" date NOT NULL,
  "updatedAt" date NOT NULL
);

CREATE TABLE IF NOT EXISTS "session" (
  "id" text NOT NULL PRIMARY KEY,
  "expiresAt" date NOT NULL,
  "token" text NOT NULL UNIQUE,
  "createdAt" date NOT NULL,
  "updatedAt" date NOT NULL,
  "ipAddress" text,
  "userAgent" text,
  "userId" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
  "id" text NOT NULL PRIMARY KEY,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "userId" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" date,
  "refreshTokenExpiresAt" date,
  "scope" text,
  "password" text,
  "createdAt" date NOT NULL,
  "updatedAt" date NOT NULL
);

CREATE TABLE IF NOT EXISTS "verification" (
  "id" text NOT NULL PRIMARY KEY,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expiresAt" date NOT NULL,
  "createdAt" date NOT NULL,
  "updatedAt" date NOT NULL
);

CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("userId");
CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("userId");
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier");

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content_json TEXT NOT NULL,
  is_public INTEGER NOT NULL DEFAULT 0,
  public_slug TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_public_slug ON notes(public_slug);
CREATE INDEX IF NOT EXISTS idx_notes_is_public ON notes(is_public);

CREATE TABLE IF NOT EXISTS rate_limit (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);
`;

/**
 * Databases created before notes cascaded on user delete keep the old FK, since
 * `CREATE TABLE IF NOT EXISTS` never alters. SQLite can't change a constraint in
 * place, so rebuild the table (sqlite.org/lang_altertable.html, "other changes").
 */
function migrateNotesCascade(database: Database): void {
  const fks = database
    .query<{ table: string; on_delete: string }, []>("PRAGMA foreign_key_list(notes)")
    .all();
  if (fks.every((fk) => fk.table !== "user" || fk.on_delete === "CASCADE")) return;

  // Must be toggled outside a transaction, or it is silently ignored.
  database.run("PRAGMA foreign_keys = OFF;");
  try {
    database.transaction(() => {
      database.run(`
        CREATE TABLE notes_new (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          content_json TEXT NOT NULL,
          is_public INTEGER NOT NULL DEFAULT 0,
          public_slug TEXT UNIQUE,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE
        );
        INSERT INTO notes_new SELECT id, user_id, title, content_json, is_public,
          public_slug, created_at, updated_at FROM notes;
        DROP TABLE notes;
        ALTER TABLE notes_new RENAME TO notes;
        CREATE INDEX idx_notes_user_id ON notes(user_id);
        CREATE INDEX idx_notes_public_slug ON notes(public_slug);
        CREATE INDEX idx_notes_is_public ON notes(is_public);
      `);
      const violations = database.query("PRAGMA foreign_key_check(notes)").all();
      if (violations.length > 0) {
        throw new Error(`notes has ${violations.length} orphaned row(s); migration aborted`);
      }
    })();
  } finally {
    database.run("PRAGMA foreign_keys = ON;");
  }
}

function createDb(): Database {
  mkdirSync(dirname(DB_PATH), { recursive: true });

  const database = new Database(DB_PATH, { create: true, strict: true });

  // WAL lets readers run concurrently with the single writer. `foreign_keys` is
  // per-connection and off by default, so the cascades above are inert without it.
  database.run("PRAGMA journal_mode = WAL;");
  database.run("PRAGMA foreign_keys = ON;");
  database.run("PRAGMA busy_timeout = 5000;");
  database.run("PRAGMA synchronous = NORMAL;");

  database.run(SCHEMA);
  migrateNotesCascade(database);

  return database;
}

/**
 * Single connection for the whole process, shared with better-auth (which
 * duck-types the Bun handle and drives it through its own Kysely dialect).
 * Held on globalThis so dev HMR reuses it instead of leaking handles.
 */
const globalForDb = globalThis as typeof globalThis & { __appDb?: Database };

export const db: Database = (globalForDb.__appDb ??= createDb());

export function getDb(): Database {
  return db;
}

export function query<T>(sql: string, params: SQLQueryBindings[] = []): T[] {
  return db.query<T, SQLQueryBindings[]>(sql).all(...params);
}

export function get<T>(
  sql: string,
  params: SQLQueryBindings[] = [],
): T | undefined {
  return db.query<T, SQLQueryBindings[]>(sql).get(...params) ?? undefined;
}

export function run(sql: string, params: SQLQueryBindings[] = []): Changes {
  return db.query<unknown, SQLQueryBindings[]>(sql).run(...params);
}
