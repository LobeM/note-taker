import type { Editor } from '@tiptap/react';

/**
 * TipTap's toggleCodeBlock converts each selected textblock separately, so a
 * multi-line selection becomes a stack of one-line code blocks. Merge the
 * selected blocks into a single code block instead, one line per block.
 */
export function toggleCodeBlock(editor: Editor) {
  const { state } = editor;
  const { $from, $to } = state.selection;
  const range = $from.blockRange($to);
  const codeBlock = state.schema.nodes.codeBlock;

  const canMerge =
    !editor.isActive('codeBlock') &&
    range !== null &&
    range.endIndex - range.startIndex > 1 &&
    range.parent.canReplaceWith(range.startIndex, range.endIndex, codeBlock);
  if (!canMerge) {
    editor.chain().focus().toggleCodeBlock().run();
    return;
  }

  const lines: string[] = [];
  state.doc.nodesBetween(range.start, range.end, (node) => {
    if (!node.isTextblock) return true;
    lines.push(node.textContent);
    return false;
  });
  const text = lines.join('\n');

  editor
    .chain()
    .focus()
    .command(({ tr }) => {
      tr.replaceWith(
        range.start,
        range.end,
        codeBlock.create(null, text ? state.schema.text(text) : null),
      );
      return true;
    })
    .run();
}
