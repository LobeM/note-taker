import type { Metadata } from 'next';
import { NoteForm } from '@/components/NoteForm';
import { loadNote } from '../load-note';

export async function generateMetadata(props: PageProps<'/notes/[id]/edit'>): Promise<Metadata> {
  const { id } = await props.params;
  const note = await loadNote(id, `/notes/${id}/edit`);
  return { title: `Edit “${note.title}”` };
}

export default async function EditNotePage(props: PageProps<'/notes/[id]/edit'>) {
  const { id } = await props.params;
  const note = await loadNote(id, `/notes/${id}/edit`);

  return (
    <div className='mx-auto max-w-3xl px-6 py-12'>
      <h1 className='text-3xl font-semibold tracking-tight'>Edit note</h1>
      <NoteForm
        note={{
          id: note.id,
          title: note.title,
          contentJson: note.contentJson,
          isPublic: note.isPublic,
        }}
      />
    </div>
  );
}
