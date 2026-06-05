export interface Note {
  id: string;
  title: string;
  category: string;
  categoryColor: string;
  content: string;
  filePath: string;
  links: string[];
  attachments: string[];
  date: string;
  created: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sourceIds?: string[];
  isStreaming?: boolean;
}

export type SearchMode = "text" | "rag";

export interface SearchResult {
  item: Note;
  score: number;
  snippet: string;
}

export interface GraphNode {
  id: string;
  label: string;
  group: string;
  isFolder: boolean;
}

export interface GraphEdge {
  from: string;
  to: string;
  dashes?: boolean;
  title?: string;
}

export const CATEGORY_COLORS: Record<string, string> = {
  AI_Ethics: "#e74c3c",
  Claude_Code: "#f39c12",
  Estratti: "#2ecc71",
  Intelligenza_Artificiale: "#3498db",
  PROMPTING: "#9b59b6",
  Riflessioni: "#1abc9c",
  Immagini_Foto: "#95a5a6",
};

export function extractCategory(fileName: string): string {
  const match = fileName.match(/^#([^ ]+)/);
  return match ? match[1] : "Unknown";
}
