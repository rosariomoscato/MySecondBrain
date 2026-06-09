import Fuse from "fuse.js";
import { Note, SearchResult } from "./types";
import { loadNotes } from "./notes-loader";

const FUSE_CONFIG_BASE = {
  keys: [
    { name: "title", weight: 2 },
    { name: "category", weight: 1 },
    { name: "content", weight: 1 },
    { name: "links", weight: 1.5 },
    { name: "tags", weight: 2 },
  ],
  includeScore: true,
  minMatchCharLength: 2,
  ignoreLocation: true,
};

let fuseCache: { notesLen: number; instance: Fuse<Note> } | null = null;
let fuseRagCache: { notesLen: number; instance: Fuse<Note> } | null = null;

function getFuse(): Fuse<Note> {
  const notes = loadNotes();
  if (!fuseCache || fuseCache.notesLen !== notes.length) {
    fuseCache = {
      notesLen: notes.length,
      instance: new Fuse(notes, { ...FUSE_CONFIG_BASE, threshold: 0.35, includeMatches: true }),
    };
  }
  return fuseCache.instance;
}

function getFuseRag(): Fuse<Note> {
  const notes = loadNotes();
  if (!fuseRagCache || fuseRagCache.notesLen !== notes.length) {
    fuseRagCache = {
      notesLen: notes.length,
      instance: new Fuse(notes, { ...FUSE_CONFIG_BASE, threshold: 1.0 }),
    };
  }
  return fuseRagCache.instance;
}

export function searchNotes(query: string, limit = 10, category?: string): SearchResult[] {
  if (!query || query.trim().length < 2) return [];
  const fuse = getFuse();
  let results = fuse.search(query, { limit });

  if (category) {
    results = results.filter((r) => r.item.category === category);
  }

  return results.map((r) => {
    const content = r.item.content;
    const queryLower = query.toLowerCase();
    const idx = content.toLowerCase().indexOf(queryLower);
    const start = Math.max(0, idx - 100);
    const end = Math.min(content.length, idx + query.length + 200);
    const snippet =
      (start > 0 ? "..." : "") +
      content.slice(start, end) +
      (end < content.length ? "..." : "");

    return {
      item: r.item,
      score: r.score ?? 1,
      snippet,
    };
  });
}

export function searchByTag(tag: string, limit = 20): SearchResult[] {
  if (!tag || tag.trim().length < 2) return [];
  const notes = loadNotes();
  const tagLower = tag.toLowerCase().trim();

  return notes
    .filter((note) => {
      const tagMatch = note.tags?.some((t) => t.toLowerCase().includes(tagLower));
      const contentMatch = note.content.toLowerCase().includes(tagLower);
      const titleMatch = note.title.toLowerCase().includes(tagLower);
      return tagMatch || (titleMatch && contentMatch);
    })
    .slice(0, limit)
    .map((note) => {
      const idx = note.content.toLowerCase().indexOf(tagLower);
      const start = Math.max(0, idx - 100);
      const end = Math.min(note.content.length, idx + tag.length + 200);
      const snippet =
        (start > 0 ? "..." : "") +
        note.content.slice(start, end) +
        (end < note.content.length ? "..." : "");
      return { item: note, score: 0, snippet };
    });
}

export function getAllTags(): { tag: string; count: number }[] {
  const notes = loadNotes();
  const tagMap = new Map<string, number>();
  for (const note of notes) {
    for (const tag of note.tags || []) {
      const key = tag.toLowerCase();
      tagMap.set(key, (tagMap.get(key) || 0) + 1);
    }
  }
  return [...tagMap.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

export function getRelevantNotes(query: string, limit = 8, category?: string): Note[] {
  if (!query || query.trim().length < 2) return [];
  const notes = loadNotes();
  const queryLower = query.toLowerCase();
  const words = queryLower.split(/\s+/).filter((w) => w.length >= 3);

  const exactMatches = new Set<string>();
  for (const note of notes) {
    if (category && note.category !== category) continue;
    const text = `${note.title} ${note.content}`.toLowerCase();
    let matchCount = 0;
    for (const word of words) {
      if (text.includes(word)) matchCount++;
    }
    if (matchCount >= Math.max(1, words.length - 1)) {
      exactMatches.add(note.id);
    }
  }

  const fuse = getFuseRag();
  let results = fuse.search(query, { limit: limit * 3 });

  if (category) {
    results = results.filter((r) => r.item.category === category);
  }

  const seen = new Set<string>();
  const ordered: Note[] = [];

  for (const id of exactMatches) {
    const note = notes.find((n) => n.id === id);
    if (note && !seen.has(id)) {
      seen.add(id);
      ordered.push(note);
    }
  }

  for (const r of results) {
    if (!seen.has(r.item.id)) {
      seen.add(r.item.id);
      ordered.push(r.item);
    }
  }

  return ordered.slice(0, limit);
}
