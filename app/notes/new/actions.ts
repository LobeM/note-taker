'use server';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { type NoteFormState, readNoteForm } from '@/lib/note-form';
import { createNote } from '@/lib/notes';

export async function createNoteAction(
  _prevState: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  // Server actions are public endpoints; the page guard alone isn't enough.
  const user = await getCurrentUser();
  if (!user) redirect('/auth?next=/notes/new');

  const form = readNoteForm(formData);
  if (!form.success) return form.state;

  let noteId: string;
  try {
    noteId = createNote(user.id, form.data).id;
  } catch (error) {
    console.error('createNote failed', error);
    return { formError: "Couldn't save the note. Try again.", values: form.values };
  }

  // Outside the try/catch: redirect() signals by throwing.
  redirect(`/notes/${noteId}`);
}
