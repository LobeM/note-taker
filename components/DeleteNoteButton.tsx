'use client';

import { useActionState, useId, useRef } from 'react';
import { deleteNoteAction, type DeleteNoteState } from '@/app/notes/[id]/actions';

const INITIAL_STATE: DeleteNoteState = {};

type DeleteNoteButtonProps = { noteId: string; title: string };

export function DeleteNoteButton({ noteId, title }: DeleteNoteButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const [state, formAction, pending] = useActionState(
    deleteNoteAction.bind(null, noteId),
    INITIAL_STATE,
  );

  return (
    <>
      <button
        type='button'
        onClick={() => dialogRef.current?.showModal()}
        className='rounded-md px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-red-300'
      >
        Delete
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={headingId}
        // Light-dismiss (Esc or backdrop click), but not mid-delete.
        closedby={pending ? 'none' : 'any'}
        className='m-auto w-full max-w-md rounded-lg border border-black/10 bg-background p-6 text-foreground shadow-xl backdrop:bg-black/40 dark:border-white/15'
      >
        <h2 id={headingId} className='text-lg font-semibold wrap-break-word'>
          Delete “{title}”?
        </h2>
        <p className='mt-2 text-sm opacity-70'>
          This permanently deletes the note. It can’t be undone.
        </p>

        {state.error ? (
          <p
            role='alert'
            className='mt-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300'
          >
            {state.error}
          </p>
        ) : null}

        <form action={formAction} className='mt-6 flex justify-end gap-3'>
          <button
            type='button'
            // The safe choice gets initial focus when the dialog opens.
            autoFocus
            disabled={pending}
            onClick={() => dialogRef.current?.close()}
            className='rounded-md px-4 py-2 text-sm font-medium opacity-70 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40'
          >
            Cancel
          </button>
          <button
            type='submit'
            disabled={pending}
            aria-busy={pending}
            className='rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60'
          >
            {pending ? 'Deleting…' : 'Delete note'}
          </button>
        </form>
      </dialog>
    </>
  );
}
