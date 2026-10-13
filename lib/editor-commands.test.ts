// @vitest-environment happy-dom
import { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { afterEach, describe, expect, it } from 'vitest';
import { toggleCodeBlock } from '@/lib/editor-commands';

const paragraph = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });

let editor: Editor | undefined;
afterEach(() => editor?.destroy());

function makeEditor(content: object[]): Editor {
  editor = new Editor({ extensions: [StarterKit], content: { type: 'doc', content } });
  return editor;
}

function selectAll(e: Editor) {
  e.commands.setTextSelection({ from: 1, to: e.state.doc.content.size - 1 });
}

describe('toggleCodeBlock', () => {
  it('merges a multi-block selection into one code block, one line per block', () => {
    const e = makeEditor([paragraph('one'), paragraph('two'), paragraph('three')]);
    selectAll(e);

    toggleCodeBlock(e);

    // StarterKit's TrailingNode appends an empty paragraph after a final code block.
    expect(e.getJSON().content).toEqual([
      {
        type: 'codeBlock',
        attrs: { language: null },
        content: [{ type: 'text', text: 'one\ntwo\nthree' }],
      },
      { type: 'paragraph' },
    ]);
  });

  it('keeps blocks outside the selection', () => {
    const e = makeEditor([paragraph('before'), paragraph('a'), paragraph('b'), paragraph('after')]);
    // From the start of "a" to the end of "b"; each paragraph adds an open and a close token.
    const from = 'before'.length + 3;
    const to = e.state.doc.content.size - 'after'.length - 3;
    e.commands.setTextSelection({ from, to });

    toggleCodeBlock(e);

    expect(e.getJSON().content?.map((node) => node.type)).toEqual([
      'paragraph',
      'codeBlock',
      'paragraph',
    ]);
    expect(e.state.doc.child(1).textContent).toBe('a\nb');
  });

  it('turns a single block into a code block the normal way', () => {
    const e = makeEditor([paragraph('solo')]);
    selectAll(e);

    toggleCodeBlock(e);

    expect(e.state.doc.child(0).type.name).toBe('codeBlock');
    expect(e.state.doc.child(0).textContent).toBe('solo');
  });

  it('toggles an existing code block back to a paragraph', () => {
    const e = makeEditor([{ type: 'codeBlock', content: [{ type: 'text', text: 'x = 1' }] }]);
    selectAll(e);

    toggleCodeBlock(e);

    expect(e.state.doc.child(0).type.name).toBe('paragraph');
    expect(e.state.doc.child(0).textContent).toBe('x = 1');
  });

  it('keeps empty blocks as empty lines', () => {
    const e = makeEditor([{ type: 'paragraph' }, { type: 'paragraph' }]);
    e.commands.setTextSelection({ from: 1, to: 3 });

    toggleCodeBlock(e);

    expect(e.state.doc.child(0).type.name).toBe('codeBlock');
    expect(e.state.doc.child(0).textContent).toBe('\n');
  });
});
