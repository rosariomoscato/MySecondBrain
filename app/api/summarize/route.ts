import { NextRequest } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { getSettings } from "@/lib/settings";

const SYSTEM_PROMPT = `Sei un assistente esperto che riassume le note dell'utente.
Regole:
1. Rispondi sempre in italiano
2. Produci un riassunto conciso ma completo della nota fornita
3. Evidenzia i punti chiave e i concetti principali
4. Usa elenchi puntati se la nota tratta argomenti diversi
5. Mantieni un tono informativo e accessibile
6. Il riassunto deve essere lungo al massimo 5-6 righe`;

function createModel() {
  const settings = getSettings();
  const llmProvider = settings.ai.provider || process.env.LLM_PROVIDER || "ollama";

  if (llmProvider === "openai") {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai.chat(process.env.OPENAI_MODEL || "gpt-4o-mini");
  } else if (llmProvider === "openrouter") {
    const openrouter = createOpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: settings.ai.openrouterApiKey || process.env.OPENROUTER_API_KEY,
    });
    return openrouter.chat(settings.ai.openrouterModel || process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat-v3-0324:free");
  } else {
    const ollamaBase = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    const ollama = createOpenAI({ baseURL: `${ollamaBase}/v1`, apiKey: "ollama" });
    return ollama.chat(process.env.OLLAMA_MODEL || "llama3.2");
  }
}

export async function POST(request: NextRequest) {
  const { title, content, category } = await request.json() as {
    title: string;
    content: string;
    category: string;
  };

  if (!content || typeof content !== "string") {
    return new Response(JSON.stringify({ error: "Content is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const ai = await import("ai");
    const model = createModel();
    const encoder = new TextEncoder();

    const result = await ai.generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt: `Titolo: ${title}\nCategoria: ${category.replace(/_/g, " ")}\n\nContenuto della nota:\n${content}`,
    });

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ text: result.text })}\n\n`)
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
      JSON.stringify({ error: `Errore LLM: ${errMsg}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
