import * as fs from "fs";
import * as path from "path";
import { loadNotes } from "./notes-loader";
import { Note } from "./types";
import { getSettings } from "./settings";

const EMBEDDINGS_PATH = path.join(process.cwd(), "data", "embeddings.json");
const EMBED_MODEL = "openai/text-embedding-3-small";

interface EmbeddingEntry {
  id: string;
  embedding: number[];
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
}

export function loadEmbeddings(): Map<string, number[]> {
  if (!fs.existsSync(EMBEDDINGS_PATH)) return new Map();
  try {
    const raw = fs.readFileSync(EMBEDDINGS_PATH, "utf-8");
    const entries: EmbeddingEntry[] = JSON.parse(raw);
    return new Map(entries.map((e) => [e.id, e.embedding]));
  } catch {
    return new Map();
  }
}

function saveEmbeddings(embeddings: Map<string, number[]>): void {
  const entries: EmbeddingEntry[] = [...embeddings.entries()].map(([id, embedding]) => ({ id, embedding }));
  const dir = path.dirname(EMBEDDINGS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(EMBEDDINGS_PATH, JSON.stringify(entries), "utf-8");
}

async function getEmbeddingsFromAPI(texts: string[], apiKey: string): Promise<number[][]> {
  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: texts,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Embedding API error ${res.status}: ${err}`);
  }

  const data = await res.json() as { data: { embedding: number[] }[] };
  return data.data.map((d) => d.embedding);
}

export async function generateEmbeddings(): Promise<{ total: number; generated: number }> {
  const settings = getSettings();
  const apiKey = settings.ai.openrouterApiKey || process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("API key non configurata");

  const notes = loadNotes();
  const existing = loadEmbeddings();

  const toGenerate = notes.filter((n) => !existing.has(n.id));
  if (toGenerate.length === 0) return { total: notes.length, generated: 0 };

  const BATCH_SIZE = 20;
  let generated = 0;

  for (let i = 0; i < toGenerate.length; i += BATCH_SIZE) {
    const batch = toGenerate.slice(i, i + BATCH_SIZE);
    const texts = batch.map((n) => {
      const content = n.content.slice(0, 800);
      return `${n.title}\n${content}`;
    });

    const embeddings = await getEmbeddingsFromAPI(texts, apiKey);

    for (let j = 0; j < batch.length; j++) {
      existing.set(batch[j].id, embeddings[j]);
    }

    generated += batch.length;
  }

  saveEmbeddings(existing);
  return { total: notes.length, generated };
}

export async function searchSemantic(query: string, limit = 10, category?: string): Promise<{ id: string; score: number }[]> {
  const settings = getSettings();
  const apiKey = settings.ai.openrouterApiKey || process.env.OPENROUTER_API_KEY;
  if (!apiKey) return [];

  const [queryEmbedding] = await getEmbeddingsFromAPI([query], apiKey);
  const stored = loadEmbeddings();

  let notes = loadNotes();
  if (category) {
    notes = notes.filter((n) => n.category === category);
  }

  const scored: { id: string; score: number }[] = [];
  for (const note of notes) {
    const embedding = stored.get(note.id);
    if (!embedding) continue;
    const score = cosineSimilarity(queryEmbedding, embedding);
    scored.push({ id: note.id, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
