import { NextRequest, NextResponse } from "next/server";
import { generateEmbeddings, searchSemantic } from "@/lib/embeddings";
import { loadNotes } from "@/lib/notes-loader";

export async function POST(request: NextRequest) {
  const body = await request.json() as { action?: string; query?: string; category?: string };

  if (body.action === "generate") {
    try {
      const result = await generateEmbeddings();
      return NextResponse.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  if (body.action === "search" && body.query) {
    try {
      const results = await searchSemantic(body.query, 10, body.category);
      const notes = loadNotes();
      const noteMap = new Map(notes.map((n) => [n.id, n]));

      const searchResults = results
        .map((r) => {
          const note = noteMap.get(r.id);
          if (!note) return null;
          const queryLower = body.query!.toLowerCase();
          const idx = note.content.toLowerCase().indexOf(queryLower);
          const start = Math.max(0, idx - 100);
          const end = Math.min(note.content.length, idx + body.query!.length + 200);
          const snippet =
            (start > 0 ? "..." : "") +
            note.content.slice(start, end) +
            (end < note.content.length ? "..." : "");
          return { item: note, score: r.score, snippet };
        })
        .filter(Boolean);

      return NextResponse.json({ results: searchResults });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  const notes = loadNotes();
  const { loadEmbeddings } = await import("@/lib/embeddings");
  const stored = loadEmbeddings();
  const embeddedCount = notes.filter((n) => stored.has(n.id)).length;

  return NextResponse.json({
    totalNotes: notes.length,
    embeddedNotes: embeddedCount,
    needsGeneration: embeddedCount < notes.length,
  });
}
