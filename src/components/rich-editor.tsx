"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import type { Content } from "@tiptap/react";
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

  if (!editor) return <div className="editor-surface">Loading editor...</div>;

  function addImage() {
    const url = window.prompt("Image URL");
    if (url) editor!.chain().focus().setImage({ src: url }).run();
  }

  function addLink() {
    const url = window.prompt("Link URL");
    if (url) editor!.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
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
    </>
  );
}
