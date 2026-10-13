'use server';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { type NoteFormState, readNoteForm } from '@/lib/note-form';
import { deleteNote, updateNote } from '@/lib/notes';

// `noteId` is bound on the client, so it's untrusted: every query below is
// scoped to the signed-in user in SQL, which makes a foreign id a no-op.

export async function updateNoteAction(
  noteId: string,
  _prevState: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  const user = await getCurrentUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent(`/notes/${noteId}/edit`)}`);

  const form = readNoteForm(formData);
  if (!form.success) return form.state;

  let updated: boolean;
  try {
    updated = updateNote(user.id, noteId, form.data) !== null;
  } catch (error) {
    console.error('updateNote failed', error);
    return { formError: "Couldn't save the note. Try again.", values: form.values };
  }
  if (!updated) {
    return { formError: 'This note no longer exists.', values: form.values };
  }

  // Outside the try/catch: redirect() signals by throwing.
  redirect(`/notes/${noteId}`);
}

export type DeleteNoteState = { error?: string };

export async function deleteNoteAction(noteId: string): Promise<DeleteNoteState> {
  const user = await getCurrentUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent(`/notes/${noteId}`)}`);

  try {
    // Already gone counts as success: the user wanted it deleted.
    deleteNote(user.id, noteId);
  } catch (error) {
    console.error('deleteNote failed', error);
    return { error: "Couldn't delete the note. Try again." };
  }

  redirect('/dashboard');
}
