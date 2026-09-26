"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { toFieldErrors } from "@/lib/form-errors";
import { noteSchema, type NoteField } from "@/lib/note-schemas";
import { createNote } from "@/lib/notes";

export type NoteFormState = {
  fieldErrors?: Partial<Record<NoteField, string>>;
  formError?: string;
  /** Echoed back so a rejected submit doesn't wipe the title. */
  values?: { title?: string };
};

export async function createNoteAction(
  _prevState: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  // Server actions are public endpoints; the page guard alone isn't enough.
  const user = await getCurrentUser();
  if (!user) redirect("/auth?next=/notes/new");

  const title = String(formData.get("title") ?? "");
  const parsed = noteSchema.safeParse({
    title,
    content: String(formData.get("content") ?? ""),
  });
  if (!parsed.success) {
    return {
      fieldErrors: toFieldErrors<NoteField>(parsed.error),
      values: { title },
    };
  }

  let noteId: string;
  try {
    noteId = createNote(user.id, {
      title: parsed.data.title,
      contentJson: parsed.data.content,
    }).id;
  } catch (error) {
    console.error("createNote failed", error);
    return {
      formError: "Couldn't save the note. Try again.",
      values: { title },
    };
  }

  // Outside the try/catch: redirect() signals by throwing.
  redirect(`/notes/${noteId}`);
}
