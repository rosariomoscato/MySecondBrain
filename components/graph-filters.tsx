"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, SlidersHorizontal, Link2, Paperclip, Calendar } from "lucide-react";

export interface GraphFiltersState {
  minLinks: number;
  hasAttachments: "all" | "yes" | "no";
  hasExternalLinks: "all" | "yes" | "no";
}

interface GraphFiltersProps {
  active: GraphFiltersState;
  onChange: (filters: GraphFiltersState) => void;
  maxLinks: number;
}

const DEFAULT_FILTERS: GraphFiltersState = {
  minLinks: 0,
  hasAttachments: "all",
  hasExternalLinks: "all",
};

export { DEFAULT_FILTERS };

export function GraphFilters({ active, onChange, maxLinks }: GraphFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const isDefault =
    active.minLinks === DEFAULT_FILTERS.minLinks &&
    active.hasAttachments === DEFAULT_FILTERS.hasAttachments &&
    active.hasExternalLinks === DEFAULT_FILTERS.hasExternalLinks;

  const activeCount = [
    active.minLinks > 0,
    active.hasAttachments !== "all",
    active.hasExternalLinks !== "all",
  ].filter(Boolean).length;

  const reset = () => onChange(DEFAULT_FILTERS);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className={`h-8 gap-1.5 text-xs ${!isDefault ? "border-indigo-500/50 text-indigo-400 bg-indigo-500/10" : ""}`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtri
          {activeCount > 0 && (
            <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">
              {activeCount}
            </Badge>
          )}
        </Button>
        {!isDefault && (
          <button
            onClick={reset}
            className="text-[10px] text-muted-foreground/50 hover:text-foreground transition-colors flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 w-72 rounded-xl border border-border/50 bg-popover/95 backdrop-blur-xl shadow-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Filtri grafo</span>
            <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Link2 className="h-3 w-3" />
              Collegamenti minimi: {active.minLinks}
            </label>
            <input
              type="range"
              min={0}
              max={maxLinks}
              value={active.minLinks}
              onChange={(e) => onChange({ ...active, minLinks: Number(e.target.value) })}
              className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground/50">
              <span>0</span>
              <span>{maxLinks}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Paperclip className="h-3 w-3" />
              Allegati
            </label>
            <div className="flex gap-1.5">
              {[
                { value: "all" as const, label: "Tutti" },
                { value: "yes" as const, label: "Con" },
                { value: "no" as const, label: "Senza" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onChange({ ...active, hasAttachments: opt.value })}
                  className={`flex-1 text-[11px] px-2 py-1.5 rounded-lg border transition-all ${
                    active.hasAttachments === opt.value
                      ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-400"
                      : "border-border/50 bg-background/40 text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              Link esterni
            </label>
            <div className="flex gap-1.5">
              {[
                { value: "all" as const, label: "Tutti" },
                { value: "yes" as const, label: "Con" },
                { value: "no" as const, label: "Senza" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onChange({ ...active, hasExternalLinks: opt.value })}
                  className={`flex-1 text-[11px] px-2 py-1.5 rounded-lg border transition-all ${
                    active.hasExternalLinks === opt.value
                      ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-400"
                      : "border-border/50 bg-background/40 text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
