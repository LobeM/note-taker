# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Keep your replies extremely concise and focus on conveying the key information. No unnecessary fluff, no long code snipets.

Whenever you are working with any third-party library or something similar, you MUST look up the official documentation to ensure that you're working with up-to-date infromation.
Use DocsExplorer subagent for effecient documentation lookup.

@AGENTS.md

## Commands

Bun is the package manager _and_ the intended runtime (`packageManager: bun@1.3.14`, `bun.lock`). Use `bun`, not npm/pnpm/yarn.

```bash
bun install          # install deps
bun dev              # dev server on :3000 (also regenerates the AGENTS.md block)
bun run build        # production build
bun start            # serve the production build
bun run lint         # eslint (flat config, auto-discovers eslint.config.mjs)
bunx tsc --noEmit    # typecheck only
```

No test runner is configured yet. If tests are added, use `bun test` (`@types/bun` is already a devDependency); a single file is `bun test path/to/file.test.ts`, a single case `bun test -t "name"`.

## State of the repo

**Auth is done; notes are not.** better-auth is wired end to end — `lib/auth.ts` (email/password, `nextCookies()`, `getSession()` / `getCurrentUser()`), `app/api/auth/[...all]/route.ts`, all four better-auth tables in `lib/db.ts`, and the UI: `app/auth/page.tsx` + `components/AuthForm.tsx` + the server actions in `app/auth/actions.ts`, with a session-aware nav in `app/layout.tsx` and a server-side guard on `/dashboard`. `@tiptap/*` is installed but **not yet wired up**, and `lib/notes.ts` / `/api/notes` do not exist — `app/page.tsx`, `app/notes/[id]/page.tsx`, and `app/p/[slug]/page.tsx` are still placeholders.

Auth conventions worth keeping:

- **One `/auth` route**, not SPEC.md §8.2's `login` + `register` split. Sign in vs. sign up is a search param (`?mode=signup`), so the mode is linkable and back-button-able; `app/auth/page.tsx` keys `<AuthForm>` on the mode to reset its `useActionState`.
- **Credentials go through server actions**, never `lib/auth-client.ts` — the `nextCookies()` plugin sets the session cookie, no token touches the browser, and the form works without JS. `redirect()` must stay outside the `try` that catches `APIError` (it signals by throwing).
- **`?next=` is untrusted.** Everything routes it through `safeRedirectPath()` in `lib/auth-schemas.ts`, which rejects absolute and protocol-relative URLs.
- **No `middleware.ts`.** SPEC.md §2 asks for one, but `lib/auth` → `lib/db` → `bun:sqlite` cannot run at the Edge. Route protection is a `getCurrentUser()` check in the server component.
- Reading the session in the root layout makes every route dynamic. Accepted for now; move it into a `<Suspense>`-wrapped `<UserNav />` if `/p/[slug]` needs static rendering.

`SPEC.md` is the design document being implemented: an authenticated rich-text note-taking app (TipTap JSON stored in SQLite, notes publicly shareable at `/p/[slug]`). Read it before building features — it defines the DB schema, the `lib/db.ts` / `lib/notes.ts` repository API, the `/api/notes` route handlers, and the page structure. Two places where it has drifted from the current toolchain:

- It says to configure `tailwind.config.ts`. This project is on **Tailwind v4**, which is CSS-first — theme tokens live in the `@theme inline` block in `app/globals.css` and there is no config file.
- Its example TipTap config imports `@tiptap/extension-code` / `-code-block` separately; only `@tiptap/starter-kit` is installed, and StarterKit v3 already bundles those nodes.

Persistence is meant to use `bun:sqlite` with raw SQL, which only runs under the Bun runtime — DB access must stay in server components, route handlers, and Node/Bun-runtime code (never Edge runtime, never client components).

## Architecture notes

- **Next.js 16 App Router.** Read the relevant guide under `node_modules/next/dist/docs/` (see AGENTS.md) before writing route/layout/API code — this version differs from older Next.js conventions.
- **Typed route helpers are global and generated.** `app/layout.tsx` uses `LayoutProps<"/">` without importing it; the equivalents (`PageProps<...>`, etc.) come from `.next/types` and only exist after a build or dev run. A cold `tsc --noEmit` on a clean checkout can fail until `bun dev`/`bun run build` has generated them.
- **Path alias:** `@/*` maps to the repo root (so `@/lib/db`, `@/components/NoteEditor`).
- **Styling:** Tailwind v4 via `@tailwindcss/postcss`; `app/globals.css` defines `--background`/`--foreground` with a `prefers-color-scheme: dark` override and exposes them as `--color-background`/`--color-foreground` plus the Geist font variables.
- **Security invariant from SPEC.md:** every authenticated note query filters on `user_id` in the SQL itself; public reads go through `public_slug` and must never leak owner data.

## AGENTS.md

`AGENTS.md` is rewritten by `next dev` (see `node_modules/next/dist/server/lib/generate-agent-files.js`). Reverting it out of a diff just recreates the uncommitted change — commit it along with your work to keep the tree clean.
