import { NextResponse } from "next/server";
import { getSettings, saveSettings, maskApiKey } from "@/lib/settings";
import type { AppSettings } from "@/lib/settings";

export async function GET() {
  try {
    const settings = getSettings();
    return NextResponse.json({
      notes: settings.notes,
      ai: {
        provider: settings.ai.provider,
        openrouterApiKey: maskApiKey(settings.ai.openrouterApiKey),
        openrouterApiKeyFull: settings.ai.openrouterApiKey,
        openrouterModel: settings.ai.openrouterModel,
      },
    });
  } catch {
    return NextResponse.json({ error: "Errore nel caricamento impostazioni" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json() as {
      notes?: Partial<AppSettings["notes"]>;
      ai?: Partial<AppSettings["ai"]>;
    };

    const current = getSettings();

    if (body.notes) {
      current.notes = { ...current.notes, ...body.notes };
    }

    if (body.ai) {
      if (body.ai.provider !== undefined) current.ai.provider = body.ai.provider;
      if (body.ai.openrouterApiKey !== undefined) current.ai.openrouterApiKey = body.ai.openrouterApiKey;
      if (body.ai.openrouterModel !== undefined) current.ai.openrouterModel = body.ai.openrouterModel;
    }

    saveSettings(current);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Errore nel salvataggio impostazioni" }, { status: 500 });
  }
}
