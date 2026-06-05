"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { SearchResult } from "@/lib/types";
import { FileText } from "lucide-react";

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  onNoteClick: (noteId: string) => void;
  focusedIndex?: number;
}

export function SearchResults({ results, query, onNoteClick, focusedIndex = -1 }: SearchResultsProps) {
  const refs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (focusedIndex >= 0) {
      refs.current.get(focusedIndex)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [focusedIndex]);

  if (results.length === 0) return null;

  return (
    <motion.div
      key={query}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <p className="text-sm text-muted-foreground">
        Trovati <strong className="text-foreground">{results.length}</strong> risultati per &quot;{query}&quot;
      </p>
      {results.map((result, idx) => (
        <div
          key={result.item.id}
          ref={(el) => { if (el) refs.current.set(idx, el); }}
          className={`glass-card rounded-xl p-5 cursor-pointer group transition-all duration-200 ${
            idx === focusedIndex ? "ring-2 ring-primary/50 bg-primary/10" : ""
          }`}
          onClick={() => onNoteClick(result.item.id)}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-muted group-hover:bg-accent transition-colors">
                <FileText className="h-4 w-4 text-primary/60" />
              </div>
              <h3 className="font-medium text-foreground">
                {result.item.title}
              </h3>
            </div>
            <span
              className="shrink-0 text-xs px-2.5 py-1 rounded-full border"
              style={{
                borderColor: `${result.item.categoryColor}50`,
                color: result.item.categoryColor,
                backgroundColor: `${result.item.categoryColor}10`,
              }}
            >
              #{result.item.category.replace(/_/g, " ")}
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed ml-[42px]">
            {highlightSnippet(result.snippet, query)}
          </p>
          {result.item.links.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 ml-[42px]">
              {result.item.links.slice(0, 5).map((link, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground border"
                >
                  {link}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </motion.div>
  );
}

function highlightSnippet(snippet: string, query: string) {
  if (!query) return snippet;
  const parts = snippet.split(new RegExp(`(${escapeRegExp(query)})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <span key={i} className="source-highlight">{part}</span>
    ) : (
      part
    )
  );
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
