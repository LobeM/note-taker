import Link from "next/link";
import { redirect } from "next/navigation";
import { SharedBadge } from "@/components/SharedBadge";
import { getCurrentUser } from "@/lib/auth";
import { DEFAULT_REDIRECT } from "@/lib/auth-schemas";
import { formatDate, parseSqliteDate } from "@/lib/dates";
import { getNotesByUser } from "@/lib/notes";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/auth?next=${encodeURIComponent(DEFAULT_REDIRECT)}`);
  }

  const notes = getNotesByUser(user.id);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <Link
          href="/notes/new"
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          New note
        </Link>
      </div>
      <p className="mt-2 text-sm opacity-70">Signed in as {user.email}.</p>

      <section aria-labelledby="notes-heading" className="mt-10">
        <h2 id="notes-heading" className="sr-only">
          Your notes
        </h2>
        {notes.length === 0 ? (
          <div className="rounded-md border border-dashed border-black/15 px-6 py-12 text-center dark:border-white/20">
            <p className="font-medium">No notes yet</p>
            <p className="mt-1 text-sm opacity-70">
              <Link
                href="/notes/new"
                className="underline underline-offset-4 hover:opacity-100"
              >
                Create your first note
              </Link>
              .
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-black/10 overflow-hidden rounded-md border border-black/10 dark:divide-white/15 dark:border-white/15">
            {notes.map((note) => {
              const updated = parseSqliteDate(note.updatedAt);
              return (
                <li key={note.id}>
                  <Link
                    href={`/notes/${note.id}`}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-black/3 focus-visible:outline-2 focus-visible:-outline-offset-2 dark:hover:bg-white/5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{note.title}</p>
                      <p className="mt-0.5 text-xs opacity-60">
                        Updated{" "}
                        <time dateTime={updated.toISOString()}>{formatDate(updated)}</time>
                      </p>
                    </div>
                    {note.isPublic ? <SharedBadge /> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
