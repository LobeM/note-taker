import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createNoteAction } from '@/app/notes/new/actions';
import { getCurrentUser } from '@/lib/auth';
import { createNote, getNotesByUser } from '@/lib/notes';
import { resetDb, seedUser } from '@/test/db';

vi.mock('next/navigation');
vi.mock('@/lib/auth');
// Real repository, wrapped so a test can make it throw.
vi.mock('@/lib/notes', { spy: true });

function form(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

const content = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] });

beforeEach(() => {
  resetDb();
  vi.mocked(getCurrentUser).mockResolvedValue(seedUser('alice'));
});

describe('createNoteAction', () => {
  it('sends signed-out users to sign in first', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    await expect(createNoteAction({}, form({ title: 'x', content }))).rejects.toMatchObject({
      url: '/auth?next=/notes/new',
    });
    expect(getNotesByUser('alice')).toEqual([]);
  });

  it('saves the note for the signed-in user and opens it', async () => {
    const redirect = await createNoteAction(
      {},
      form({ title: 'Plan', content, isPublic: 'on' }),
    ).catch((error: unknown) => error);

    const [note] = getNotesByUser('alice');
    expect(note).toMatchObject({ title: 'Plan', contentJson: content, isPublic: true });
    expect(redirect).toMatchObject({ url: `/notes/${note!.id}` });
  });

  it('returns field errors and echoes the form values', async () => {
    const state = await createNoteAction({}, form({ title: 'Kept', content: '{oops' }));

    expect(state).toEqual({
      fieldErrors: { content: 'Invalid note content' },
      values: { title: 'Kept', isPublic: false },
    });
    expect(getNotesByUser('alice')).toEqual([]);
  });

  it('reports a storage failure without losing the form', async () => {
    vi.mocked(createNote).mockImplementationOnce(() => {
      throw new Error('disk full');
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const state = await createNoteAction({}, form({ title: 'Kept', content }));

    expect(state).toEqual({
      formError: "Couldn't save the note. Try again.",
      values: { title: 'Kept', isPublic: false },
    });
  });
});
