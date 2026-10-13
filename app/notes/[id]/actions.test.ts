import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteNoteAction, updateNoteAction } from '@/app/notes/[id]/actions';
import { getCurrentUser } from '@/lib/auth';
import { createNote, deleteNote, getNoteById, type Note } from '@/lib/notes';
import { makeUser, resetDb, seedUser } from '@/test/db';

vi.mock('next/navigation');
vi.mock('@/lib/auth');
vi.mock('@/lib/notes', { spy: true });

function form(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

const content = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] });
let note: Note;

beforeEach(() => {
  resetDb();
  const alice = seedUser('alice');
  seedUser('bob');
  note = createNote('alice', { title: 'Original' });
  vi.mocked(getCurrentUser).mockResolvedValue(alice);
});

function signInAs(id: string) {
  vi.mocked(getCurrentUser).mockResolvedValue(makeUser(id));
}

describe('updateNoteAction', () => {
  it('sends signed-out users to sign in, then back to the editor', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    await expect(updateNoteAction(note.id, {}, form({ title: 'x' }))).rejects.toMatchObject({
      url: `/auth?next=${encodeURIComponent(`/notes/${note.id}/edit`)}`,
    });
  });

  it('saves the changes and returns to the note', async () => {
    await expect(
      updateNoteAction(note.id, {}, form({ title: 'Edited', content, isPublic: 'on' })),
    ).rejects.toMatchObject({ url: `/notes/${note.id}` });

    expect(getNoteById('alice', note.id)).toMatchObject({
      title: 'Edited',
      contentJson: content,
      isPublic: true,
    });
  });

  it("can't edit someone else's note", async () => {
    signInAs('bob');

    const state = await updateNoteAction(note.id, {}, form({ title: 'Hijacked', content }));

    expect(state.formError).toBe('This note no longer exists.');
    expect(getNoteById('alice', note.id)?.title).toBe('Original');
  });

  it('returns field errors without saving', async () => {
    const state = await updateNoteAction(note.id, {}, form({ title: 'x'.repeat(201), content }));

    expect(state.fieldErrors?.title).toMatch(/under 200/);
    expect(getNoteById('alice', note.id)?.title).toBe('Original');
  });
});

describe('deleteNoteAction', () => {
  it('deletes the note and returns to the dashboard', async () => {
    await expect(deleteNoteAction(note.id)).rejects.toMatchObject({ url: '/dashboard' });
    expect(getNoteById('alice', note.id)).toBeNull();
  });

  it("is a no-op on someone else's note", async () => {
    signInAs('bob');
    await expect(deleteNoteAction(note.id)).rejects.toMatchObject({ url: '/dashboard' });
    expect(getNoteById('alice', note.id)).not.toBeNull();
  });

  it('sends signed-out users to sign in', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    await expect(deleteNoteAction(note.id)).rejects.toMatchObject({
      url: `/auth?next=${encodeURIComponent(`/notes/${note.id}`)}`,
    });
    expect(getNoteById('alice', note.id)).not.toBeNull();
  });

  it('reports a storage failure instead of redirecting', async () => {
    vi.mocked(deleteNote).mockImplementationOnce(() => {
      throw new Error('locked');
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(deleteNoteAction(note.id)).resolves.toEqual({
      error: "Couldn't delete the note. Try again.",
    });
  });
});
