"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, Sparkles, FileText, Clock, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchMode } from "@/lib/types";

interface SearchBarProps {
  onSearch: (query: string, mode: SearchMode) => void;
  isLoading: boolean;
  value: string;
  onChange: (value: string) => void;
  searchHistory: string[];
  onAddHistory: (query: string) => void;
  onRemoveHistory: (query: string) => void;
  onClearHistory: () => void;
}

export function SearchBar({ onSearch, isLoading, value, onChange, searchHistory, onAddHistory, onRemoveHistory, onClearHistory }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<SearchMode>("text");
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Tab" && document.activeElement?.getAttribute("data-search-input") !== null && !value) {
        e.preventDefault();
        setMode((m) => (m === "text" ? "rag" : "text"));
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [value]);

  useEffect(() => {
    if (!showHistory) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setShowHistory(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showHistory]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (value.trim()) {
        onAddHistory(value.trim());
        onSearch(value.trim(), mode);
        setShowHistory(false);
      }
    },
    [value, mode, onSearch, onAddHistory]
  );

  const handleHistorySelect = useCallback(
    (query: string) => {
      onChange(query);
      onSearch(query, mode);
      onAddHistory(query);
      setShowHistory(false);
      inputRef.current?.blur();
    },
    [mode, onChange, onSearch, onAddHistory]
  );

  const filteredHistory = value.trim()
    ? searchHistory.filter((q) => q.toLowerCase().includes(value.toLowerCase()))
    : searchHistory;

  const showDropdown = showHistory && filteredHistory.length > 0 && !isLoading;

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3 w-full max-w-3xl mx-auto">
      <div className="relative flex-1 search-glow rounded-xl transition-all duration-300" ref={wrapperRef}>
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
        <Input
          ref={inputRef}
          data-search-input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setShowHistory(true)}
          placeholder={
            mode === "text"
              ? "Cerca nelle tue note..."
              : "Chiedi alle tue note..."
          }
          className="pl-11 h-12 text-base bg-background/60 border-border rounded-xl placeholder:text-muted-foreground/50 transition-all duration-300"
        />

        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl border border-border/40 bg-popover/95 backdrop-blur-xl shadow-xl animate-in fade-in-0 zoom-in-95 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/20">
              <span className="text-[11px] font-medium text-muted-foreground/50 flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                Ricerche recenti
              </span>
              <button
                onClick={() => { onClearHistory(); setShowHistory(false); }}
                className="text-[11px] text-muted-foreground/40 hover:text-destructive transition-colors flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                Cancella tutto
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {filteredHistory.slice(0, 10).map((query) => (
                <div
                  key={query}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-accent transition-colors group cursor-pointer"
                  onClick={() => handleHistorySelect(query)}
                >
                  <Clock className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                  <span className="text-sm text-popover-foreground truncate flex-1">{query}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveHistory(query); }}
                    className="opacity-0 group-hover:opacity-100 h-5 w-5 inline-flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive transition-all shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setMode("text")}
        className={`h-12 w-12 shrink-0 inline-flex items-center justify-center rounded-xl border transition-all duration-300 ${
          mode === "text"
            ? "bg-primary/15 border-primary/30 text-primary shadow-sm dark:shadow-lg dark:shadow-primary/20"
            : "bg-background/40 border-border text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
        title="Ricerca testuale"
      >
        <FileText className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={() => setMode("rag")}
        className={`h-12 w-12 shrink-0 inline-flex items-center justify-center rounded-xl border transition-all duration-300 ${
          mode === "rag"
            ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-600 dark:text-cyan-300 shadow-sm dark:shadow-lg dark:shadow-cyan-500/20"
            : "bg-background/40 border-border text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
        title="Chiedi all'AI"
      >
        <Sparkles className="h-5 w-5" />
      </button>

      <Button
        type="submit"
        disabled={isLoading || !value.trim()}
        className="h-12 px-6 shrink-0 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white border-0 rounded-xl shadow-md dark:shadow-lg dark:shadow-indigo-500/25 transition-all duration-300 disabled:opacity-40"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {mode === "rag" ? "Penso..." : "Cercando..."}
          </span>
        ) : mode === "rag" ? (
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Chiedi
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Cerca
          </span>
        )}
      </Button>
    </form>
  );
}
