import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get("filePath");

    if (!filePath) {
      return NextResponse.json({ error: "filePath required" }, { status: 400 });
    }

    const notesDir = path.join(process.cwd(), "notes");
    const entries = fs.readdirSync(notesDir, { withFileTypes: true });
    const upnoteDirs = entries
      .filter((e) => e.isDirectory() && e.name.startsWith("UpNote_"))
      .map((e) => path.join(notesDir, e.name))
      .reverse();

    for (const dir of upnoteDirs) {
      const fullPath = path.join(dir, filePath);
      if (fs.existsSync(fullPath)) {
        const raw = fs.readFileSync(fullPath, "utf-8");
        return NextResponse.json({ content: raw });
      }
    }

    return NextResponse.json({ error: "File not found" }, { status: 404 });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
