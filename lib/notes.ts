import { get, query, run } from '@/lib/db';
import { DEFAULT_TITLE, EMPTY_DOC_JSON } from '@/lib/note-schemas';

export type Note = {
  id: string;
  userId: string;
  title: string;
  contentJson: string; // stringified TipTap doc
  isPublic: boolean;
  publicSlug: string | null;
  createdAt: string;
  updatedAt: string;
};

type NoteRow = {
  id: string;
  user_id: string;
  title: string;
  content_json: string;
  is_public: number;
  public_slug: string | null;
  created_at: string;
  updated_at: string;
};

/** Only what a public visitor may see: no note id, no owner. */
export type PublicNote = Pick<Note, 'title' | 'contentJson' | 'updatedAt'>;

function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    contentJson: row.content_json,
    isPublic: row.is_public === 1,
    publicSlug: row.public_slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** 128 random bits, base64url: 22 URL-safe chars, not guessable (SPEC §11). */
function newPublicSlug(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64url');
}

export function createNote(
  userId: string,
  data: { title?: string; contentJson?: string; isPublic?: boolean } = {},
): Note {
  const isPublic = data.isPublic ?? false;
  const row = get<NoteRow>(
    `INSERT INTO notes (id, user_id, title, content_json, is_public, public_slug)
     VALUES (?, ?, ?, ?, ?, ?)
     RETURNING *`,
    [
      crypto.randomUUID(),
      userId,
      data.title ?? DEFAULT_TITLE,
      data.contentJson ?? EMPTY_DOC_JSON,
      isPublic ? 1 : 0,
      isPublic ? newPublicSlug() : null,
    ],
  );
  // RETURNING always yields the inserted row; a failed insert throws instead.
  return toNote(row!);
}

export function getNoteById(userId: string, noteId: string): Note | null {
  const row = get<NoteRow>('SELECT * FROM notes WHERE id = ? AND user_id = ?', [noteId, userId]);
  return row ? toNote(row) : null;
}

export function getNotesByUser(userId: string): Note[] {
  return query<NoteRow>('SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC', [
    userId,
  ]).map(toNote);
}

/**
 * Returns null when the note doesn't exist or belongs to someone else.
 * A note that stays public keeps its slug; unsharing drops it, so the old link
 * is dead for good and resharing mints a new one.
 */
export function updateNote(
  userId: string,
  noteId: string,
  data: { title: string; contentJson: string; isPublic: boolean },
): Note | null {
  const isPublic = data.isPublic ? 1 : 0;
  const row = get<NoteRow>(
    `UPDATE notes
     SET title = ?, content_json = ?, is_public = ?,
         public_slug = CASE WHEN ? = 1 THEN COALESCE(public_slug, ?) ELSE NULL END,
         updated_at = datetime('now')
     WHERE id = ? AND user_id = ?
     RETURNING *`,
    [data.title, data.contentJson, isPublic, isPublic, newPublicSlug(), noteId, userId],
  );
  return row ? toNote(row) : null;
}

/** Returns false when there was nothing of this user's to delete. */
export function deleteNote(userId: string, noteId: string): boolean {
  return run('DELETE FROM notes WHERE id = ? AND user_id = ?', [noteId, userId]).changes > 0;
}

/** Unauthenticated read: matches only notes that are currently shared. */
export function getPublicNoteBySlug(slug: string): PublicNote | null {
  const row = get<Pick<NoteRow, 'title' | 'content_json' | 'updated_at'>>(
    'SELECT title, content_json, updated_at FROM notes WHERE public_slug = ? AND is_public = 1',
    [slug],
  );
  return row
    ? { title: row.title, contentJson: row.content_json, updatedAt: row.updated_at }
    : null;
}
