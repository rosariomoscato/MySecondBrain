"use client";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Hash, Sparkles } from "lucide-react";

interface SidebarNavProps {
  categories: { name: string; count: number; color: string }[];
  totalNotes: number;
  selectedCategory: string | null;
  onCategoryClick: (category: string | null) => void;
}

export function SidebarNav({
  categories,
  totalNotes,
  selectedCategory,
  onCategoryClick,
}: SidebarNavProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Sparkles className="h-5 w-5 text-primary dark:text-indigo-400" />
            <div className="absolute inset-0 blur-md bg-primary/30 dark:bg-indigo-400/30" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">{totalNotes} note</span>
        </div>
      </div>

      <Separator className="opacity-50" />

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-1">
          <button
            onClick={() => onCategoryClick(null)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
              selectedCategory === null
                ? "bg-primary/15 text-foreground shadow-sm dark:shadow-lg dark:shadow-primary/10"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Hash className="h-4 w-4 shrink-0" />
            <span>Tutte</span>
            <Badge variant="secondary" className="ml-auto text-xs">
              {totalNotes}
            </Badge>
          </button>

          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => onCategoryClick(cat.name)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${
                selectedCategory === cat.name
                  ? "text-foreground shadow-sm dark:shadow-lg"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
              style={
                selectedCategory === cat.name
                  ? { backgroundColor: `${cat.color}18`, boxShadow: selectedCategory === cat.name ? `0 0 12px ${cat.color}10` : undefined }
                  : {}
              }
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0 transition-shadow duration-200"
                style={{
                  backgroundColor: cat.color,
                  boxShadow: selectedCategory === cat.name ? `0 0 6px ${cat.color}80` : "none",
                }}
              />
              <span className="truncate">{cat.name.replace(/_/g, " ")}</span>
              <Badge
                variant="secondary"
                className="ml-auto text-xs"
              >
                {cat.count}
              </Badge>
            </button>
          ))}
        </div>
      </ScrollArea>

      <Separator className="opacity-50" />
      <div className="p-5">
        <div className="flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground/40">
            {process.env.NEXT_PUBLIC_APP_NAME || "Knowledge Explorer"}
          </p>
        </div>
      </div>
    </div>
  );
}
