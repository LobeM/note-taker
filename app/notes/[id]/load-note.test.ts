import { beforeEach, expect, it, vi } from 'vitest';
import { loadNote } from '@/app/notes/[id]/load-note';
import { getCurrentUser } from '@/lib/auth';
import { createNote } from '@/lib/notes';
import { makeUser, resetDb, seedUser } from '@/test/db';

vi.mock('next/navigation');
vi.mock('@/lib/auth');

beforeEach(() => {
  resetDb();
  seedUser('alice');
  seedUser('bob');
});

it("returns the signed-in owner's note", async () => {
  const note = createNote('alice');
  vi.mocked(getCurrentUser).mockResolvedValue(makeUser('alice'));

  await expect(loadNote(note.id, `/notes/${note.id}`)).resolves.toEqual(note);
});

it('404s for a note that belongs to someone else', async () => {
  const note = createNote('alice');
  vi.mocked(getCurrentUser).mockResolvedValue(makeUser('bob'));

  await expect(loadNote(note.id, `/notes/${note.id}`)).rejects.toThrow('NEXT_NOT_FOUND');
});

it('sends signed-out users to sign in, returning to the given path', async () => {
  vi.mocked(getCurrentUser).mockResolvedValue(null);

  await expect(loadNote('n1', '/notes/n1/edit')).rejects.toMatchObject({
    url: '/auth?next=%2Fnotes%2Fn1%2Fedit',
  });
});
