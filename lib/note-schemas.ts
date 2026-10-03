import { z } from 'zod';

export const DEFAULT_TITLE = 'Untitled note';
export const TITLE_MAX_LENGTH = 200;
/** Serialized TipTap JSON, in UTF-16 code units. Generous for text, blocks abuse. */
export const CONTENT_MAX_LENGTH = 100_000;

export const EMPTY_DOC_JSON = JSON.stringify({ type: 'doc', content: [] });

export type NoteField = 'title' | 'content';

const INVALID_CONTENT = { error: 'Invalid note content' };

/**
 * Only the top-level shape is checked. The nodes are rendered through TipTap's
 * schema, which drops anything it doesn't know, so they never become raw HTML.
 */
const tiptapDocSchema = z.looseObject(
  {
    type: z.literal('doc', INVALID_CONTENT),
    content: z.array(z.unknown(), INVALID_CONTENT).optional(),
  },
  INVALID_CONTENT,
);

export const noteSchema = z.object({
  title: z
    .string()
    .trim()
    .max(TITLE_MAX_LENGTH, `Keep the title under ${TITLE_MAX_LENGTH} characters`)
    .transform((title) => title || DEFAULT_TITLE),
  content: z
    .string()
    .max(CONTENT_MAX_LENGTH, 'This note is too long')
    .transform((raw, ctx) => {
      try {
        return JSON.parse(raw || EMPTY_DOC_JSON) as unknown;
      } catch {
        ctx.issues.push({ code: 'custom', message: INVALID_CONTENT.error, input: raw });
        return z.NEVER;
      }
    })
    .pipe(tiptapDocSchema)
    // Re-serialize so only what was validated gets stored.
    .transform((doc) => JSON.stringify(doc)),
  isPublic: z.boolean(),
});
