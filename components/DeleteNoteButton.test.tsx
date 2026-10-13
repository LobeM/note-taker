import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { deleteNoteAction } from '@/app/notes/[id]/actions';
import { DeleteNoteButton } from '@/components/DeleteNoteButton';

vi.mock('@/app/notes/[id]/actions', () => ({ deleteNoteAction: vi.fn(async () => ({})) }));

function setup() {
  const user = userEvent.setup();
  render(<DeleteNoteButton noteId='n1' title='Groceries' />);
  const dialog = document.querySelector('dialog')!;
  return { user, dialog };
}

it('asks for confirmation in a dialog named after the note', async () => {
  const { user, dialog } = setup();
  expect(dialog.open).toBe(false);

  await user.click(screen.getByRole('button', { name: 'Delete' }));

  expect(dialog.open).toBe(true);
  const heading = screen.getByRole('heading', { name: 'Delete “Groceries”?' });
  expect(dialog.getAttribute('aria-labelledby')).toBe(heading.id);
  expect(deleteNoteAction).not.toHaveBeenCalled();
});

it('cancels without deleting', async () => {
  const { user, dialog } = setup();
  await user.click(screen.getByRole('button', { name: 'Delete' }));

  await user.click(screen.getByRole('button', { name: 'Cancel' }));

  expect(dialog.open).toBe(false);
  expect(deleteNoteAction).not.toHaveBeenCalled();
});

it('deletes this note on confirm and shows a failure inside the dialog', async () => {
  vi.mocked(deleteNoteAction).mockResolvedValueOnce({ error: "Couldn't delete the note." });
  const { user, dialog } = setup();
  await user.click(screen.getByRole('button', { name: 'Delete' }));

  await user.click(screen.getByRole('button', { name: 'Delete note' }));

  expect((await screen.findByRole('alert')).textContent).toBe("Couldn't delete the note.");
  expect(vi.mocked(deleteNoteAction).mock.calls[0]![0]).toBe('n1');
  expect(dialog.contains(screen.getByRole('alert'))).toBe(true);
});
