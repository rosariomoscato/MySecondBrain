"use client";

import { useMemo, useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Note } from "@/lib/types";
import { Separator } from "@/components/ui/separator";
import { marked } from "marked";
import { FileText, Image, Paperclip, X, ChevronRight, Link2, Download, FileDown, FileType, Sparkles, FileSignature } from "lucide-react";

function exportAsMarkdown(note: Note) {
  const meta = [`# ${note.title}`, "", `**Categoria:** ${note.category.replace(/_/g, " ")}`];
  if (note.date) meta.push(`**Data:** ${note.date}`);
  meta.push("", "---", "");
  const full = meta.join("\n") + note.content;
  const blob = new Blob([full], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${note.title.replace(/[/\\?%*:|"<>]/g, "-")}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportAsPdf(note: Note) {
  const htmlContent = marked.parse(note.content.replace(/\\_/g, "_")) as string;
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${note.title}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;color:#1a1a2e;line-height:1.7}
  h1{font-size:1.6em;border-bottom:2px solid #6366f1;padding-bottom:8px;margin-bottom:4px}
  .meta{font-size:0.85em;color:#6b7280;margin-bottom:24px}
  .meta span{margin-right:16px}
  h2{font-size:1.3em;color:#4338ca;margin-top:28px}
  h3{font-size:1.1em;color:#6366f1}
  a{color:#6366f1;text-decoration:none}
  code{background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:0.9em}
  pre{background:#f1f5f9;padding:16px;border-radius:8px;overflow-x:auto}
  pre code{background:none;padding:0}
  blockquote{border-left:3px solid #6366f1;padding-left:16px;color:#6b7280;margin-left:0}
  table{border-collapse:collapse;width:100%;margin:16px 0}
  th,td{border:1px solid #e2e8f0;padding:8px 12px;text-align:left}
  th{background:#f8fafc}
  img{max-width:100%;border-radius:8px}
  ul,ol{padding-left:24px}
  @media print{body{margin:0;max-width:100%}}
</style></head><body>
<h1>${note.title}</h1>
<div class="meta">
  <span>📂 ${note.category.replace(/_/g, " ")}</span>
  ${note.date ? `<span>📅 ${note.date}</span>` : ""}
</div>
${htmlContent}
</body></html>`;
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.print(); };
  }
}

interface NoteSheetProps {
  note: Note | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteHistory: Note[];
  onBreadcrumbClick: (noteId: string) => void;
  onLinkClick: (linkTitle: string) => void;
  relatedNotes: Note[];
  highlightQuery?: string;
}

function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext)) {
    return <Image className="h-3.5 w-3.5" />;
  }
  return <FileText className="h-3.5 w-3.5" />;
}

function highlightHtml(html: string, query: string): string {
  if (!query || query.trim().length < 2) return html;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped, "gi");
  const parts = html.split(/(<[^>]+>)/);
  return parts
    .map((part) => {
      if (part.startsWith("<")) return part;
      return part.replace(re, '<mark class="search-highlight">$&</mark>');
    })
    .join("");
}

function NoteContent({ content, onLinkClick, highlightQuery }: { content: string; onLinkClick: (title: string) => void; highlightQuery?: string }) {
  const html = useMemo(() => {
    const cleaned = content.replace(/\\_/g, "_");
    const renderer = new marked.Renderer();
    renderer.link = function ({ href, text }) {
      if (href.startsWith("#") || href.startsWith("%23")) {
        const title = decodeURIComponent(href.replace(/^%23|^#/, ""));
        return `<a href="#" data-internal-link="${title}">${text}</a>`;
      }
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    };
    marked.setOptions({
      breaks: true,
      gfm: true,
      renderer,
    });
    const parsed = marked.parse(cleaned) as string;
    return highlightQuery ? highlightHtml(parsed, highlightQuery) : parsed;
  }, [content, highlightQuery]);

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest("a");
    if (anchor) {
      const internalLink = anchor.getAttribute("data-internal-link");
      if (internalLink) {
        e.preventDefault();
        onLinkClick(internalLink);
      }
    }
  };

  return (
    <div
      className="note-content text-sm leading-relaxed"
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function ExportMenu({ note }: { note: Note }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        title="Esporta nota"
      >
        <Download className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-10 w-52 rounded-xl border border-border/40 bg-popover/95 backdrop-blur-xl shadow-xl py-1 animate-in fade-in-0 zoom-in-95">
          <button
            onClick={() => { exportAsMarkdown(note); setOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-popover-foreground hover:bg-accent transition-colors"
          >
            <FileType className="h-4 w-4 text-indigo-400" />
            <div className="text-left">
              <div className="font-medium">Markdown</div>
              <div className="text-[11px] text-muted-foreground">.md</div>
            </div>
          </button>
          <button
            onClick={() => { exportAsPdf(note); setOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-popover-foreground hover:bg-accent transition-colors"
          >
            <FileDown className="h-4 w-4 text-rose-400" />
            <div className="text-left">
              <div className="font-medium">PDF</div>
              <div className="text-[11px] text-muted-foreground">Stampa / Salva come PDF</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ summary, isStreaming, onDismiss }: { summary: string; isStreaming: boolean; onDismiss: () => void }) {
  const html = useMemo(() => {
    if (!summary) return "";
    return marked.parse(summary.replace(/\\_/g, "_")) as string;
  }, [summary]);

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 mb-4">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <div className="absolute inset-0 blur-sm bg-cyan-400/30" />
          </div>
          <span className="text-xs font-medium text-cyan-300/80">Riassunto AI</span>
        </div>
        <button
          onClick={onDismiss}
          className="h-5 w-5 inline-flex items-center justify-center rounded hover:bg-accent text-muted-foreground/40 hover:text-foreground transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div
        className="note-content text-sm leading-relaxed text-foreground/70"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-cyan-400 animate-pulse ml-1 rounded-sm" />
      )}
    </div>
  );
}

export function NoteSheet({ note, open, onOpenChange, noteHistory, onBreadcrumbClick, onLinkClick, relatedNotes, highlightQuery }: NoteSheetProps) {
  const [summary, setSummary] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    setSummary("");
    setIsSummarizing(false);
  }, [note?.id]);

  const handleSummarize = async () => {
    if (!note || isSummarizing) return;
    setIsSummarizing(true);
    setSummary("");

    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: note.title, content: note.content, category: note.category }),
      });

      if (!res.ok) {
        const err = await res.json();
        setSummary(err.error || "Errore nella generazione del riassunto");
        setIsSummarizing(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                fullText += data.text;
                setSummary(fullText);
              }
            } catch { /* skip */ }
          }
        }
      }
    } catch {
      setSummary("Errore di connessione.");
    }

    setIsSummarizing(false);
  };

  return (
    <>
      {open && note && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            className="fixed inset-y-0 right-0 z-50 w-[480px] sm:max-w-[480px] bg-background/95 backdrop-blur-xl border-l border-indigo-500/15 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-border/10">
              <div className="flex flex-col gap-1 min-w-0">
                <span
                  className="w-fit text-xs px-2.5 py-1 rounded-full border"
                  style={{
                    borderColor: `${note.categoryColor}40`,
                    color: note.categoryColor,
                    backgroundColor: `${note.categoryColor}10`,
                  }}
                >
                  #{note.category.replace(/_/g, " ")}
                </span>
                <h2 className="text-base font-medium text-foreground truncate">{note.title}</h2>
                {note.date && (
                  <p className="text-xs text-muted-foreground">Data: {note.date}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={handleSummarize}
                  disabled={isSummarizing}
                  className="h-8 px-2.5 inline-flex items-center justify-center gap-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                  title="Riassumi questa nota con AI"
                >
                  {isSummarizing ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <FileSignature className="h-4 w-4" />
                  )}
                  <span className="text-xs">Riassumi</span>
                </button>
                <ExportMenu note={note} />
                <button
                  onClick={() => onOpenChange(false)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {noteHistory.length > 1 && (
              <div className="px-4 py-2 border-b border-border/10 flex items-center gap-1 overflow-x-auto scrollbar-none">
                {noteHistory.map((n, i) => (
                  <span key={n.id} className="flex items-center gap-1 shrink-0">
                    {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/30" />}
                    {i === noteHistory.length - 1 ? (
                      <span className="text-xs text-foreground font-medium truncate max-w-[140px]">
                        {n.title}
                      </span>
                    ) : (
                      <button
                        className="text-xs text-muted-foreground/60 hover:text-foreground transition-colors truncate max-w-[140px] underline decoration-muted-foreground/20 underline-offset-2 hover:decoration-foreground/50"
                        onClick={() => onBreadcrumbClick(n.id)}
                      >
                        {n.title}
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="p-4">
                {summary && (
                  <SummaryCard
                    summary={summary}
                    isStreaming={isSummarizing}
                    onDismiss={() => setSummary("")}
                  />
                )}
                <NoteContent content={note.content} onLinkClick={onLinkClick} highlightQuery={highlightQuery} />

                {note.attachments.length > 0 && (
                  <>
                    <Separator className="my-4 opacity-20" />
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground/50 flex items-center gap-1.5">
                        <Paperclip className="h-3.5 w-3.5" />
                        Allegati ({note.attachments.length})
                      </p>
                      <div className="space-y-1">
                        {note.attachments.map((file, i) => (
                          <a
                            key={i}
                            href={`/files/${encodeURIComponent(file)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-primary/10 text-primary/70 border border-primary/10 hover:bg-primary/15 hover:text-primary transition-colors"
                          >
                            {getFileIcon(file)}
                            <span className="truncate">{file}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {note.links.length > 0 && (
                  <>
                    <Separator className="my-4 opacity-20" />
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground/30">Collegamenti</p>
                      <div className="flex flex-wrap gap-2">
                        {note.links.map((link, i) => {
                          let displayTitle = link;
                          if (displayTitle.startsWith("#")) {
                            const pipeIdx = displayTitle.indexOf(" | ");
                            if (pipeIdx >= 0) {
                              displayTitle = displayTitle.substring(pipeIdx + 3);
                            } else {
                              displayTitle = displayTitle.substring(1);
                            }
                          }
                          displayTitle = displayTitle.replace(/\\_/g, "_");
                          return (
                            <button
                              key={i}
                              onClick={() => onLinkClick(link)}
                              className="text-xs px-2.5 py-1 rounded-md bg-muted text-muted-foreground border hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                            >
                              {displayTitle}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {relatedNotes.length > 0 && (
                  <>
                    <Separator className="my-4 opacity-20" />
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground/50 flex items-center gap-1.5">
                        <Link2 className="h-3.5 w-3.5" />
                        Note correlate
                      </p>
                      <div className="space-y-1.5">
                        {relatedNotes.map((rn) => (
                          <button
                            key={rn.id}
                            onClick={() => onLinkClick(rn.title)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/50 bg-background/30 hover:bg-accent transition-colors text-left group"
                          >
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: rn.categoryColor }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-foreground/80 group-hover:text-foreground truncate">
                                {rn.title}
                              </p>
                              <p className="text-[11px] text-muted-foreground/40 truncate">
                                {rn.content.slice(0, 80).replace(/\n/g, " ")}
                              </p>
                            </div>
                            <span
                              className="shrink-0 text-[10px] px-2 py-0.5 rounded-full border"
                              style={{
                                borderColor: `${rn.categoryColor}30`,
                                color: rn.categoryColor,
                                backgroundColor: `${rn.categoryColor}08`,
                              }}
                            >
                              {rn.category.replace(/_/g, " ")}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </>
  );
}
