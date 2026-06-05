import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export async function GET() {
  try {
    const readmePath = path.resolve(process.cwd(), "README.md");
    const content = fs.readFileSync(readmePath, "utf-8");
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ content: "" }, { status: 500 });
  }
}
