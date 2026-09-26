import type { ReactNode } from "react";

/**
 * Renders stored TipTap JSON as plain React elements. Only the doc's top level
 * is validated on write (lib/note-schemas.ts), so every node, mark, and attr is
 * checked here; anything unrecognized degrades to its text, never raw HTML.
 */

type Mark = { type: string; attrs?: Record<string, unknown> };

type JSONNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Mark[];
  content?: JSONNode[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMark(value: unknown): value is Mark {
  return isRecord(value) && typeof value.type === "string";
}

function isNode(value: unknown): value is JSONNode {
  return (
    isRecord(value) &&
    typeof value.type === "string" &&
    (value.content === undefined || Array.isArray(value.content))
  );
}

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

function safeHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    return SAFE_PROTOCOLS.has(new URL(value).protocol) ? value : null;
  } catch {
    return null;
  }
}

function applyMark(mark: Mark, children: ReactNode, key: string): ReactNode {
  switch (mark.type) {
    case "bold":
      return <strong key={key}>{children}</strong>;
    case "italic":
      return <em key={key}>{children}</em>;
    case "underline":
      return <u key={key}>{children}</u>;
    case "strike":
      return <s key={key}>{children}</s>;
    case "code":
      return <code key={key}>{children}</code>;
    case "link": {
      const href = safeHref(mark.attrs?.href);
      return href ? (
        <a key={key} href={href} rel="noopener noreferrer nofollow">
          {children}
        </a>
      ) : (
        children
      );
    }
    default:
      return children;
  }
}

function renderChildren(node: JSONNode): ReactNode[] {
  return (node.content ?? []).filter(isNode).map((child, i) => renderNode(child, String(i)));
}

/** The page title is the h1, so stored levels 1–3 render as h2–h4. */
const HEADINGS = ["h2", "h3", "h4"] as const;

function renderNode(node: JSONNode, key: string): ReactNode {
  switch (node.type) {
    case "text": {
      if (typeof node.text !== "string") return null;
      const marks = Array.isArray(node.marks) ? node.marks.filter(isMark) : [];
      // Wrap innermost-first so the first mark ends up outermost.
      return marks.reduceRight<ReactNode>(
        (children, mark, i) => applyMark(mark, children, `${key}-${i}`),
        node.text,
      );
    }
    case "paragraph":
      return <p key={key}>{renderChildren(node)}</p>;
    case "heading": {
      const level = Number(node.attrs?.level);
      const Tag = HEADINGS[Math.min(Math.max(Number.isInteger(level) ? level : 1, 1), 3) - 1];
      return <Tag key={key}>{renderChildren(node)}</Tag>;
    }
    case "bulletList":
      return <ul key={key}>{renderChildren(node)}</ul>;
    case "orderedList": {
      const start = Number(node.attrs?.start);
      return (
        <ol key={key} start={Number.isInteger(start) && start > 0 ? start : undefined}>
          {renderChildren(node)}
        </ol>
      );
    }
    case "listItem":
      return <li key={key}>{renderChildren(node)}</li>;
    case "blockquote":
      return <blockquote key={key}>{renderChildren(node)}</blockquote>;
    case "codeBlock": {
      const language = node.attrs?.language;
      return (
        <pre key={key}>
          <code data-language={typeof language === "string" ? language : undefined}>
            {renderChildren(node)}
          </code>
        </pre>
      );
    }
    case "horizontalRule":
      return <hr key={key} />;
    case "hardBreak":
      return <br key={key} />;
    default:
      // Includes "doc": unknown containers still show their text.
      return node.content ? <span key={key}>{renderChildren(node)}</span> : null;
  }
}

function parseDoc(contentJson: string): JSONNode | null {
  try {
    const doc: unknown = JSON.parse(contentJson);
    return isNode(doc) && doc.type === "doc" ? doc : null;
  } catch {
    return null;
  }
}

export function NoteContent({ contentJson }: { contentJson: string }) {
  const doc = parseDoc(contentJson);
  const blocks = doc ? renderChildren(doc) : [];
  const isEmpty =
    !doc?.content?.length ||
    // A new doc from the editor is one empty paragraph.
    doc.content.every((node) => isNode(node) && node.type === "paragraph" && !node.content?.length);

  if (isEmpty) {
    return <p className="text-sm italic opacity-60">This note is empty.</p>;
  }

  return <div className="tiptap">{blocks}</div>;
}
