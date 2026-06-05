"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { loadNotes, getCategories, getNoteById, getRelatedNotes } from "@/lib/notes-loader";
import { SearchResult, Note, SearchMode, ChatMessage } from "@/lib/types";
import { SearchBar } from "@/components/search-bar";
import { SearchResults } from "@/components/search-results";
import { RagChat } from "@/components/rag-answer";
import { NoteGraph } from "@/components/note-graph";
import type { NoteGraphHandle } from "@/components/note-graph";
import { NoteSheet } from "@/components/note-sheet";
import { SidebarNav } from "@/components/sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { SpaceBackground } from "@/components/space-background";
import { Statistics } from "@/components/statistics";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Network, RefreshCw, X, BarChart3, Settings, HelpCircle } from "lucide-react";
import { SettingsDialog } from "@/components/settings-dialog";
import { useSearchHistory } from "@/hooks/use-search-history";

const allNotes = loadNotes();
const categories = getCategories();

export default function Home() {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [noteHistory, setNoteHistory] = useState<Note[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("graph");
  const [lastQuery, setLastQuery] = useState("");
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [notesVersion, setNotesVersion] = useState(0);
  const [focusedResultIndex, setFocusedResultIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const graphRef = useRef<NoteGraphHandle>(null);
  const { history: searchHistory, add: addHistory, remove: removeHistory, clear: clearHistory } = useSearchHistory();

  const filteredNotes = selectedCategory
    ? allNotes.filter((n) => n.category === selectedCategory)
    : allNotes;

  const filteredSearchResults = selectedCategory
    ? searchResults.filter((r) => r.item.category === selectedCategory)
    : searchResults;

  const activeCategoryColor = selectedCategory
    ? categories.find((c) => c.name === selectedCategory)?.color
    : null;

  const currentNotes = notesVersion >= 0 ? filteredNotes : filteredNotes;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (sheetOpen) {
          setSheetOpen(false);
          setNoteHistory([]);
        }
        return;
      }

      const inInput = document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA";
      if (inInput) return;

      if (e.key === "ArrowDown" && activeTab === "results" && filteredSearchResults.length > 0) {
        e.preventDefault();
        setFocusedResultIndex((i) => Math.min(i + 1, filteredSearchResults.length - 1));
      } else if (e.key === "ArrowUp" && activeTab === "results" && filteredSearchResults.length > 0) {
        e.preventDefault();
        setFocusedResultIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && focusedResultIndex >= 0 && activeTab === "results") {
        e.preventDefault();
        const note = filteredSearchResults[focusedResultIndex];
        if (note) handleNoteClick(note.item.id);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sheetOpen, activeTab, filteredSearchResults, focusedResultIndex]);

  useEffect(() => {
    setFocusedResultIndex(-1);
  }, [filteredSearchResults]);

  const relatedNotes = useMemo(() => {
    if (!selectedNote) return [];
    return getRelatedNotes(selectedNote, 5);
  }, [selectedNote]);

  const handleRebuild = useCallback(async () => {
    setIsRebuilding(true);
    try {
      const res = await fetch("/api/rebuild", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setNotesVersion((v) => v + 1);
        window.location.reload();
      }
    } catch {
      // ignore
    }
    setIsRebuilding(false);
  }, []);

  const handleNoteClick = useCallback((noteId: string) => {
    const note = getNoteById(noteId);
    if (note) {
      setSelectedNote(note);
      setNoteHistory([note]);
      setSheetOpen(true);
    }
  }, []);

  const handleLinkClick = useCallback((linkTitle: string) => {
    let title = linkTitle;
    if (title.startsWith("#")) {
      const pipeIdx = title.indexOf(" | ");
      if (pipeIdx >= 0) {
        title = title.substring(pipeIdx + 3);
      } else {
        title = title.substring(1);
      }
    }
    title = title.replace(/\\_/g, "_");

    const normalize = (s: string) => s.toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ").trim();

    const normTitle = normalize(title);
    const note = allNotes.find((n) => {
      const nTitle = normalize(n.title);
      return nTitle === normTitle || nTitle.includes(normTitle) || normTitle.includes(nTitle);
    });
    if (note) {
      setNoteHistory((prev) => {
        const idx = prev.findIndex((n) => n.id === note.id);
        if (idx >= 0) return prev.slice(0, idx + 1);
        return [...prev, note];
      });
      setSelectedNote(note);
    }
  }, []);

  const handleBreadcrumbClick = useCallback((noteId: string) => {
    setNoteHistory((prev) => prev.slice(0, prev.findIndex((n) => n.id === noteId) + 1));
    const note = getNoteById(noteId);
    if (note) setSelectedNote(note);
  }, []);

  const handleSheetClose = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) setNoteHistory([]);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchResults([]);
    setChatMessages([]);
    setLastQuery("");
    setSearchQuery("");
  }, []);

  const handleNewChat = useCallback(() => {
    setChatMessages([]);
  }, []);

  const handleSourceOpenInGraph = useCallback((noteId: string) => {
    setIsLoading(false);
    setIsStreaming(false);
    handleNoteClick(noteId);
    setActiveTab("graph");
    setTimeout(() => graphRef.current?.focusNode(noteId), 400);
  }, [handleNoteClick]);

  const sendRagQuestion = useCallback(
    async (question: string, existingMessages: ChatMessage[]) => {
      setIsStreaming(true);

      const userMsgId = `u_${Date.now()}`;
      const assistantMsgId = `a_${Date.now()}`;

      const updatedMessages = [
        ...existingMessages,
        { id: userMsgId, role: "user" as const, content: question },
        { id: assistantMsgId, role: "assistant" as const, content: "", sourceIds: [], isStreaming: true },
      ];
      setChatMessages(updatedMessages);

      const history = existingMessages
        .filter((m) => !m.isStreaming)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, category: selectedCategory, history }),
        });

        if (!res.ok) {
          const err = await res.json();
          setChatMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: err.error || "Errore nella richiesta", isStreaming: false }
                : m
            )
          );
          setIsStreaming(false);
          setIsLoading(false);
          return;
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let fullAnswer = "";
        const sourceIds: string[] = [];

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
                if (data.sources) {
                  sourceIds.push(...data.sources.split(","));
                } else if (data.text) {
                  fullAnswer += data.text;
                  setChatMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, content: fullAnswer }
                        : m
                    )
                  );
                } else if (data.error) {
                  fullAnswer += `\n\nErrore: ${data.error}`;
                  setChatMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, content: fullAnswer }
                        : m
                    )
                  );
                }
              } catch {
                // skip
              }
            }
          }
        }

        const uniqueSourceIds = [...new Set(sourceIds)];
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, sourceIds: uniqueSourceIds, isStreaming: false }
              : m
          )
        );
      } catch {
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: "Errore di connessione. Verifica che il provider sia configurato correttamente.", isStreaming: false }
              : m
          )
        );
      }

      setIsStreaming(false);
      setIsLoading(false);
    },
    [selectedCategory]
  );

  const handleFollowUp = useCallback(
    (question: string) => {
      setIsLoading(true);
      sendRagQuestion(question, chatMessages);
    },
    [chatMessages, sendRagQuestion]
  );

  const handleSearch = useCallback(
    async (query: string, mode: SearchMode) => {
      setIsLoading(true);
      setLastQuery(query);

      if (mode === "text") {
        setActiveTab("results");
        setChatMessages([]);
        try {
          const catParam = selectedCategory ? `&category=${encodeURIComponent(selectedCategory)}` : "";
          const res = await fetch(`/api/search?q=${encodeURIComponent(query)}${catParam}`);
          const data = await res.json();
          setSearchResults(data.results || []);
        } catch {
          setSearchResults([]);
        }
        setIsLoading(false);
      } else {
        setActiveTab("results");
        setSearchResults([]);
        setChatMessages([]);
        sendRagQuestion(query, []);
      }
    },
    [selectedCategory, sendRagQuestion]
  );

  return (
    <div className="flex h-full relative">
      <SpaceBackground />

      {/* Sidebar */}
      <aside className="w-64 shrink-0 glass border-r border-indigo-500/10 overflow-hidden hidden md:flex flex-col relative z-10">
        <div className="p-5 border-b border-indigo-500/10">
          <h2 className="font-semibold text-lg flex items-center gap-3">
            <div className="relative">
              <Brain className="h-6 w-6 text-indigo-400" />
              <div className="absolute inset-0 blur-lg bg-indigo-400/40" />
            </div>
            <span className="shimmer-text">{process.env.NEXT_PUBLIC_APP_NAME || "Knowledge Explorer"}</span>
          </h2>
        </div>
        <SidebarNav
          categories={categories}
          totalNotes={allNotes.length}
          selectedCategory={selectedCategory}
          onCategoryClick={setSelectedCategory}
        />
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col h-full relative z-10">
        {/* Header */}
        <header className="h-16 shrink-0 glass border-b border-indigo-500/10 px-6 flex items-center gap-4">
          <div className="flex-1">
            <SearchBar onSearch={handleSearch} isLoading={isLoading} value={searchQuery} onChange={setSearchQuery} searchHistory={searchHistory} onAddHistory={addHistory} onRemoveHistory={removeHistory} onClearHistory={clearHistory} />
          </div>
          <button
            onClick={handleRebuild}
            disabled={isRebuilding}
            className="h-10 w-10 inline-flex items-center justify-center rounded-xl bg-background/40 border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-300 disabled:opacity-40"
            title="Aggiorna note (re-indicizza)"
          >
            <RefreshCw className={`h-4 w-4 ${isRebuilding ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="h-10 w-10 inline-flex items-center justify-center rounded-xl bg-background/40 border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-300"
            title="Impostazioni"
          >
            <Settings className="h-4 w-4" />
          </button>
          <a
            href="https://github.com/rosariomoscato/MySecondBrain#readme"
            target="_blank"
            rel="noopener noreferrer"
            className="h-10 w-10 inline-flex items-center justify-center rounded-xl bg-background/40 border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-300"
            title="Guida utente"
          >
            <HelpCircle className="h-4 w-4" />
          </a>
          <ThemeToggle />
        </header>

        {/* Content */}
        <div className="flex-1 min-h-0 neural-grid">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="px-6 pt-4 shrink-0">
              <TabsList className="bg-white/5 border border-indigo-500/10">
                <TabsTrigger
                  value="graph"
                  className="flex items-center gap-2 data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-200"
                >
                  <Network className="h-4 w-4" />
                  Grafo
                </TabsTrigger>
                <TabsTrigger
                  value="results"
                  className="flex items-center gap-2 data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-200"
                >
                  Risultati
                  {(filteredSearchResults.length > 0 || chatMessages.length > 0) && (
                    <span className="ml-1 h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="stats"
                  className="flex items-center gap-2 data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-200"
                >
                  <BarChart3 className="h-4 w-4" />
                  Statistiche
                </TabsTrigger>
              </TabsList>

              {selectedCategory && activeCategoryColor && (
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-xs text-muted-foreground/60">Filtro:</span>
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all duration-200 hover:opacity-80"
                    style={{
                      borderColor: `${activeCategoryColor}50`,
                      color: activeCategoryColor,
                      backgroundColor: `${activeCategoryColor}10`,
                    }}
                  >
                    {selectedCategory.replace(/_/g, " ")}
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            <TabsContent value="graph" className="flex-1 min-h-0 mt-0 px-6 pb-6">
              <div className="h-full rounded-xl border border-indigo-500/10">
                <NoteGraph ref={graphRef} notes={filteredNotes} onNodeClick={handleNoteClick} />
              </div>
            </TabsContent>

            <TabsContent value="results" className="flex-1 min-h-0 mt-0">
              <ScrollArea className="h-full">
                <div className="px-6 py-4 max-w-3xl mx-auto space-y-6">
                  {(filteredSearchResults.length > 0 || chatMessages.length > 0) && !isLoading && (
                    <div className="flex justify-end">
                      <button
                        onClick={handleClearSearch}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-accent transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancella risultati
                      </button>
                    </div>
                  )}

                  {isLoading && !isStreaming && (
                    <div className="space-y-4">
                      <div className="h-8 w-48 rounded-lg bg-indigo-500/10 animate-pulse" />
                      <div className="h-32 rounded-xl bg-indigo-500/5 animate-pulse" />
                      <div className="h-32 rounded-xl bg-indigo-500/5 animate-pulse" />
                    </div>
                  )}

                  {chatMessages.length > 0 && (
                    <RagChat
                      messages={chatMessages}
                      isStreaming={isStreaming}
                      onSourceClick={handleNoteClick}
                      onSourceOpenInGraph={handleSourceOpenInGraph}
                      onFollowUp={handleFollowUp}
                      onNewChat={handleNewChat}
                      getNoteById={getNoteById}
                    />
                  )}

                  {filteredSearchResults.length > 0 && (
                    <SearchResults
                      results={filteredSearchResults}
                      query={lastQuery}
                      onNoteClick={handleNoteClick}
                      focusedIndex={focusedResultIndex}
                    />
                  )}

                  {!isLoading && chatMessages.length === 0 && filteredSearchResults.length === 0 && (
                    <div className="text-center py-16">
                      <div className="relative inline-block mb-6">
                        <div className="relative">
                          <Brain className="h-20 w-20 text-primary/15 mx-auto" />
                          <div className="absolute inset-0 blur-3xl bg-primary/10" />
                        </div>
                        <div className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-primary/20 animate-pulse" />
                        <div className="absolute top-4 -left-4 h-2.5 w-2.5 rounded-full bg-cyan-400/20 animate-pulse delay-700" />
                        <div className="absolute -bottom-1 right-6 h-3 w-3 rounded-full bg-purple-400/20 animate-pulse delay-1000" />
                      </div>
                      <h2 className="text-xl font-semibold text-foreground/60 mb-2">
                        Esplora il tuo universo di note
                      </h2>
                      <p className="text-sm text-muted-foreground/50 max-w-md mx-auto mb-8">
                        Cerca tra le tue note, chiedi all&apos;AI, o naviga il grafo per scoprire collegamenti nascosti
                      </p>
                      <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto">
                        <div className="glass-card rounded-xl p-4 text-center">
                          <p className="text-2xl font-bold text-primary/50">{filteredNotes.length}</p>
                          <p className="text-xs text-muted-foreground/50 mt-1">Note</p>
                        </div>
                        <div className="glass-card rounded-xl p-4 text-center">
                          <p className="text-2xl font-bold text-primary/50">{selectedCategory ? 1 : categories.length}</p>
                          <p className="text-xs text-muted-foreground/50 mt-1">Categorie</p>
                        </div>
                        <div className="glass-card rounded-xl p-4 text-center">
                          <p className="text-2xl font-bold text-primary/50">
                            {filteredNotes.reduce((sum, n) => sum + n.links.length, 0)}
                          </p>
                          <p className="text-xs text-muted-foreground/50 mt-1">Collegamenti</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-6 mt-8 text-xs text-muted-foreground/30">
                        <span className="flex items-center gap-1.5">
                          <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">/</kbd>
                          Apri ricerca
                        </span>
                        <span className="flex items-center gap-1.5">
                          <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">Tab</kbd>
                          nella ricerca: cambia modalit&agrave;
                        </span>
                        <span className="flex items-center gap-1.5">
                          <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">Esc</kbd>
                          Chiudi scheda
                        </span>
                        <span className="flex items-center gap-1.5">
                          <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">↑↓</kbd>
                          Naviga risultati
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="stats" className="flex-1 min-h-0 mt-0">
              <ScrollArea className="h-full">
                <div className="px-6 py-4 max-w-4xl mx-auto">
                  <Statistics notes={filteredNotes} onNoteClick={handleNoteClick} />
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <NoteSheet
        note={selectedNote}
        open={sheetOpen}
        onOpenChange={handleSheetClose}
        noteHistory={noteHistory}
        onBreadcrumbClick={handleBreadcrumbClick}
        onLinkClick={handleLinkClick}
        relatedNotes={relatedNotes}
        highlightQuery={searchQuery}
      />

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onRebuild={handleRebuild}
      />

      <footer className="absolute bottom-0 left-0 right-0 z-10 py-2 text-center">
        <p className="text-xs text-muted-foreground/40">
          &copy; 2026, All rights reserved &mdash;{" "}
          <a
            href="https://rosmoscato.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground/60 hover:text-primary transition-colors underline underline-offset-2"
          >
            Rosario Moscato
          </a>
        </p>
      </footer>
    </div>
  );
}
