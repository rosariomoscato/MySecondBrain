import notesData from "@/data/notes.json";
import { Note } from "./types";

let notesCache: Note[] | null = null;

export function loadNotes(): Note[] {
  if (!notesCache) {
    notesCache = notesData as Note[];
  }
  return notesCache;
}

export function getNoteById(id: string): Note | undefined {
  return loadNotes().find((n) => n.id === id);
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

export function getRelatedNotes(note: Note, limit = 5): Note[] {
  const notes = loadNotes();
  const scores = new Map<string, number>();

  for (const other of notes) {
    if (other.id === note.id) continue;

    let score = 0;

    // Backlinks: other notes that link TO this note (strongest signal)
    for (const link of other.links) {
      const linkTitle = extractLinkTitle(link);
      if (titlesMatch(linkTitle, note.title)) {
        score += 3;
      }
    }

    // Forward links: this note links TO other notes
    for (const link of note.links) {
      const linkTitle = extractLinkTitle(link);
      if (titlesMatch(linkTitle, other.title)) {
        score += 3;
      }
    }

    // Shared links: both notes link to the same targets
    for (const linkA of note.links) {
      for (const linkB of other.links) {
        if (linkA === linkB) {
          score += 2;
          break;
        }
      }
    }

    // Same category (weaker signal)
    if (other.category === note.category) {
      score += 1;
    }

    if (score > 0) {
      scores.set(other.id, score);
    }
  }

  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => notes.find((n) => n.id === id)!)
    .filter(Boolean);
}

export function getCategories(): { name: string; count: number; color: string }[] {
  const notes = loadNotes();
  const catMap = new Map<string, { count: number; color: string }>();
  for (const n of notes) {
    const existing = catMap.get(n.category);
    if (existing) {
      existing.count++;
    } else {
      catMap.set(n.category, { count: 1, color: n.categoryColor });
    }
  }
  return Array.from(catMap.entries()).map(([name, data]) => ({
    name,
    count: data.count,
    color: data.color,
  }));
}
