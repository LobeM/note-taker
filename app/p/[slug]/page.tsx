import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { NoteContent } from '@/components/NoteContent';
import { formatDate, parseSqliteDate } from '@/lib/dates';
import { getPublicNoteBySlug } from '@/lib/notes';

// Rendered per request (the root layout reads the session), so unsharing takes
// effect immediately. If this route is ever cached, updateNoteAction must
// invalidate it, or a revoked link would keep serving the note.

/** No auth: anyone holding the slug may read. Cached so metadata and page share one query. */
const loadPublicNote = cache((slug: string) => getPublicNoteBySlug(slug) ?? notFound());

export async function generateMetadata(props: PageProps<'/p/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const note = loadPublicNote(slug);
  // Unlisted links shouldn't end up in search results.
  return { title: note.title, robots: { index: false, follow: false } };
}

export default async function PublicNotePage(props: PageProps<'/p/[slug]'>) {
  const { slug } = await props.params;
  const note = loadPublicNote(slug);
  const updated = parseSqliteDate(note.updatedAt);

  return (
    <article className='mx-auto max-w-3xl px-6 py-12'>
      <header className='border-b border-black/10 pb-6 dark:border-white/15'>
        <h1 className='text-3xl font-semibold tracking-tight wrap-break-word'>{note.title}</h1>
        <p className='mt-2 text-sm opacity-70'>
          Updated <time dateTime={updated.toISOString()}>{formatDate(updated)}</time>
        </p>
      </header>
      <div className='mt-8'>
        <NoteContent contentJson={note.contentJson} />
      </div>
    </article>
  );
}
