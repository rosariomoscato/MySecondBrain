import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { getSettings } from "@/lib/settings";

export async function POST() {
  try {
    const settings = getSettings();
    const source = settings.notes.source;
    const pattern = settings.notes.pattern;

    const cmd = `npx tsx scripts/build-notes.ts --source "${source}" --pattern "${pattern}" --cleanup`;

    execSync(cmd, {
      cwd: process.cwd(),
      stdio: "pipe",
      timeout: 30000,
    });

    return NextResponse.json({
      success: true,
      message: "Note re-indicizzate con successo. Vecchi export rimossi.",
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
