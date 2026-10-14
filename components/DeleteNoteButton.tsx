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
        className='rounded-lg px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-red-300'
      >
        Delete
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={headingId}
        // Light-dismiss (Esc or backdrop click), but not mid-delete.
        closedby={pending ? 'none' : 'any'}
        className='m-auto w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-foreground shadow-2xl shadow-primary/20 backdrop:bg-[#0e0a16]/50 backdrop:backdrop-blur-sm'
      >
        <h2 id={headingId} className='font-display text-xl font-medium wrap-break-word'>
          Delete “{title}”?
        </h2>
        <p className='mt-2 text-sm opacity-70'>
          This permanently deletes the note. It can’t be undone.
        </p>

        {state.error ? (
          <p
            role='alert'
            className='mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300'
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
            className='rounded-lg px-4 py-2 text-sm font-medium opacity-70 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40'
          >
            Cancel
          </button>
          <button
            type='submit'
            disabled={pending}
            aria-busy={pending}
            className='rounded-lg bg-red-600 px-4 py-2 shadow-md shadow-red-600/25 text-sm font-medium text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60'
          >
            {pending ? 'Deleting…' : 'Delete note'}
          </button>
        </form>
      </dialog>
    </>
  );
}
