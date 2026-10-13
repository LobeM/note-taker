import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NoteContent } from '@/components/NoteContent';

type Node = Record<string, unknown>;

const text = (value: string, marks?: Node[]): Node => ({ type: 'text', text: value, marks });
const p = (...content: Node[]): Node => ({ type: 'paragraph', content });

function html(...content: Node[]): string {
  const { container } = render(
    <NoteContent contentJson={JSON.stringify({ type: 'doc', content })} />,
  );
  return container.innerHTML;
}

describe('NoteContent', () => {
  it('renders block nodes', () => {
    expect(
      html(
        p(text('para')),
        { type: 'bulletList', content: [{ type: 'listItem', content: [p(text('item'))] }] },
        { type: 'blockquote', content: [p(text('quote'))] },
        { type: 'codeBlock', attrs: { language: 'ts' }, content: [text('let x;')] },
        { type: 'horizontalRule' },
        p(text('a'), { type: 'hardBreak' }, text('b')),
      ),
    ).toBe(
      '<div class="tiptap"><p>para</p><ul><li><p>item</p></li></ul>' +
        '<blockquote><p>quote</p></blockquote>' +
        '<pre><code data-language="ts">let x;</code></pre><hr><p>a<br>b</p></div>',
    );
  });

  it('nests marks with the first mark outermost', () => {
    const marks = ['bold', 'italic', 'underline', 'strike', 'code'].map((type) => ({ type }));
    expect(html(p(text('x', marks)))).toContain(
      '<p><strong><em><u><s><code>x</code></s></u></em></strong></p>',
    );
  });

  it('shifts headings down one level under the page h1 and clamps odd levels', () => {
    const h = (level: unknown) => ({ type: 'heading', attrs: { level }, content: [text('t')] });
    expect(html(h(1), h(2), h(3), h(6), h(0), h('x'))).toBe(
      '<div class="tiptap"><h2>t</h2><h3>t</h3><h4>t</h4><h4>t</h4><h2>t</h2><h2>t</h2></div>',
    );
  });

  it('keeps a valid ordered-list start and drops an invalid one', () => {
    const ol = (start: unknown) => ({ type: 'orderedList', attrs: { start }, content: [] });
    expect(html(ol(3), ol(-1), ol('x'))).toBe(
      '<div class="tiptap"><ol start="3"></ol><ol></ol><ol></ol></div>',
    );
  });

  it('renders safe links with a hardened rel', () => {
    const link = { type: 'link', attrs: { href: 'https://example.com/' } };
    expect(html(p(text('site', [link])))).toContain(
      '<a href="https://example.com/" rel="noopener noreferrer nofollow">site</a>',
    );
  });

  it.each(['javascript:alert(1)', 'data:text/html,hi', 'not a url', 42])(
    'renders a link to %s as plain text',
    (href) => {
      expect(html(p(text('click', [{ type: 'link', attrs: { href } }])))).toBe(
        '<div class="tiptap"><p>click</p></div>',
      );
    },
  );

  it('escapes HTML in text instead of rendering it', () => {
    expect(html(p(text('<img src=x onerror=alert(1)>')))).toBe(
      '<div class="tiptap"><p>&lt;img src=x onerror=alert(1)&gt;</p></div>',
    );
  });

  it('degrades unknown nodes and marks to their text, and skips malformed ones', () => {
    expect(
      html(
        { type: 'iframe', content: [text('kept', [{ type: 'blink' }])] },
        { type: 'image', attrs: { src: 'x' } },
        { type: 'paragraph', content: [{ text: 'no type' }, { type: 'text', text: 5 }] },
      ),
    ).toBe('<div class="tiptap"><span>kept</span><p></p></div>');
  });

  it.each([
    ['invalid JSON', '{nope'],
    ['a non-doc root', JSON.stringify({ type: 'paragraph', content: [] })],
    ['an empty doc', JSON.stringify({ type: 'doc', content: [] })],
    ["the editor's blank doc", JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] })],
  ])('shows the empty state for %s', (_label, contentJson) => {
    const { container } = render(<NoteContent contentJson={contentJson} />);
    expect(container.textContent).toBe('This note is empty.');
  });
});
