"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createNoteAction, type NoteFormState } from "@/app/notes/new/actions";
import { NoteEditor } from "@/components/NoteEditor";
import { DEFAULT_TITLE, EMPTY_DOC_JSON, TITLE_MAX_LENGTH } from "@/lib/note-schemas";

const INITIAL_STATE: NoteFormState = {};

export function NoteForm() {
  const [state, formAction, pending] = useActionState(createNoteAction, INITIAL_STATE);
  // Controlled, so React's post-action form reset can't clear it while the
  // editor still shows the content.
  const [content, setContent] = useState(EMPTY_DOC_JSON);

  const titleError = state.fieldErrors?.title;
  const contentError = state.fieldErrors?.content;

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-6">
      {state.formError ? (
        <p
          role="alert"
          className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300"
        >
          {state.formError}
        </p>
      ) : null}

      <fieldset disabled={pending} className="flex flex-col gap-6 disabled:opacity-60">
        <div>
          <label htmlFor="title" className="text-sm font-medium">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            maxLength={TITLE_MAX_LENGTH}
            placeholder={DEFAULT_TITLE}
            autoComplete="off"
            autoFocus
            defaultValue={state.values?.title}
            aria-invalid={titleError ? true : undefined}
            aria-describedby={titleError ? "title-error" : undefined}
            className="mt-1.5 w-full rounded-md border border-black/15 px-3 py-2 text-lg font-medium outline-none placeholder:opacity-40 focus-visible:border-black/40 aria-invalid:border-red-500 dark:border-white/20 dark:focus-visible:border-white/50"
          />
          {titleError ? (
            <p id="title-error" className="mt-1.5 text-sm text-red-700 dark:text-red-300">
              {titleError}
            </p>
          ) : null}
        </div>

        <div>
          <span id="content-label" className="text-sm font-medium">
            Content
          </span>
          <NoteEditor
            labelledBy="content-label"
            errorId={contentError ? "content-error" : undefined}
            editable={!pending}
            onChange={setContent}
          />
          <input type="hidden" name="content" value={content} />
          {contentError ? (
            <p id="content-error" className="mt-1.5 text-sm text-red-700 dark:text-red-300">
              {contentError}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link
            href="/dashboard"
            className="rounded-md px-4 py-2 text-sm font-medium opacity-70 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Cancel
          </Link>
          <button
            type="submit"
            aria-busy={pending}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {pending ? "Creating…" : "Create note"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
