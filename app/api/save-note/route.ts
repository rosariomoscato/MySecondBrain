import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export async function POST(req: Request) {
  try {
    const { noteId, filePath, content } = await req.json();

    if (!filePath || typeof content !== "string") {
      return NextResponse.json(
        { error: "filePath e content sono obbligatori" },
        { status: 400 }
      );
    }

    const projectRoot = process.cwd();
    const notesDir = path.join(projectRoot, "notes");

    if (!fs.existsSync(notesDir)) {
      return NextResponse.json(
        { error: `Cartella notes non trovata in ${notesDir}` },
        { status: 500 }
      );
    }

    const entries = fs.readdirSync(notesDir, { withFileTypes: true });
    const upnoteDirs = entries
      .filter((e) => e.isDirectory() && e.name.startsWith("UpNote_"))
      .map((e) => path.join(notesDir, e.name))
      .reverse();

    let saved = false;
    for (const dir of upnoteDirs) {
      const fullPath = path.join(dir, filePath);
      if (fs.existsSync(fullPath)) {
        fs.writeFileSync(fullPath, content, "utf-8");
        saved = true;
        break;
      }
    }

    if (!saved) {
      return NextResponse.json(
        { error: "File non trovato nelle cartelle sorgente" },
        { status: 404 }
      );
    }

    const notesJsonPath = path.join(projectRoot, "data", "notes.json");
    if (fs.existsSync(notesJsonPath) && noteId) {
      const notesData: Array<Record<string, unknown>> = JSON.parse(
        fs.readFileSync(notesJsonPath, "utf-8")
      );
      const idx = notesData.findIndex((n) => n.id === noteId);
      if (idx >= 0) {
        const existing = notesData[idx];
        const stripHtml = (html: string) =>
          html
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<[^>]+>/g, "")
            .replace(/&middot;/g, "·")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&nbsp;/g, " ")
            .replace(/==([^=]+)==/g, "$1")
            .replace(/\*\*([^*]+)\*\*/g, "$1")
            .replace(/!\[([^\]]*)\]\(Files\/([^)]+)\)/g, (_: string, alt: string, src: string) => {
              const decoded = decodeURIComponent(src);
              const encoded = encodeURIComponent(decoded);
              return "![" + alt + "](/files/" + encoded + ")";
            })
            .replace(/\[([^\]]+)\]\((?!https?:\/\/)([^)]+)\)/g, "$1")
            .replace(/\n{3,}/g, "\n\n")
            .trim();

        const extractExternalLinks = (text: string): string[] => {
          const urls: string[] = [];
          const seen = new Set<string>();
          const inlineRe = /\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
          let match;
          while ((match = inlineRe.exec(text)) !== null) {
            const url = match[2].replace(/\\([_()])/g, "$1");
            if (!seen.has(url)) { seen.add(url); urls.push(url); }
          }
          const bareRe = /(?<![(\[/\w])https?:\/\/[^\s<>")\]]+/g;
          while ((match = bareRe.exec(text)) !== null) {
            const url = match[0].replace(/[.,;:!?\)}\]]+$/, "").replace(/\\([_()])/g, "$1");
            if (!seen.has(url)) { seen.add(url); urls.push(url); }
          }
          return urls;
        };

        const extractAttachments = (text: string): string[] => {
          const attachments: string[] = [];
          const imgPattern = /!\[[^\]]*\]\(Files\/([^)]+)\)/g;
          let match;
          while ((match = imgPattern.exec(text)) !== null) {
            attachments.push(decodeURIComponent(match[1].trim()));
          }
          const linkPattern = /\[[^\]]+\]\(Files\/([^)]+)\)/g;
          while ((match = linkPattern.exec(text)) !== null) {
            const f = decodeURIComponent(match[1].trim());
            if (!attachments.includes(f)) attachments.push(f);
          }
          return [...new Set(attachments)];
        };

        const extractTitle = (text: string): string => {
          const titleMatch = text.match(/^##\s+\S+\s*\|\s*(.+)$/m);
          if (titleMatch) return titleMatch[1].trim();
          const h1Match = text.match(/^#\s+(.+)$/m);
          if (h1Match) {
            const parts = h1Match[1].split("|");
            return parts.length > 1 ? parts[parts.length - 1].trim() : parts[0].trim();
          }
          return (existing as { title: string }).title;
        };

        const extractLinks = (text: string): string[] => {
          const linkPattern = /\[([^\]]+)\]\(%23([^)]+)\)/g;
          const links: string[] = [];
          let match;
          while ((match = linkPattern.exec(text)) !== null) {
            links.push(match[1].trim());
          }
          return [...new Set(links)];
        };

        const cleanContent = stripHtml(content);
        const title = extractTitle(content);
        const externalLinks = extractExternalLinks(content);
        const attachments = extractAttachments(content);
        const links = extractLinks(content);

        notesData[idx] = {
          ...existing,
          title,
          content: cleanContent,
          externalLinks,
          attachments,
          links,
        };

        fs.writeFileSync(notesJsonPath, JSON.stringify(notesData, null, 2), "utf-8");
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
