"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Note, CATEGORY_COLORS } from "@/lib/types";
import { BarChart3, BookOpen, Link2, Calendar, FileText, Paperclip, TrendingUp } from "lucide-react";

interface StatisticsProps {
  notes: Note[];
  onNoteClick: (noteId: string) => void;
}

const normalize = (s: string) => s.toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ").trim();

function extractLinkTitle(link: string): string {
  let title = link;
  if (title.startsWith("#")) {
    const pipeIdx = title.indexOf(" | ");
    if (pipeIdx >= 0) {
      title = title.substring(pipeIdx + 3);
    } else {
      title = title.substring(1);
    }
  }
  return title.replace(/\\_/g, "_");
}

function titlesMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

export function Statistics({ notes, onNoteClick }: StatisticsProps) {
  const stats = useMemo(() => {
    const categoryMap = new Map<string, { count: number; color: string }>();
    for (const n of notes) {
      const existing = categoryMap.get(n.category);
      if (existing) {
        existing.count++;
      } else {
        categoryMap.set(n.category, { count: n.links.length > 0 ? 1 : 1, color: n.categoryColor });
      }
    }
    const categories = Array.from(categoryMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);
    const maxCatCount = Math.max(...categories.map((c) => c.count), 1);

    const backlinkMap = new Map<string, number>();
    for (const note of notes) {
      for (const link of note.links) {
        const linkTitle = extractLinkTitle(link);
        for (const other of notes) {
          if (other.id !== note.id && titlesMatch(linkTitle, other.title)) {
            backlinkMap.set(other.id, (backlinkMap.get(other.id) || 0) + 1);
          }
        }
      }
    }
    const mostLinked = Array.from(backlinkMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id, count]) => {
        const n = notes.find((x) => x.id === id)!;
        return { id, title: n.title, category: n.category, categoryColor: n.categoryColor, count };
      })
      .filter((x) => x);
    const maxLinkCount = Math.max(...mostLinked.map((m) => m.count), 1);

    const dateMap = new Map<string, number>();
    for (const n of notes) {
      const raw = n.created || n.date;
      if (raw) {
        const day = raw.substring(0, 10);
        dateMap.set(day, (dateMap.get(day) || 0) + 1);
      }
    }
    const timeline = Array.from(dateMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));
    const maxDateCount = Math.max(...timeline.map((t) => t.count), 1);

    const totalLinks = notes.reduce((s, n) => s + n.links.length, 0);
    const totalAttachments = notes.reduce((s, n) => s + n.attachments.length, 0);
    const totalContent = notes.reduce((s, n) => s + n.content.length, 0);
    const avgContent = Math.round(totalContent / (notes.length || 1));

    return {
      categories,
      maxCatCount,
      mostLinked,
      maxLinkCount,
      timeline,
      maxDateCount,
      totalLinks,
      totalAttachments,
      totalContent,
      avgContent,
    };
  }, [notes]);

  const card = (icon: React.ReactNode, label: string, value: string | number) => (
    <div className="glass-card rounded-xl p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground/60">{label}</p>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {card(<BookOpen className="h-5 w-5 text-primary/60" />, "Note totali", notes.length)}
        {card(<BarChart3 className="h-5 w-5 text-primary/60" />, "Categorie", stats.categories.length)}
        {card(<Link2 className="h-5 w-5 text-primary/60" />, "Collegamenti", stats.totalLinks)}
        {card(<Paperclip className="h-5 w-5 text-primary/60" />, "Allegati", stats.totalAttachments)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-medium text-foreground/70 mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary/50" />
            Note per categoria
          </h3>
          <div className="space-y-3">
            {stats.categories.map((cat) => (
              <div key={cat.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.name.replace(/_/g, " ")}
                  </span>
                  <span className="text-foreground font-medium">{cat.count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(cat.count / stats.maxCatCount) * 100}%`,
                      backgroundColor: cat.color,
                      opacity: 0.7,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-medium text-foreground/70 mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary/50" />
            Note più collegate
          </h3>
          <div className="space-y-2">
            {stats.mostLinked.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => onNoteClick(item.id)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left group"
              >
                <span className="text-xs text-muted-foreground/40 w-5 text-right shrink-0 font-mono">
                  {idx + 1}
                </span>
                <div
                  className="h-1.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: item.categoryColor,
                    width: `${Math.max(12, (item.count / stats.maxLinkCount) * 80)}px`,
                    opacity: 0.6,
                  }}
                />
                <span className="text-xs text-foreground/70 group-hover:text-foreground truncate flex-1">
                  {item.title}
                </span>
                <span className="text-xs text-muted-foreground/50 shrink-0">{item.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-medium text-foreground/70 mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary/50" />
          Timeline creazione note
        </h3>
        <div className="flex items-end gap-1 h-32 overflow-x-auto pb-1">
          {stats.timeline.map((t) => {
            const height = Math.max(8, (t.count / stats.maxDateCount) * 100);
            const d = new Date(t.date);
            const label = d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
            return (
              <div key={t.date} className="flex flex-col items-center gap-1 shrink-0 min-w-[28px]">
                <span className="text-[10px] text-muted-foreground/50">{t.count}</span>
                <div
                  className="w-4 rounded-t-sm transition-all duration-500"
                  style={{
                    height: `${height}%`,
                    backgroundColor: "var(--color-primary, #6366f1)",
                    opacity: 0.5,
                  }}
                  title={`${label}: ${t.count} note`}
                />
                <span className="text-[9px] text-muted-foreground/30 whitespace-nowrap">{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-card rounded-xl p-4 flex items-center gap-4 text-xs text-muted-foreground/40">
        <FileText className="h-4 w-4 shrink-0" />
        <span>Contenuto medio: {stats.avgContent.toLocaleString("it-IT")} caratteri per nota</span>
        <span className="text-muted-foreground/20">|</span>
        <span>Totale: {(stats.totalContent / 1024).toFixed(0)} KB di testo</span>
      </div>
    </motion.div>
  );
}
