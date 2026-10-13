import { describe, expect, it } from 'vitest';
import {
  CONTENT_MAX_LENGTH,
  DEFAULT_TITLE,
  EMPTY_DOC_JSON,
  noteSchema,
  TITLE_MAX_LENGTH,
} from '@/lib/note-schemas';

const doc = { type: 'doc', content: [{ type: 'paragraph' }] };

function parse(input: { title?: string; content?: string; isPublic?: boolean }) {
  return noteSchema.safeParse({
    title: '',
    content: JSON.stringify(doc),
    isPublic: false,
    ...input,
  });
}

describe('noteSchema title', () => {
  it('trims, and falls back to the default when blank', () => {
    expect(parse({ title: '  Groceries  ' }).data?.title).toBe('Groceries');
    expect(parse({ title: '   ' }).data?.title).toBe(DEFAULT_TITLE);
  });

  it('rejects titles over the limit', () => {
    const result = parse({ title: 'x'.repeat(TITLE_MAX_LENGTH + 1) });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['title']);
  });
});

describe('noteSchema content', () => {
  it('treats empty content as an empty doc', () => {
    expect(parse({ content: '' }).data?.content).toBe(EMPTY_DOC_JSON);
  });

  it('round-trips a valid doc, re-serialized', () => {
    const pretty = JSON.stringify(doc, null, 2);
    expect(parse({ content: pretty }).data?.content).toBe(JSON.stringify(doc));
  });

  it.each([
    ['malformed JSON', '{"type":'],
    ['a non-doc root', JSON.stringify({ type: 'paragraph' })],
    ['a non-object root', JSON.stringify(['doc'])],
    ['non-array content', JSON.stringify({ type: 'doc', content: 'hi' })],
  ])('rejects %s', (_label, content) => {
    const result = parse({ content });
    expect(result.success).toBe(false);
    // Nested issues still land on the form's `content` field (path[0]).
    expect(result.error?.issues[0]?.path[0]).toBe('content');
    expect(result.error?.issues[0]?.message).toBe('Invalid note content');
  });

  it('rejects content over the size limit before parsing it', () => {
    const result = parse({ content: 'x'.repeat(CONTENT_MAX_LENGTH + 1) });
    expect(result.error?.issues[0]?.message).toBe('This note is too long');
  });
});

describe('noteSchema isPublic', () => {
  it('passes the flag through', () => {
    expect(parse({ isPublic: true }).data?.isPublic).toBe(true);
  });
});
