import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export async function GET() {
  try {
    const notesPath = path.join(process.cwd(), "data", "notes.json");
    const raw = fs.readFileSync(notesPath, "utf-8");
    const notes = JSON.parse(raw);
    return NextResponse.json(notes);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
