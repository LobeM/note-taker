import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SharedBadge } from '@/components/SharedBadge';
import { getCurrentUser } from '@/lib/auth';
import { DEFAULT_REDIRECT } from '@/lib/auth-schemas';
import { formatDate, parseSqliteDate } from '@/lib/dates';
import { getNotesByUser } from '@/lib/notes';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/auth?next=${encodeURIComponent(DEFAULT_REDIRECT)}`);
  }

  const notes = getNotesByUser(user.id);

  return (
    <div className='mx-auto max-w-3xl px-6 py-12'>
      <div className='flex flex-wrap items-center justify-between gap-x-8 gap-y-4'>
        <h1 className='text-4xl tracking-tight'>Dashboard</h1>
        <Link
          href='/notes/new'
          className='btn-primary'
        >
          New note
        </Link>
      </div>
      <p className='mt-2 text-sm opacity-70'>Signed in as {user.email}.</p>

      <section aria-labelledby='notes-heading' className='mt-10'>
        <h2 id='notes-heading' className='sr-only'>
          Your notes
        </h2>
        {notes.length === 0 ? (
          <div className='rounded-xl border border-dashed border-border-strong bg-surface/60 px-6 py-14 text-center'>
            <p className='font-medium'>No notes yet</p>
            <p className='mt-1 text-sm opacity-70'>
              <Link href='/notes/new' className='font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary'>
                Create your first note
              </Link>
              .
            </p>
          </div>
        ) : (
          <ul className='card divide-y divide-border overflow-hidden'>
            {notes.map((note) => {
              const updated = parseSqliteDate(note.updatedAt);
              return (
                <li key={note.id}>
                  <Link
                    href={`/notes/${note.id}`}
                    className='group flex items-center gap-4 border-l-2 border-transparent px-5 py-4 transition hover:border-primary hover:bg-accent/60 focus-visible:outline-2 focus-visible:-outline-offset-2 motion-reduce:transition-none'
                  >
                    <div className='min-w-0 flex-1'>
                      <p className='truncate font-medium transition group-hover:text-accent-foreground'>{note.title}</p>
                      <p className='mt-0.5 text-xs opacity-60'>
                        Updated <time dateTime={updated.toISOString()}>{formatDate(updated)}</time>
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
