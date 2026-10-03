'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { updateNoteAction } from '@/app/notes/[id]/actions';
import { createNoteAction, type NoteFormState } from '@/app/notes/new/actions';
import { NoteEditor } from '@/components/NoteEditor';
import { DEFAULT_TITLE, EMPTY_DOC_JSON, TITLE_MAX_LENGTH } from '@/lib/note-schemas';

const INITIAL_STATE: NoteFormState = {};

type NoteFormProps = {
  /** The note being edited; omitted when creating one. */
  note?: { id: string; title: string; contentJson: string; isPublic: boolean };
};

export function NoteForm({ note }: NoteFormProps) {
  const [state, formAction, pending] = useActionState(
    note ? updateNoteAction.bind(null, note.id) : createNoteAction,
    INITIAL_STATE,
  );
  // Controlled, so React's post-action form reset can't clear it while the
  // editor still shows the content.
  const [content, setContent] = useState(note?.contentJson ?? EMPTY_DOC_JSON);

  const titleError = state.fieldErrors?.title;
  const contentError = state.fieldErrors?.content;

  return (
    <form action={formAction} className='mt-8 flex flex-col gap-6'>
      {state.formError ? (
        <p
          role='alert'
          className='rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300'
        >
          {state.formError}
        </p>
      ) : null}

      <fieldset disabled={pending} className='flex flex-col gap-6 disabled:opacity-60'>
        <div>
          <label htmlFor='title' className='text-sm font-medium'>
            Title
          </label>
          <input
            id='title'
            name='title'
            type='text'
            maxLength={TITLE_MAX_LENGTH}
            placeholder={DEFAULT_TITLE}
            autoComplete='off'
            autoFocus
            defaultValue={state.values?.title ?? note?.title}
            aria-invalid={titleError ? true : undefined}
            aria-describedby={titleError ? 'title-error' : undefined}
            className='mt-1.5 w-full rounded-md border border-black/15 px-3 py-2 text-lg font-medium outline-none placeholder:opacity-40 focus-visible:border-black/40 aria-invalid:border-red-500 dark:border-white/20 dark:focus-visible:border-white/50'
          />
          {titleError ? (
            <p id='title-error' className='mt-1.5 text-sm text-red-700 dark:text-red-300'>
              {titleError}
            </p>
          ) : null}
        </div>

        <div>
          <span id='content-label' className='text-sm font-medium'>
            Content
          </span>
          <NoteEditor
            labelledBy='content-label'
            errorId={contentError ? 'content-error' : undefined}
            editable={!pending}
            onChange={setContent}
            initialContent={note?.contentJson}
          />
          <input type='hidden' name='content' value={content} />
          {contentError ? (
            <p id='content-error' className='mt-1.5 text-sm text-red-700 dark:text-red-300'>
              {contentError}
            </p>
          ) : null}
        </div>

        <div className='flex items-start justify-between gap-4'>
          <div>
            <label htmlFor='isPublic' className='text-sm font-medium'>
              Share publicly
            </label>
            <p id='isPublic-hint' className='mt-0.5 text-sm opacity-70'>
              Anyone with the link can view this note. Turning sharing off disables the link;
              turning it on again creates a new one.
            </p>
          </div>
          {/* A restyled native checkbox: still submits `isPublic=on` and works without JS. */}
          <span className='relative inline-flex shrink-0'>
            <input
              id='isPublic'
              name='isPublic'
              type='checkbox'
              role='switch'
              defaultChecked={state.values?.isPublic ?? note?.isPublic ?? false}
              aria-describedby='isPublic-hint'
              className='peer h-6 w-11 cursor-pointer appearance-none rounded-full bg-black/15 transition-colors checked:bg-foreground focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed motion-reduce:transition-none dark:not-checked:bg-white/20'
            />
            <span
              aria-hidden
              className='pointer-events-none absolute top-0.5 left-0.5 size-5 rounded-full bg-background shadow-sm transition-transform peer-checked:translate-x-5 motion-reduce:transition-none'
            />
          </span>
        </div>

        <div className='flex items-center justify-end gap-3'>
          <Link
            href={note ? `/notes/${note.id}` : '/dashboard'}
            className='rounded-md px-4 py-2 text-sm font-medium opacity-70 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2'
          >
            Cancel
          </Link>
          <button
            type='submit'
            aria-busy={pending}
            className='rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2'
          >
            {note ? (pending ? 'Saving…' : 'Save changes') : pending ? 'Creating…' : 'Create note'}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
