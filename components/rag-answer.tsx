"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Note, ChatMessage } from "@/lib/types";
import { Sparkles, Send, Plus, User, ChevronDown, ChevronUp, ExternalLink, Download } from "lucide-react";
import { marked } from "marked";

interface RagChatProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  onSourceClick: (noteId: string) => void;
  onSourceOpenInGraph: (noteId: string) => void;
  onFollowUp: (question: string) => void;
  onNewChat: () => void;
  getNoteById: (id: string) => Note | undefined;
}

export function RagChat({
  messages,
  isStreaming,
  onSourceClick,
  onSourceOpenInGraph,
  onFollowUp,
  onNewChat,
  getNoteById,
}: RagChatProps) {
  const [input, setInput] = useState("");
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!isStreaming && messages.length > 0 && messages[messages.length - 1]?.role === "assistant") {
      inputRef.current?.focus();
    }
  }, [isStreaming, messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isStreaming) {
      onFollowUp(input.trim());
      setInput("");
    }
  };

  const toggleSource = (noteId: string) => {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId);
      else next.add(noteId);
      return next;
    });
  };

  const handleExport = () => {
    const appName = process.env.NEXT_PUBLIC_APP_NAME || "Knowledge Explorer";
    const lines: string[] = [`# ${appName} — Conversazione AI`, ""];
    for (const msg of messages) {
      if (msg.role === "user") {
        lines.push("## Domanda", "", msg.content, "");
      } else {
        lines.push("## Risposta", "", msg.content, "");
        if (msg.sourceIds && msg.sourceIds.length > 0) {
          const uniqueSources = [...new Set(msg.sourceIds)];
          const titles = uniqueSources
            .map((id) => getNoteById(id))
            .filter(Boolean)
            .map((n) => n!.title);
          if (titles.length > 0) {
            lines.push("**Fonti:** " + titles.map((t) => `*${t}*`).join(", "));
            lines.push("");
          }
        }
        lines.push("---", "");
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversazione-ai-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (messages.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground/60 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-400" />
          Conversazione AI
        </h3>
        <button
          onClick={onNewChat}
          className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-foreground px-2.5 py-1.5 rounded-lg hover:bg-accent transition-colors"
        >
          <Plus className="h-3 w-3" />
          Nuova chat
        </button>
        {!isStreaming && messages.some((m) => m.role === "assistant" && !m.isStreaming) && (
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-foreground px-2.5 py-1.5 rounded-lg hover:bg-accent transition-colors"
            title="Scarica conversazione come Markdown"
          >
            <Download className="h-3 w-3" />
            Esporta
          </button>
        )}
      </div>

      <div ref={scrollRef} className="space-y-4 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
        {messages.map((msg) => (
          <div key={msg.id} className="space-y-3">
            {msg.role === "user" ? (
              <div className="flex items-start gap-3">
                <div className="h-7 w-7 shrink-0 rounded-full bg-indigo-500/20 flex items-center justify-center mt-0.5">
                  <User className="h-3.5 w-3.5 text-indigo-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ) : (
              <div className="ml-10 glass-card glow-border rounded-xl overflow-hidden">
                <div className="p-4">
                  <AnswerContent
                    content={msg.content}
                    sources={(msg.sourceIds || [])
                      .map((id) => getNoteById(id))
                      .filter(Boolean) as Note[]}
                    isStreaming={!!msg.isStreaming}
                    onSourceClick={onSourceClick}
                  />
                </div>

                {!msg.isStreaming && msg.sourceIds && msg.sourceIds.length > 0 && (
                  <div className="px-4 pb-3 space-y-1.5">
                    {msg.sourceIds
                      .map((id) => getNoteById(id))
                      .filter(Boolean)
                      .filter((n, i, arr) => arr.findIndex((x) => x?.id === n?.id) === i)
                      .map((note) => {
                        const nid = note!.id;
                        const isExpanded = expandedSources.has(nid);
                        return (
                          <div key={nid}>
                            <div
                              className="flex items-center gap-2 group cursor-pointer"
                              onClick={() => toggleSource(nid)}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-amber-400 shrink-0" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-amber-400 shrink-0" />
                              )}
                              <span className="source-highlight text-xs py-1 px-2.5 rounded-lg border border-amber-500/20 group-hover:border-amber-400/40 transition-colors">
                                {note!.title}
                              </span>
                            </div>
                            {isExpanded && (
                              <div className="ml-5 mt-1.5 rounded-lg border border-border/40 bg-background/60 p-3 space-y-2">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="text-[10px] px-2 py-0.5 rounded-full border"
                                    style={{
                                      borderColor: `${note!.categoryColor}50`,
                                      color: note!.categoryColor,
                                      backgroundColor: `${note!.categoryColor}10`,
                                    }}
                                  >
                                    #{note!.category.replace(/_/g, " ")}
                                  </span>
                                  {note!.links.length > 0 && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {note!.links.length} collegamenti
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground/70 leading-relaxed">
                                  {note!.content.slice(0, 300).replace(/\n/g, " ")}...
                                </p>
                                <div className="flex items-center gap-2 pt-1">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onSourceClick(nid); }}
                                    className="text-[10px] flex items-center gap-1 text-primary/70 hover:text-primary px-2 py-1 rounded-md hover:bg-accent transition-colors"
                                  >
                                    Leggi tutto
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onSourceOpenInGraph(nid); }}
                                    className="text-[10px] flex items-center gap-1 text-cyan-400/70 hover:text-cyan-400 px-2 py-1 rounded-md hover:bg-cyan-500/10 transition-colors"
                                  >
                                    <ExternalLink className="h-2.5 w-2.5" />
                                    Apri nel grafo
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Fai un'altra domanda..."
          disabled={isStreaming}
          className="flex-1 h-10 px-4 text-sm rounded-xl bg-background/60 border border-border placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 transition-all disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={!input.trim() || isStreaming}
          className="h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 disabled:opacity-30 hover:from-indigo-400 hover:to-purple-500 transition-all"
        >
          {isStreaming ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>
    </div>
  );
}

function AnswerContent({ content, sources, isStreaming, onSourceClick }: {
  content: string;
  sources: Note[];
  isStreaming: boolean;
  onSourceClick: (id: string) => void;
}) {
  const html = useMemo(() => {
    if (!content) return "";
    const sourceTitles = sources.map((s) => s.title);
    const parsed = marked.parse(content.replace(/\\_/g, "_")) as string;
    let result = parsed.replace(/<em>([^<]+)<\/em>/g, (match, text) => {
      const isSource = sourceTitles.some(
        (t) => t.toLowerCase().includes(text.toLowerCase()) || text.toLowerCase().includes(t.toLowerCase())
      );
      if (isSource) {
        const found = sources.find(
          (s) => s.title.toLowerCase().includes(text.toLowerCase()) || text.toLowerCase().includes(s.title.toLowerCase())
        );
        if (found) {
          return `<span class="source-highlight" data-source-id="${found.id}">${text}</span>`;
        }
      }
      return `<em class="text-indigo-300/40">${text}</em>`;
    });
    if (isStreaming) {
      result += '<span class="inline-block w-2 h-4 bg-cyan-400 animate-pulse ml-1 rounded-sm"></span>';
    }
    return result;
  }, [content, sources, isStreaming]);

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains("source-highlight")) {
      const id = target.getAttribute("data-source-id");
      if (id) onSourceClick(id);
    }
  };

  return (
    <div
      className="note-content text-sm leading-relaxed text-indigo-100/80"
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
