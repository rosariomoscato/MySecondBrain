import { NextRequest, NextResponse } from "next/server";
import { searchNotes } from "@/lib/search-engine";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  const category = request.nextUrl.searchParams.get("category");
  const results = searchNotes(query.trim(), 10, category || undefined);
  return NextResponse.json({ results });
}
