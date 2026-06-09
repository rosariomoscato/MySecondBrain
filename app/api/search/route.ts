import { NextRequest, NextResponse } from "next/server";
import { searchNotes, searchByTag, getAllTags } from "@/lib/search-engine";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  const type = request.nextUrl.searchParams.get("type");

  if (type === "tags") {
    return NextResponse.json({ tags: getAllTags() });
  }

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  if (type === "tag") {
    const results = searchByTag(query.trim(), 20);
    return NextResponse.json({ results });
  }

  const category = request.nextUrl.searchParams.get("category");
  const results = searchNotes(query.trim(), 10, category || undefined);
  return NextResponse.json({ results });
}
