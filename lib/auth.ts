import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { db } from "@/lib/db";

export const auth = betterAuth({
  // better-auth detects the Bun handle and drives it through its own
  // BunSqliteDialect. Sharing `db` keeps auth and notes on one connection,
  // so they inherit the WAL / foreign_keys pragmas set in lib/db.ts.
  database: db,
  emailAndPassword: {
    enabled: true,
  },
  // Must stay last in the array: it rewrites Set-Cookie through Next's
  // cookies() helper so auth called from a server action still sets a session.
  plugins: [nextCookies()],
});

/**
 * Server-side session. `authClient.getSession()` cannot see cookies on the
 * server, so every server component and route handler goes through this.
 */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}
