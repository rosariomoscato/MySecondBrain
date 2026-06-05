"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { marked } from "marked";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen } from "lucide-react";

export function DocsViewer() {
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/docs")
      .then((r) => r.json())
      .then((data) => {
        setMarkdown(data.content || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const html = useMemo(() => {
    if (!markdown) return "";
    const renderer = new marked.Renderer();
    renderer.heading = function ({ text, depth }) {
      const plainText = text.replace(/<[^>]+>/g, "");
      const id = plainText.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/^-|-$/g, "");
      return `<h${depth} id="${id}">${text}</h${depth}>`;
    };
    marked.setOptions({ renderer });
    return marked.parse(markdown) as string;
  }, [markdown]);

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest("a");
    if (!anchor) return;
    const href = anchor.getAttribute("href");
    if (!href || !href.startsWith("#")) return;

    e.preventDefault();
    const id = href.slice(1);
    const el = contentRef.current?.querySelector(`[id="${CSS.escape(id)}"]`) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-muted-foreground/40">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="text-sm">Caricamento documentazione...</span>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="max-w-3xl mx-auto px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="relative">
            <BookOpen className="h-7 w-7 text-indigo-400" />
            <div className="absolute inset-0 blur-lg bg-indigo-400/40" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Guida Utente</h1>
            <p className="text-sm text-muted-foreground/50">My Second Brain — Documentazione</p>
          </div>
        </div>
        <div
          ref={contentRef}
          className="docs-content max-w-none"
          onClick={handleClick}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </ScrollArea>
  );
}
