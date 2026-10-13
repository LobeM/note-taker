import { Database } from 'bun:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';
import { createDb, db, get, migrateNotesCascade, run } from '@/lib/db';
import { resetDb, seedUser } from '@/test/db';

beforeEach(resetDb);

describe('createDb', () => {
  it('creates every table on a fresh database', () => {
    const fresh = createDb(':memory:');
    const tables = fresh
      .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => row.name);
    expect(tables).toEqual(
      expect.arrayContaining(['user', 'session', 'account', 'verification', 'notes', 'rate_limit']),
    );
    fresh.close();
  });

  it('turns foreign keys on, so deleting a user cascades to their notes', () => {
    expect(get<{ foreign_keys: number }>('PRAGMA foreign_keys')?.foreign_keys).toBe(1);

    seedUser('u1');
    run(`INSERT INTO notes (id, user_id, title, content_json) VALUES ('n1', 'u1', 't', '{}')`);
    run(`DELETE FROM "user" WHERE id = 'u1'`);

    expect(get('SELECT id FROM notes')).toBeUndefined();
  });

  it('rejects notes for users that do not exist', () => {
    expect(() =>
      run(`INSERT INTO notes (id, user_id, title, content_json) VALUES ('n1', 'ghost', 't', '{}')`),
    ).toThrow(/FOREIGN KEY/);
  });

  it('is shared through the exported handle', () => {
    expect(db.query('SELECT 1 AS n').get()).toEqual({ n: 1 });
  });
});

describe('migrateNotesCascade', () => {
  /** The schema before notes cascaded on user delete. */
  function legacyDb(): Database {
    const legacy = new Database(':memory:', { strict: true });
    legacy.run('PRAGMA foreign_keys = ON;');
    legacy.run(`
      CREATE TABLE "user" (id TEXT PRIMARY KEY);
      CREATE TABLE notes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content_json TEXT NOT NULL,
        is_public INTEGER NOT NULL DEFAULT 0,
        public_slug TEXT UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES "user" (id)
      );
      INSERT INTO "user" (id) VALUES ('u1');
      INSERT INTO notes (id, user_id, title, content_json) VALUES ('n1', 'u1', 'Kept', '{}');
    `);
    return legacy;
  }

  function onDelete(database: Database): string | undefined {
    return database.query<{ on_delete: string }, []>('PRAGMA foreign_key_list(notes)').get()
      ?.on_delete;
  }

  it('rebuilds the table with ON DELETE CASCADE and keeps every row', () => {
    const legacy = legacyDb();
    migrateNotesCascade(legacy);

    expect(onDelete(legacy)).toBe('CASCADE');
    expect(legacy.query('SELECT id, title FROM notes').all()).toEqual([
      { id: 'n1', title: 'Kept' },
    ]);
    expect(legacy.query('PRAGMA index_list(notes)').all()).not.toHaveLength(0);

    legacy.run(`DELETE FROM "user" WHERE id = 'u1'`);
    expect(legacy.query('SELECT id FROM notes').all()).toEqual([]);
    legacy.close();
  });

  it('is a no-op once migrated', () => {
    const legacy = legacyDb();
    migrateNotesCascade(legacy);
    migrateNotesCascade(legacy);
    expect(onDelete(legacy)).toBe('CASCADE');
    legacy.close();
  });

  it('aborts and leaves the old table intact when rows are orphaned', () => {
    const legacy = legacyDb();
    legacy.run('PRAGMA foreign_keys = OFF;');
    legacy.run(
      `INSERT INTO notes (id, user_id, title, content_json) VALUES ('n2', 'ghost', 'x', '{}')`,
    );
    legacy.run('PRAGMA foreign_keys = ON;');

    expect(() => migrateNotesCascade(legacy)).toThrow(/orphaned/);
    expect(onDelete(legacy)).toBe('NO ACTION');
    expect(legacy.query('SELECT id FROM notes ORDER BY id').all()).toEqual([
      { id: 'n1' },
      { id: 'n2' },
    ]);
    // The pragma is restored even though the migration threw.
    expect(legacy.query('PRAGMA foreign_keys').get()).toEqual({ foreign_keys: 1 });
    legacy.close();
  });
});
