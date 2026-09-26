import { get, query, run } from "@/lib/db";
import { DEFAULT_TITLE, EMPTY_DOC_JSON } from "@/lib/note-schemas";

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

export function createNote(
  userId: string,
  data: { title?: string; contentJson?: string } = {},
): Note {
  const row = get<NoteRow>(
    `INSERT INTO notes (id, user_id, title, content_json)
     VALUES (?, ?, ?, ?)
     RETURNING *`,
    [
      crypto.randomUUID(),
      userId,
      data.title ?? DEFAULT_TITLE,
      data.contentJson ?? EMPTY_DOC_JSON,
    ],
  );
  // RETURNING always yields the inserted row; a failed insert throws instead.
  return toNote(row!);
}

export function getNoteById(userId: string, noteId: string): Note | null {
  const row = get<NoteRow>(
    "SELECT * FROM notes WHERE id = ? AND user_id = ?",
    [noteId, userId],
  );
  return row ? toNote(row) : null;
}

export function getNotesByUser(userId: string): Note[] {
  return query<NoteRow>(
    "SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC",
    [userId],
  ).map(toNote);
}

/** Returns null when the note doesn't exist or belongs to someone else. */
export function updateNote(
  userId: string,
  noteId: string,
  data: { title: string; contentJson: string },
): Note | null {
  const row = get<NoteRow>(
    `UPDATE notes
     SET title = ?, content_json = ?, updated_at = datetime('now')
     WHERE id = ? AND user_id = ?
     RETURNING *`,
    [data.title, data.contentJson, noteId, userId],
  );
  return row ? toNote(row) : null;
}

/** Returns false when there was nothing of this user's to delete. */
export function deleteNote(userId: string, noteId: string): boolean {
  return run("DELETE FROM notes WHERE id = ? AND user_id = ?", [noteId, userId]).changes > 0;
}
