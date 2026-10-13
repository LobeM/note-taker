import { db } from '@/lib/db';

/**
 * Tests run against the real schema in an in-memory database (DATABASE_PATH is
 * ':memory:' in vitest.config.mts). The handle is cached on globalThis, so wipe
 * rows between tests instead of relying on a fresh connection.
 */
export function resetDb(): void {
  db.run(`
    DELETE FROM notes;
    DELETE FROM rate_limit;
    DELETE FROM session;
    DELETE FROM account;
    DELETE FROM verification;
    DELETE FROM "user";
  `);
}

/** A better-auth user as `getCurrentUser()` returns it; not stored. */
export function makeUser(id: string) {
  const now = new Date();
  return {
    id,
    name: id,
    email: `${id}@example.com`,
    emailVerified: false,
    image: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** notes.user_id is a foreign key, so every note owner must exist first. */
export function seedUser(id: string): ReturnType<typeof makeUser> {
  const user = makeUser(id);
  db.query(
    `INSERT INTO "user" (id, name, email, emailVerified, createdAt, updatedAt)
     VALUES (?, ?, ?, 0, ?, ?)`,
  ).run(user.id, user.name, user.email, user.createdAt.toISOString(), user.updatedAt.toISOString());
  return user;
}
