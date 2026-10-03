'use server';

import { redirect } from 'next/navigation';
import type { NoteFormState } from '@/app/notes/new/actions';
import { getCurrentUser } from '@/lib/auth';
import { toFieldErrors } from '@/lib/form-errors';
import { noteSchema, type NoteField } from '@/lib/note-schemas';
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

  const title = String(formData.get('title') ?? '');
  // An unchecked checkbox isn't submitted at all.
  const isPublic = formData.get('isPublic') === 'on';
  const parsed = noteSchema.safeParse({
    title,
    content: String(formData.get('content') ?? ''),
    isPublic,
  });
  if (!parsed.success) {
    return {
      fieldErrors: toFieldErrors<NoteField>(parsed.error),
      values: { title, isPublic },
    };
  }

  let updated: boolean;
  try {
    updated =
      updateNote(user.id, noteId, {
        title: parsed.data.title,
        contentJson: parsed.data.content,
        isPublic: parsed.data.isPublic,
      }) !== null;
  } catch (error) {
    console.error('updateNote failed', error);
    return { formError: "Couldn't save the note. Try again.", values: { title, isPublic } };
  }
  if (!updated) {
    return { formError: 'This note no longer exists.', values: { title, isPublic } };
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
