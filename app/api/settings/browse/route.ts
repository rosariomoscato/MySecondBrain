import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

const PROJECT_ROOT = process.cwd();

function resolveAndValidate(requestPath: string): string | null {
  const resolved = path.resolve(requestPath || PROJECT_ROOT);

  if (!resolved.startsWith(PROJECT_ROOT)) {
    return null;
  }

  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    return null;
  }

  return resolved;
}

export async function GET(request: NextRequest) {
  const requestPath = request.nextUrl.searchParams.get("path") || PROJECT_ROOT;

  const resolved = resolveAndValidate(requestPath);
  if (!resolved) {
    return NextResponse.json({ error: "Percorso non valido" }, { status: 400 });
  }

  try {
    const entries = fs.readdirSync(resolved, { withFileTypes: true });
    const directories = entries
      .filter((e) => e.isDirectory())
      .filter((e) => !e.name.startsWith(".") && e.name !== "node_modules")
      .map((e) => ({
        name: e.name,
        path: path.join(resolved, e.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const parentPath = resolved === PROJECT_ROOT
      ? null
      : (resolved.startsWith(PROJECT_ROOT) ? resolved : null);

    return NextResponse.json({
      currentPath: resolved,
      parentPath,
      directories,
    });
  } catch {
    return NextResponse.json({ error: "Impossibile leggere la cartella" }, { status: 500 });
  }
}
