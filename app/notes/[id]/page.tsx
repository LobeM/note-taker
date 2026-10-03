import type { Metadata } from 'next';
import Link from 'next/link';
import { DeleteNoteButton } from '@/components/DeleteNoteButton';
import { NoteContent } from '@/components/NoteContent';
import { ShareLink } from '@/components/ShareLink';
import { SharedBadge } from '@/components/SharedBadge';
import { formatDate, parseSqliteDate } from '@/lib/dates';
import { loadNote } from './load-note';

export async function generateMetadata(props: PageProps<'/notes/[id]'>): Promise<Metadata> {
  const { id } = await props.params;
  const note = await loadNote(id, `/notes/${id}`);
  return { title: note.title };
}

export default async function NotePage(props: PageProps<'/notes/[id]'>) {
  const { id } = await props.params;
  const note = await loadNote(id, `/notes/${id}`);
  const updated = parseSqliteDate(note.updatedAt);

  return (
    <div className='mx-auto max-w-3xl px-6 py-12'>
      <div className='flex items-center justify-between gap-4'>
        <Link
          href='/dashboard'
          className='rounded-sm text-sm opacity-70 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2'
        >
          ← All notes
        </Link>
        {/* Only the owner can load this page, so no further ownership check. */}
        <div className='flex items-center gap-2'>
          <Link
            href={`/notes/${note.id}/edit`}
            className='rounded-md border border-black/15 px-3 py-1.5 text-sm font-medium hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-white/20 dark:hover:bg-white/10'
          >
            Edit
          </Link>
          <DeleteNoteButton noteId={note.id} title={note.title} />
        </div>
      </div>
      <article className='mt-6'>
        <header className='border-b border-black/10 pb-6 dark:border-white/15'>
          <h1 className='text-3xl font-semibold tracking-tight wrap-break-word'>{note.title}</h1>
          <div className='mt-2 flex items-center gap-3 text-sm opacity-70'>
            <p>
              Updated <time dateTime={updated.toISOString()}>{formatDate(updated)}</time>
            </p>
            {note.isPublic ? <SharedBadge /> : null}
          </div>
          {note.isPublic && note.publicSlug ? <ShareLink slug={note.publicSlug} /> : null}
        </header>
        <div className='mt-8'>
          <NoteContent contentJson={note.contentJson} />
        </div>
      </article>
    </div>
  );
}
