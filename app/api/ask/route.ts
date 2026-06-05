import { NextRequest } from "next/server";
import { getRelevantNotes } from "@/lib/search-engine";
import { Note } from "@/lib/types";
import { createOpenAI } from "@ai-sdk/openai";
import { getSettings } from "@/lib/settings";

const SYSTEM_PROMPT = `Sei un assistente esperto che risponde alle domande dell'utente basandosi ESCLUSIVAMENTE sulle note fornite.
Regole:
1. Rispondi sempre in italiano
2. Per ogni affermazione, cita la nota fonte racchiudendo il titolo tra asterischi, es: *Brege storia della AI*
3. Se le note non contengono informazioni sufficienti, dillo chiaramente
4. Non inventare informazioni non presenti nelle note
5. Usa un tono informativo ma accessibile
6. Se l'utente fa una domanda di follow-up, usa il contesto della conversazione precedente per dare risposte coerenti`;

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  const { question, category, history } = await request.json() as {
    question: string;
    category?: string;
    history?: HistoryMessage[];
  };

  if (!question || typeof question !== "string") {
    return new Response(JSON.stringify({ error: "Question is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const relevantNotes: Note[] = getRelevantNotes(question, 8, category);

  if (relevantNotes.length === 0) {
    return new Response(
      JSON.stringify({
        error: "Nessuna nota rilevante trovata per questa domanda.",
      }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const context = relevantNotes
    .map(
      (n) =>
        `--- NOTA: ${n.title} (Categoria: ${n.category}) ---\n${n.content}`
    )
    .join("\n\n");

  const settings = getSettings();
  const llmProvider = settings.ai.provider || process.env.LLM_PROVIDER || "ollama";

  try {
    let model;

    if (llmProvider === "openai") {
      const openai = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      model = openai.chat(process.env.OPENAI_MODEL || "gpt-4o-mini");
    } else if (llmProvider === "openrouter") {
      const openrouter = createOpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: settings.ai.openrouterApiKey || process.env.OPENROUTER_API_KEY,
      });
      model = openrouter.chat(settings.ai.openrouterModel || process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat-v3-0324:free");
    } else {
      const ollamaBase = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
      const ollaiOpenAI = createOpenAI({
        baseURL: `${ollamaBase}/v1`,
        apiKey: "ollama",
      });
      model = ollaiOpenAI.chat(process.env.OLLAMA_MODEL || "llama3.2");
    }

    const ai = await import("ai");

    const encoder = new TextEncoder();
    const sourceIds = relevantNotes.map((n) => n.id).join(",");

    const messages: HistoryMessage[] = [];

    if (history && history.length > 0) {
      for (const msg of history) {
        messages.push(msg);
      }
    }

    messages.push({
      role: "user",
      content: `Contesto dalle note dell'utente:\n\n${context}\n\nDomanda: ${question}`,
    });

    try {
      const result = await ai.generateText({
        model,
        system: SYSTEM_PROMPT,
        messages,
      });

      const fullText = result.text;

      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ sources: sourceIds })}\n\n`)
          );
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: fullText })}\n\n`)
          );
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
          );
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      return new Response(
        JSON.stringify({
          error: `Errore LLM: ${errMsg}`,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({
        error: `Errore nella generazione della risposta: ${errMsg}. Verifica che Ollama sia in esecuzione (ollama serve) o configura OPENAI_API_KEY nel .env.`,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
