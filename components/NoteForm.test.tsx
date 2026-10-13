import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { updateNoteAction } from '@/app/notes/[id]/actions';
import { createNoteAction } from '@/app/notes/new/actions';
import { NoteForm } from '@/components/NoteForm';

vi.mock('@/app/notes/new/actions', () => ({ createNoteAction: vi.fn(async () => ({})) }));
vi.mock('@/app/notes/[id]/actions', () => ({ updateNoteAction: vi.fn(async () => ({})) }));
// TipTap needs a real layout engine; a textarea is enough to drive onChange.
vi.mock('@/components/NoteEditor', () => ({
  NoteEditor: (props: { onChange: (json: string) => void; initialContent?: string }) => (
    <textarea
      aria-label='Content'
      defaultValue={props.initialContent}
      onChange={(event) => props.onChange(event.target.value)}
    />
  ),
}));

const doc = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] });
const note = { id: 'n1', title: 'Groceries', contentJson: doc, isPublic: true };

function submittedData(action: { mock: { calls: unknown[][] } }): Record<string, unknown> {
  const formData = action.mock.calls[0]!.at(-1) as FormData;
  return Object.fromEntries(formData);
}

describe('NoteForm (create)', () => {
  it('starts blank and private', () => {
    render(<NoteForm />);

    expect(screen.getByLabelText('Title')).toHaveProperty('value', '');
    expect(screen.getByRole('switch', { name: 'Share publicly' })).toHaveProperty('checked', false);
    expect(screen.getByRole('link', { name: 'Cancel' }).getAttribute('href')).toBe('/dashboard');
  });

  it('submits the title, editor content, and share flag to createNoteAction', async () => {
    const user = userEvent.setup();
    render(<NoteForm />);

    await user.type(screen.getByLabelText('Title'), 'Plan');
    await user.click(screen.getByLabelText('Content'));
    await user.paste(doc);
    await user.click(screen.getByRole('switch', { name: 'Share publicly' }));
    await user.click(screen.getByRole('button', { name: 'Create note' }));

    await vi.waitFor(() => expect(createNoteAction).toHaveBeenCalled());
    expect(submittedData(vi.mocked(createNoteAction))).toEqual({
      title: 'Plan',
      content: doc,
      isPublic: 'on',
    });
  });

  it('shows returned errors and keeps the rejected values', async () => {
    vi.mocked(createNoteAction).mockResolvedValueOnce({
      formError: "Couldn't save the note. Try again.",
      fieldErrors: { title: 'Too long', content: 'Invalid note content' },
      values: { title: 'Kept', isPublic: true },
    });
    const user = userEvent.setup();
    render(<NoteForm />);

    await user.click(screen.getByRole('button', { name: 'Create note' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      "Couldn't save the note. Try again.",
    );
    const title = screen.getByLabelText('Title');
    expect(title.getAttribute('aria-describedby')).toBe('title-error');
    expect(screen.getByText('Too long')).toBeTruthy();
    expect(screen.getByText('Invalid note content').id).toBe('content-error');
    expect(title).toHaveProperty('value', 'Kept');
    expect(screen.getByRole('switch', { name: 'Share publicly' })).toHaveProperty('checked', true);
  });
});

describe('NoteForm (edit)', () => {
  it('prefills from the note and links Cancel back to it', () => {
    render(<NoteForm note={note} />);

    expect(screen.getByLabelText('Title')).toHaveProperty('value', 'Groceries');
    expect(screen.getByRole('switch', { name: 'Share publicly' })).toHaveProperty('checked', true);
    expect(screen.getByRole('link', { name: 'Cancel' }).getAttribute('href')).toBe('/notes/n1');
  });

  it('submits to updateNoteAction bound to the note id, unchanged content included', async () => {
    const user = userEvent.setup();
    render(<NoteForm note={note} />);

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await vi.waitFor(() => expect(updateNoteAction).toHaveBeenCalled());
    expect(vi.mocked(updateNoteAction).mock.calls[0]![0]).toBe('n1');
    expect(submittedData(vi.mocked(updateNoteAction))).toEqual({
      title: 'Groceries',
      content: doc,
      isPublic: 'on',
    });
    expect(createNoteAction).not.toHaveBeenCalled();
  });
});
