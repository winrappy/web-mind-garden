"use client";

import { useEffect, useId, useState } from "react";
import mermaid from "mermaid";

type Article = { id: string; title: string; parentId: string | null };

export function DiagramBlock({ articles, selectedId }: { articles: Article[]; selectedId: string }) {
  const id = useId().replaceAll(":", "");
  const [svg, setSvg] = useState("");

  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: "base", securityLevel: "strict" });
    const lines = articles
      .filter((article) => article.parentId)
      .map((article) => `${safe(article.parentId!)}["${label(articles.find((item) => item.id === article.parentId)?.title || "Root")}"] --> ${safe(article.id)}["${label(article.title)}"]`);
    const graph = `flowchart TD\n${lines.length ? lines.join("\n") : `${safe(selectedId)}["${label(articles.find((item) => item.id === selectedId)?.title || "Article")}"]`}`;
    mermaid.render(`diagram-${id}`, graph).then((result) => setSvg(result.svg));
  }, [articles, id, selectedId]);

  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}

function safe(value: string) {
  return `n${value.replace(/[^a-zA-Z0-9]/g, "")}`;
}

function label(value: string) {
  return value.replaceAll('"', "'");
}
