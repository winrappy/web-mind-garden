"use client";

import { useEditor, EditorContent, NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from "@tiptap/react";
import type { Content, NodeViewProps } from "@tiptap/react";
import { useEffect, useState } from "react";
import CodeBlock from "@tiptap/extension-code-block";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { AlignCenter, AlignLeft, AlignRight, Bold, Heading2, Highlighter, ImagePlus, Italic, LinkIcon, List, Table2 } from "lucide-react";
import { Check, Copy } from "lucide-react";

function CodeBlockView({ node }: NodeViewProps) {
  const [copied, setCopied] = useState(false);
  const code = node.textContent;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  }

  return (
    <NodeViewWrapper className="code-block-wrap">
      <div className="code-block-toolbar">
        <button className="btn code-copy-btn" type="button" contentEditable={false} onClick={handleCopy}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  );
}

const CodeBlockWithCopy = CodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
});

export function RichEditor({
  content,
  editable,
  onChange,
}: {
  content: Content;
  editable: boolean;
  onChange: (content: Content) => void;
}) {


  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockWithCopy,
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

  useEffect(() => {
    if (!editor) return;

    const next = JSON.stringify(content ?? {});
    const current = JSON.stringify(editor.getJSON() ?? {});
    if (next === current) return;

    // Run in a macrotask so TipTap's internal flushSync is outside React lifecycle.
    const timeoutId = window.setTimeout(() => {
      if (!editor.isDestroyed) {
        editor.commands.setContent(content || { type: "doc", content: [] }, false);
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [editor, content]);

  function addImage() {
    const url = window.prompt("Image URL");
    if (url) editor!.chain().focus().setImage({ src: url }).run();
  }

  function addLink() {
    const url = window.prompt("Link URL");
    if (url) editor!.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }


  if (!editor) return <div className="editor-surface">Loading editor...</div>;

  return (
    <>
      {editable ? (
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
      ) : null}
      <div className="editor-surface">
        <EditorContent editor={editor} />
      </div>
    </>
  );
}
