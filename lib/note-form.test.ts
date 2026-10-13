import { describe, expect, it } from 'vitest';
import { readNoteForm } from '@/lib/note-form';

function form(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

const content = JSON.stringify({ type: 'doc', content: [] });

describe('readNoteForm', () => {
  it('returns validated data for the repository', () => {
    const result = readNoteForm(form({ title: ' Plan ', content, isPublic: 'on' }));
    expect(result).toEqual({
      success: true,
      data: { title: 'Plan', contentJson: content, isPublic: true },
      values: { title: ' Plan ', isPublic: true },
    });
  });

  it('treats a missing checkbox as private and missing fields as empty', () => {
    const result = readNoteForm(new FormData());
    expect(result.success && result.data).toEqual({
      title: 'Untitled note',
      contentJson: content,
      isPublic: false,
    });
  });

  it('returns field errors and echoes the raw values on failure', () => {
    const result = readNoteForm(form({ title: 'Kept', content: 'not json', isPublic: 'on' }));
    expect(result).toEqual({
      success: false,
      state: {
        fieldErrors: { content: 'Invalid note content' },
        values: { title: 'Kept', isPublic: true },
      },
    });
  });
});
