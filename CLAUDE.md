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
bun run test         # Vitest, once (bun run test:watch to watch)
bun run test lib/notes.test.ts   # one file; add -t "name" for one case
```

**`bun run test`, never `bun test`** — the latter is Bun's own runner and ignores `vitest.config.mts`.

## Testing

- **Vitest runs on the Bun runtime** (`bun --bun vitest`) because `lib/db.ts` imports `bun:sqlite`. Bun makes the fork workers use Bun by putting a temporary `node` shim on PATH. Where that can't be written (e.g. a sandbox), the workers silently fall back to Node and fail with "Cannot find package 'bun:sqlite'". In that case, run `bun --bun node_modules/vitest/vitest.mjs run`.
- **Two projects** in `vitest.config.mts`:
  - `*.test.ts` runs in `node`.
  - `*.test.tsx` runs in `happy-dom` with React Testing Library; `test/setup-dom.ts` does the cleanup.
  - A `.ts` test that needs a DOM opts in with a `// @vitest-environment happy-dom` docblock (see `lib/editor-commands.test.ts`).
- **Real SQLite, not mocks:**
  - `DATABASE_PATH=':memory:'` is set in the config.
  - Call `resetDb()` in `beforeEach`; the handle is cached on `globalThis`.
  - Call `seedUser()` before creating notes, because of the foreign key. Both helpers are in `test/db.ts`; `makeUser()` builds a `getCurrentUser()` result.
- **Mocks are opt-in per file** with a factory-less `vi.mock(...)`:
  - `vi.mock('next/navigation')`: `redirect`/`notFound` throw. Assert with `rejects.toMatchObject({ url })`.
  - `vi.mock('next/headers')`
  - `vi.mock('@/lib/auth')`: better-auth never loads.
  - Implementations live in `__mocks__/next/*` and `lib/__mocks__/auth.ts`.
  - `vi.mock('@/lib/notes', { spy: true })` keeps the real repository but lets a test force a throw.
  - `mockReset`/`restoreMocks` are on, so set mock return values per test.
- Client component tests mock their server-action modules; `NoteForm` tests also swap `NoteEditor` for a textarea.
- Async server components (pages, `Header`) aren't unit-testable in Vitest; logic they need belongs in `lib/` or a loader like `app/notes/[id]/load-note.ts`.
- Testability seams worth keeping:
  - `lib/note-form.ts`: FormData → validated note, shared by both note actions.
  - `lib/auth-errors.ts`: a `'use server'` file can only export async actions, so helpers live outside it.
  - `lib/editor-commands.ts`
  - `createDb(path)` / `migrateNotesCascade(db)` exported from `lib/db.ts`.

## State of the repo

**Auth is done; notes are partial.** better-auth is wired end to end — `lib/auth.ts` (email/password, `nextCookies()`, `getSession()` / `getCurrentUser()`), `app/api/auth/[...all]/route.ts`, all four better-auth tables in `lib/db.ts`, and the UI: `app/auth/page.tsx` + `components/AuthForm.tsx` + the server actions in `app/auth/actions.ts`, with a session-aware nav in `app/layout.tsx` and a server-side guard on `/dashboard`. Notes: create (`/notes/new`, TipTap editor + server action), list on `/dashboard`, and a read-only view at `/notes/[id]` rendered by `components/NoteContent.tsx` (hand-written TipTap JSON → JSX, validates every node/mark, allowlists link protocols — keep it in sync with the editor's extensions). Edit at `/notes/[id]/edit` (same `NoteForm`, `note` prop switches it to update mode) and delete via a `<dialog>` confirm (`components/DeleteNoteButton.tsx`); both are server actions in `app/notes/[id]/actions.ts`, and both pages share `app/notes/[id]/load-note.ts`. Diverges from SPEC §8: `/notes/[id]` is the _view_, not the editor. Sharing: a "Share publicly" checkbox in `NoteForm` (no separate share endpoint); `lib/notes.ts` mints a 128-bit base64url slug, keeps it while the note stays public, and NULLs it on unshare so the old link is dead for good. `/p/[slug]` reads through `getPublicNoteBySlug()`, which returns only title/content/updatedAt; it relies on being dynamically rendered for revocation to be immediate. The owner sees the link via `components/ShareLink.tsx` on the view page. Not done: `/api/notes`; `app/page.tsx` is a placeholder.

Auth conventions worth keeping:

- **One `/auth` route**, not SPEC.md §8.2's `login` + `register` split. Sign in vs. sign up is a search param (`?mode=signup`), so the mode is linkable and back-button-able; `app/auth/page.tsx` keys `<AuthForm>` on the mode to reset its `useActionState`.
- **Credentials go through server actions**, never `lib/auth-client.ts` — the `nextCookies()` plugin sets the session cookie, no token touches the browser, and the form works without JS. `redirect()` must stay outside the `try` that catches `APIError` (it signals by throwing).
- **`?next=` is untrusted.** Everything routes it through `safeRedirectPath()` in `lib/auth-schemas.ts`, which resolves it with `new URL()` against a sentinel origin (prefix checks miss `/\t/evil.com`).
- **Rate limiting is ours, not better-auth's.** Its limiter only runs on the `/api/auth` HTTP router; `auth.api.*` calls from server actions bypass it. Use `consumeRateLimit()` in `lib/rate-limit.ts` (SQLite `rate_limit` table) before any credential call.
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
