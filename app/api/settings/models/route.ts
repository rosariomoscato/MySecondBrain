import { NextRequest, NextResponse } from "next/server";

interface OpenRouterModel {
  id: string;
  name: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
}

export async function GET(request: NextRequest) {
  const apiKey = request.nextUrl.searchParams.get("apiKey");

  if (!apiKey) {
    return NextResponse.json({ valid: false, error: "API Key mancante" }, { status: 400 });
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return NextResponse.json({ valid: false, error: "Chiave API non valida" });
      }
      return NextResponse.json({ valid: false, error: `Errore OpenRouter: ${res.status}` });
    }

    const data = await res.json() as { data: OpenRouterModel[] };

    const models = (data.data || [])
      .map((m) => {
        const promptPrice = parseFloat(m.pricing?.prompt || "0");
        const completionPrice = parseFloat(m.pricing?.completion || "0");
        const isFree = promptPrice === 0 && completionPrice === 0;

        return {
          id: m.id,
          name: m.name || m.id,
          context_length: m.context_length || 0,
          isFree,
        };
      })
      .sort((a, b) => {
        if (a.isFree && !b.isFree) return -1;
        if (!a.isFree && b.isFree) return 1;
        return a.name.localeCompare(b.name);
      });

    return NextResponse.json({ valid: true, models });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Errore di connessione";
    return NextResponse.json({ valid: false, error: msg });
  }
}
