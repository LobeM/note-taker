import { toFieldErrors } from '@/lib/form-errors';
import { noteSchema, type NoteField } from '@/lib/note-schemas';

export type NoteFormState = {
  fieldErrors?: Partial<Record<NoteField, string>>;
  formError?: string;
  /** Echoed back so a rejected submit doesn't reset the fields. */
  values?: { title?: string; isPublic?: boolean };
};

export type NoteFormData = { title: string; contentJson: string; isPublic: boolean };

type ReadNoteFormResult =
  | { success: true; data: NoteFormData; values: NonNullable<NoteFormState['values']> }
  | { success: false; state: NoteFormState };

/** Shared by the create and update actions: FormData in, validated note (or form state) out. */
export function readNoteForm(formData: FormData): ReadNoteFormResult {
  const title = String(formData.get('title') ?? '');
  // An unchecked checkbox isn't submitted at all.
  const isPublic = formData.get('isPublic') === 'on';
  const values = { title, isPublic };

  const parsed = noteSchema.safeParse({
    title,
    content: String(formData.get('content') ?? ''),
    isPublic,
  });
  if (!parsed.success) {
    return {
      success: false,
      state: { fieldErrors: toFieldErrors<NoteField>(parsed.error), values },
    };
  }

  return {
    success: true,
    data: {
      title: parsed.data.title,
      contentJson: parsed.data.content,
      isPublic: parsed.data.isPublic,
    },
    values,
  };
}
