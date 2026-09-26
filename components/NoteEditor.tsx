"use client";

import { type Editor, EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

type NoteEditorProps = {
  /** Id of the visible label; the editable region has no native <label>. */
  labelledBy: string;
  /** Id of an error message, set while the content is invalid. */
  errorId?: string;
  /** False while the form submits, so nothing typed then is silently dropped. */
  editable: boolean;
  onChange: (contentJson: string) => void;
};

function editorAttributes(labelledBy: string, errorId?: string) {
  return {
    role: "textbox",
    "aria-multiline": "true",
    "aria-labelledby": labelledBy,
    ...(errorId ? { "aria-invalid": "true", "aria-describedby": errorId } : {}),
    class: "tiptap min-h-64 px-4 py-3 text-base outline-none",
  };
}

export function NoteEditor({ labelledBy, errorId, editable, onChange }: NoteEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] } })],
    // Render on the client only, avoiding hydration mismatches under SSR.
    immediatelyRender: false,
    editorProps: { attributes: editorAttributes(labelledBy, errorId) },
    onUpdate: ({ editor }) => onChange(JSON.stringify(editor.getJSON())),
  });

  // Keep ARIA state in sync without recreating the editor (which would drop content).
  useEffect(() => {
    editor?.setOptions({
      editorProps: { attributes: editorAttributes(labelledBy, errorId) },
    });
  }, [editor, labelledBy, errorId]);

  // emitUpdate=false: toggling editability isn't a content change.
  useEffect(() => {
    editor?.setEditable(editable, false);
  }, [editor, editable]);

  return (
    <div
      className="mt-1.5 overflow-hidden rounded-md border border-black/15 focus-within:border-black/40 has-aria-invalid:border-red-500 dark:border-white/20 dark:focus-within:border-white/50"
    >
      {editor ? <Toolbar editor={editor} disabled={!editable} /> : null}
      <EditorContent editor={editor} />
    </div>
  );
}

type ToolbarButton = {
  label: string;
  text: string;
  /** Omitted for one-shot commands, which aren't toggles and get no aria-pressed. */
  isActive?: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
};

const BUTTON_GROUPS: ToolbarButton[][] = [
  [
    {
      label: "Bold",
      text: "B",
      isActive: (e) => e.isActive("bold"),
      run: (e) => e.chain().focus().toggleBold().run(),
    },
    {
      label: "Italic",
      text: "I",
      isActive: (e) => e.isActive("italic"),
      run: (e) => e.chain().focus().toggleItalic().run(),
    },
    {
      label: "Underline",
      text: "U",
      isActive: (e) => e.isActive("underline"),
      run: (e) => e.chain().focus().toggleUnderline().run(),
    },
    {
      label: "Strikethrough",
      text: "S",
      isActive: (e) => e.isActive("strike"),
      run: (e) => e.chain().focus().toggleStrike().run(),
    },
    {
      label: "Inline code",
      text: "</>",
      isActive: (e) => e.isActive("code"),
      run: (e) => e.chain().focus().toggleCode().run(),
    },
  ],
  [
    {
      label: "Paragraph",
      text: "P",
      isActive: (e) => e.isActive("paragraph"),
      run: (e) => e.chain().focus().setParagraph().run(),
    },
    ...([1, 2, 3] as const).map(
      (level): ToolbarButton => ({
        label: `Heading ${level}`,
        text: `H${level}`,
        isActive: (e) => e.isActive("heading", { level }),
        run: (e) => e.chain().focus().toggleHeading({ level }).run(),
      }),
    ),
  ],
  [
    {
      label: "Bullet list",
      text: "•",
      isActive: (e) => e.isActive("bulletList"),
      run: (e) => e.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Code block",
      text: "{ }",
      isActive: (e) => e.isActive("codeBlock"),
      run: (e) => e.chain().focus().toggleCodeBlock().run(),
    },
    {
      label: "Horizontal rule",
      text: "―",
      run: (e) => e.chain().focus().setHorizontalRule().run(),
    },
  ],
];

const TOGGLES = BUTTON_GROUPS.flat().filter((button) => button.isActive);

type ActiveState = Record<string, boolean>;

function Toolbar({ editor, disabled }: { editor: Editor; disabled: boolean }) {
  // Re-renders only when an active state actually flips, not on every keystroke.
  const active = useEditorState<ActiveState>({
    editor,
    selector: ({ editor }) =>
      Object.fromEntries(TOGGLES.map((b) => [b.label, b.isActive!(editor)])),
    equalityFn: (a, b) => TOGGLES.every(({ label }) => a[label] === b?.[label]),
  });

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex flex-wrap items-center gap-1 border-b border-black/10 bg-black/2 px-2 py-1.5 dark:border-white/15 dark:bg-white/3"
    >
      {BUTTON_GROUPS.map((group, groupIndex) => (
        <div key={groupIndex} className="flex items-center gap-1">
          {groupIndex > 0 ? (
            <span
              aria-hidden="true"
              className="mx-1 h-5 w-px bg-black/15 dark:bg-white/20"
            />
          ) : null}
          {group.map((button) => (
            <button
              key={button.label}
              type="button"
              disabled={disabled}
              aria-label={button.label}
              aria-pressed={button.isActive ? active[button.label] : undefined}
              title={button.label}
              onClick={() => button.run(editor)}
              className="min-w-8 rounded px-2 py-1 font-mono text-xs font-medium opacity-70 hover:bg-black/5 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 aria-pressed:bg-foreground aria-pressed:text-background aria-pressed:opacity-100 disabled:pointer-events-none dark:hover:bg-white/10"
            >
              {button.text}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
