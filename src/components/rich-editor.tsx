"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import type { Content } from "@tiptap/react";
import { useEffect, useMemo, useState } from "react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import mermaid from "mermaid";
import { AlignCenter, AlignLeft, AlignRight, Bold, Check, Copy, Heading2, Highlighter, ImagePlus, Italic, LinkIcon, List, Table2 } from "lucide-react";

export function RichEditor({
  content,
  editable,
  onChange,
}: {
  content: Content;
  editable: boolean;
  onChange: (content: Content) => void;
}) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const codeBlocks = useMemo(() => extractCodeBlocks(content), [content]);
  const mermaidBlocks = useMemo(() => codeBlocks.filter((block) => isMermaidBlock(block.code)), [codeBlocks]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false }),
      Highlight,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });

  function addImage() {
    const url = window.prompt("Image URL");
    if (url) editor!.chain().focus().setImage({ src: url }).run();
  }

  function addLink() {
    const url = window.prompt("Link URL");
    if (url) editor!.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }


  if (!editor) return <div className="editor-surface">Loading editor...</div>;

  async function copyCode(index: number, code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIndex(index);
      window.setTimeout(() => setCopiedIndex((prev) => (prev === index ? null : prev)), 1600);
    } catch {
      // Ignore clipboard errors in unsupported browsers.
    }
  }

  return (
    <>
      <div className="editor-menu">
        <button className="btn icon" disabled={!editable} title="Bold" onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={16} />
        </button>
        <button className="btn icon" disabled={!editable} title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={16} />
        </button>
        <button className="btn icon" disabled={!editable} title="Heading" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 size={16} />
        </button>
        <button className="btn icon" disabled={!editable} title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={16} />
        </button>
        <button className="btn icon" disabled={!editable} title="Highlight" onClick={() => editor.chain().focus().toggleHighlight().run()}>
          <Highlighter size={16} />
        </button>
        <button className="btn icon" disabled={!editable} title="Align left" onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <AlignLeft size={16} />
        </button>
        <button className="btn icon" disabled={!editable} title="Align center" onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <AlignCenter size={16} />
        </button>
        <button className="btn icon" disabled={!editable} title="Align right" onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          <AlignRight size={16} />
        </button>
        <button className="btn icon" disabled={!editable} title="Link" onClick={addLink}>
          <LinkIcon size={16} />
        </button>
        <button className="btn icon" disabled={!editable} title="Image" onClick={addImage}>
          <ImagePlus size={16} />
        </button>
        <button
          className="btn icon"
          disabled={!editable}
          title="Table"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        >
          <Table2 size={16} />
        </button>
      </div>
      <div className="editor-surface">
        <EditorContent editor={editor} />
      </div>

      {codeBlocks.length > 0 ? (
        <section className="editor-code-panel">
          <div className="editor-code-head">
            <h4>Code blocks</h4>
          </div>
          <div className="editor-code-list">
            {codeBlocks.map((block, index) => (
              <article key={`${index}-${block.code.slice(0, 20)}`} className="editor-code-card">
                <div className="editor-code-card-head">
                  <span className="editor-code-label">Snippet {index + 1}</span>
                  <button className="btn" type="button" onClick={() => copyCode(index, block.code)}>
                    {copiedIndex === index ? <Check size={14} /> : <Copy size={14} />} {copiedIndex === index ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="editor-code-pre">
                  <code>{block.code}</code>
                </pre>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {mermaidBlocks.length > 0 ? (
        <section className="editor-diagram-panel">
          <div className="editor-code-head">
            <h4>Sequence Diagram Preview</h4>
          </div>
          <div className="editor-diagram-list">
            {mermaidBlocks.map((block, index) => (
              <MermaidPreview key={`${index}-${block.code.slice(0, 20)}`} code={block.code} index={index} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

function MermaidPreview({ code, index }: { code: string; index: number }) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const renderId = `editor-mermaid-${index}-${Math.random().toString(36).slice(2, 8)}`;

    mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "base" });
    mermaid
      .render(renderId, code)
      .then((result) => {
        if (!isMounted) return;
        setError(null);
        setSvg(result.svg);
      })
      .catch(() => {
        if (!isMounted) return;
        setSvg("");
        setError("Cannot render Mermaid diagram. Please check syntax.");
      });

    return () => {
      isMounted = false;
    };
  }, [code, index]);

  if (error) return <p className="muted">{error}</p>;
  return <div className="editor-diagram-canvas" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function extractCodeBlocks(content: Content): { code: string }[] {
  const blocks: { code: string }[] = [];

  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const item = node as { type?: string; text?: string; content?: unknown[] };

    if (item.type === "codeBlock") {
      const code = flattenText(item).trim();
      if (code) blocks.push({ code });
      return;
    }

    if (Array.isArray(item.content)) {
      for (const child of item.content) walk(child);
    }
  };

  walk(content);
  return blocks;
}

function flattenText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const item = node as { type?: string; text?: string; content?: unknown[] };
  if (item.type === "text") return item.text || "";
  if (!Array.isArray(item.content)) return "";
  return item.content.map(flattenText).join("");
}

function isMermaidBlock(code: string): boolean {
  const firstLine = code.split("\n")[0]?.trim().toLowerCase() || "";
  return firstLine.startsWith("sequencediagram") || firstLine.startsWith("flowchart") || firstLine.startsWith("graph");
}
