import { beforeEach, describe, expect, it } from 'vitest';
import { run } from '@/lib/db';
import { DEFAULT_TITLE, EMPTY_DOC_JSON } from '@/lib/note-schemas';
import {
  createNote,
  deleteNote,
  getNoteById,
  getNotesByUser,
  getPublicNoteBySlug,
  updateNote,
} from '@/lib/notes';
import { resetDb, seedUser } from '@/test/db';

const SLUG_RE = /^[A-Za-z0-9_-]{22}$/;
const doc = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] });

beforeEach(() => {
  resetDb();
  seedUser('alice');
  seedUser('bob');
});

describe('createNote', () => {
  it('applies defaults and stays private', () => {
    const note = createNote('alice');
    expect(note).toMatchObject({
      userId: 'alice',
      title: DEFAULT_TITLE,
      contentJson: EMPTY_DOC_JSON,
      isPublic: false,
      publicSlug: null,
    });
    expect(note.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(note.createdAt).toBe(note.updatedAt);
  });

  it('mints an unguessable base64url slug for public notes', () => {
    const a = createNote('alice', { isPublic: true });
    const b = createNote('alice', { isPublic: true });
    expect(a.publicSlug).toMatch(SLUG_RE);
    expect(b.publicSlug).toMatch(SLUG_RE);
    expect(a.publicSlug).not.toBe(b.publicSlug);
  });
});

describe('getNoteById', () => {
  it("returns the owner's note and hides it from everyone else", () => {
    const note = createNote('alice', { title: 'Secret', contentJson: doc });
    expect(getNoteById('alice', note.id)).toEqual(note);
    expect(getNoteById('bob', note.id)).toBeNull();
    expect(getNoteById('alice', 'missing')).toBeNull();
  });
});

describe('getNotesByUser', () => {
  it("lists only the user's notes, most recently updated first", () => {
    const older = createNote('alice', { title: 'Older' });
    const newer = createNote('alice', { title: 'Newer' });
    createNote('bob', { title: "Bob's" });
    run(`UPDATE notes SET updated_at = '2020-01-01 00:00:00' WHERE id = ?`, [older.id]);

    expect(getNotesByUser('alice').map((n) => n.id)).toEqual([newer.id, older.id]);
    expect(getNotesByUser('nobody')).toEqual([]);
  });
});

describe('updateNote', () => {
  const edit = { title: 'Edited', contentJson: doc, isPublic: false };

  it('updates fields and bumps updated_at', () => {
    const note = createNote('alice');
    run(`UPDATE notes SET updated_at = '2020-01-01 00:00:00' WHERE id = ?`, [note.id]);

    const updated = updateNote('alice', note.id, edit);
    expect(updated).toMatchObject({ title: 'Edited', contentJson: doc, isPublic: false });
    expect(updated!.updatedAt > '2020-01-01 00:00:00').toBe(true);
  });

  it("refuses to touch someone else's note", () => {
    const note = createNote('alice', { title: 'Original' });
    expect(updateNote('bob', note.id, edit)).toBeNull();
    expect(getNoteById('alice', note.id)?.title).toBe('Original');
  });

  it('keeps the slug while public, drops it on unshare, and mints a new one on reshare', () => {
    const note = createNote('alice', { isPublic: true });
    const firstSlug = note.publicSlug!;

    const stillPublic = updateNote('alice', note.id, { ...edit, isPublic: true });
    expect(stillPublic?.publicSlug).toBe(firstSlug);

    const unshared = updateNote('alice', note.id, edit);
    expect(unshared).toMatchObject({ isPublic: false, publicSlug: null });
    expect(getPublicNoteBySlug(firstSlug)).toBeNull();

    const reshared = updateNote('alice', note.id, { ...edit, isPublic: true });
    expect(reshared?.publicSlug).toMatch(SLUG_RE);
    expect(reshared?.publicSlug).not.toBe(firstSlug);
    // The revoked link stays dead after resharing.
    expect(getPublicNoteBySlug(firstSlug)).toBeNull();
  });
});

describe('deleteNote', () => {
  it("deletes the owner's note and reports whether anything was removed", () => {
    const note = createNote('alice');
    expect(deleteNote('bob', note.id)).toBe(false);
    expect(getNoteById('alice', note.id)).not.toBeNull();

    expect(deleteNote('alice', note.id)).toBe(true);
    expect(getNoteById('alice', note.id)).toBeNull();
    expect(deleteNote('alice', note.id)).toBe(false);
  });
});

describe('getPublicNoteBySlug', () => {
  it('returns only the public fields, never the id or owner', () => {
    const note = createNote('alice', { title: 'Shared', contentJson: doc, isPublic: true });
    expect(getPublicNoteBySlug(note.publicSlug!)).toEqual({
      title: 'Shared',
      contentJson: doc,
      updatedAt: note.updatedAt,
    });
  });

  it('finds nothing for unknown slugs or notes whose public flag is off', () => {
    const note = createNote('alice', { isPublic: true });
    expect(getPublicNoteBySlug('not-a-real-slug-at-all')).toBeNull();

    // Defense in depth: a slug left behind without is_public still doesn't resolve.
    run('UPDATE notes SET is_public = 0 WHERE id = ?', [note.id]);
    expect(getPublicNoteBySlug(note.publicSlug!)).toBeNull();
  });
});
