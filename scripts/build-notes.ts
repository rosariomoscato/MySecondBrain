import * as fs from "fs";
import * as path from "path";
import matter from "gray-matter";
import { Note, extractCategory, CATEGORY_COLORS } from "../lib/types";

interface NotesConfig {
  source: string;
  pattern: string;
  filesDir: string;
  appName: string;
  appDescription: string;
}

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DEFAULT_CONFIG: NotesConfig = {
  source: "..",
  pattern: "UpNote_*",
  filesDir: "Files",
  appName: "Knowledge Explorer",
  appDescription: "Esplora e cerca nelle tue note con AI",
};

function loadConfig(): NotesConfig {
  const configPath = path.join(PROJECT_ROOT, "notes.config.json");
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  }
  return { ...DEFAULT_CONFIG };
}

function parseCliArgs(): Partial<NotesConfig> {
  const args: Partial<NotesConfig> = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--source" && argv[i + 1]) args.source = argv[++i];
    else if (argv[i] === "--pattern" && argv[i + 1]) args.pattern = argv[++i];
    else if (argv[i] === "--files-dir" && argv[i + 1]) args.filesDir = argv[++i];
  }
  return args;
}

function matchPattern(name: string, pattern: string): boolean {
  if (pattern === "*") return true;
  if (pattern.endsWith("*")) return name.startsWith(pattern.slice(0, -1));
  return name === pattern;
}

function findExportDirs(source: string, pattern: string): string[] {
  const entries = fs.readdirSync(source, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && matchPattern(e.name, pattern))
    .map((e) => ({
      name: e.name,
      path: path.join(source, e.name),
    }))
    .sort((a, b) => b.name.localeCompare(a.name))
    .map((d) => d.path);
}

function cleanupOldExports(source: string, pattern: string, currentDirs: string[]): void {
  const entries = fs.readdirSync(source, { withFileTypes: true });
  const knownPaths = new Set(currentDirs);
  const oldDirs = entries
    .filter((e) => e.isDirectory() && matchPattern(e.name, pattern))
    .map((e) => path.join(source, e.name))
    .filter((p) => !knownPaths.has(p));

  for (const dir of oldDirs) {
    console.log(`  Rimozione: ${path.basename(dir)}`);
    fs.rmSync(dir, { recursive: true, force: true });
  }

  if (oldDirs.length > 0) {
    console.log(`  Rimosse ${oldDirs.length} vecchia/e cartella/e.\n`);
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&middot;/g, "·")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/==([^=]+)==/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractLinks(content: string): string[] {
  const linkPattern = /\[([^\]]+)\]\(%23([^)]+)\)/g;
  const links: string[] = [];
  let match;
  while ((match = linkPattern.exec(content)) !== null) {
    links.push(match[1].trim());
  }
  return [...new Set(links)];
}

function extractAttachments(content: string): string[] {
  const attachments: string[] = [];

  const imgPattern = /!\[[^\]]*\]\(Files\/([^)]+)\)/g;
  let match;
  while ((match = imgPattern.exec(content)) !== null) {
    attachments.push(decodeURIComponent(match[1].trim()));
  }

  const linkPattern = /\[[^\]]+\]\(Files\/([^)]+)\)/g;
  while ((match = linkPattern.exec(content)) !== null) {
    const f = decodeURIComponent(match[1].trim());
    if (!attachments.includes(f)) {
      attachments.push(f);
    }
  }

  return [...new Set(attachments)];
}

function extractTitle(content: string, fileName: string): string {
  const titleMatch = content.match(/^##\s+\S+\s*\|\s*(.+)$/m);
  if (titleMatch) return titleMatch[1].trim();
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    const parts = h1Match[1].split("|");
    return parts.length > 1 ? parts[parts.length - 1].trim() : parts[0].trim();
  }
  return fileName.replace(/^#[^ ]+\s+/, "").replace(/\.md$/, "");
}

function processNotesFromDir(notesDir: string): Note[] {
  const files = fs.readdirSync(notesDir).filter((f) => f.endsWith(".md"));
  const notes: Note[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(notesDir, file), "utf-8");
    const { data: frontmatter, content } = matter(raw);
    const category = extractCategory(file);
    const title = extractTitle(content, file);
    const cleanContent = stripHtml(content);
    const links = extractLinks(content);
    const attachments = extractAttachments(content);

    notes.push({
      id: slugify(title),
      title,
      category,
      categoryColor: CATEGORY_COLORS[category] || "#95a5a6",
      content: cleanContent,
      filePath: file,
      links,
      attachments,
      date: frontmatter.date || "",
      created: frontmatter.created || "",
    });
  }

  return notes;
}

function mergeNotes(allDirs: string[]): Note[] {
  const noteMap = new Map<string, Note>();

  for (const dir of [...allDirs].reverse()) {
    const notes = processNotesFromDir(dir);
    for (const note of notes) {
      noteMap.set(note.id, note);
    }
  }

  return Array.from(noteMap.values());
}

function mergeFiles(allDirs: string[], filesDirName: string): Map<string, string> {
  const publicFilesDir = path.resolve(__dirname, "../public/files");
  const renameMap = new Map<string, string>();

  if (fs.existsSync(publicFilesDir)) {
    fs.rmSync(publicFilesDir, { recursive: true, force: true });
  }
  fs.mkdirSync(publicFilesDir, { recursive: true });

  const seenNames = new Set<string>();

  for (const dir of [...allDirs].reverse()) {
    const filesDir = path.join(dir, filesDirName);
    if (!fs.existsSync(filesDir)) continue;

    const entries = fs.readdirSync(filesDir);
    for (const entry of entries) {
      const srcPath = path.join(filesDir, entry);
      if (!fs.statSync(srcPath).isFile()) continue;

      let destName = entry;
      if (seenNames.has(entry.toLowerCase())) {
        const ext = path.extname(entry);
        const base = path.basename(entry, ext);
        let idx = seenNames.size;
        destName = `${base}_${idx}${ext}`;
        while (seenNames.has(destName.toLowerCase())) {
          idx++;
          destName = `${base}_${idx}${ext}`;
        }
        renameMap.set(entry, destName);
      }
      seenNames.add(destName.toLowerCase());

      const destPath = path.join(publicFilesDir, destName);
      fs.copyFileSync(srcPath, destPath);
    }
  }

  return renameMap;
}

function applyRenames(notes: Note[], renameMap: Map<string, string>): void {
  if (renameMap.size === 0) return;
  for (const note of notes) {
    note.attachments = note.attachments.map((a) => renameMap.get(a) || a);
  }
}

function main() {
  const cleanup = process.argv.includes("--cleanup");

  const fileConfig = loadConfig();
  const cliOverrides = parseCliArgs();
  const config: NotesConfig = { ...fileConfig, ...cliOverrides };

  const source = path.resolve(PROJECT_ROOT, config.source);

  console.log(`=== ${config.appName} - Build Notes ===\n`);

  const allDirs = findExportDirs(source, config.pattern);

  if (allDirs.length === 0) {
    console.error(
      `Nessuna cartella con pattern "${config.pattern}" trovata in ${source}`
    );
    console.error(`Configura source/pattern in notes.config.json`);
    process.exit(1);
  }

  console.log(`Sorgente: ${source} (pattern: "${config.pattern}")`);
  console.log(`Trovate ${allDirs.length} cartella/e di import:`);
  for (const dir of allDirs) {
    const mdCount = fs.readdirSync(dir).filter((f) => f.endsWith(".md")).length;
    console.log(`  - ${path.basename(dir)} (${mdCount} .md)`);
  }
  console.log("");

  const renameMap = mergeFiles(allDirs, config.filesDir);
  const fileCount = fs.readdirSync(path.resolve(__dirname, "../public/files")).length;
  console.log(`✓ Copiati ${fileCount} file allegati → public/files/`);

  const mergedNotes = mergeNotes(allDirs);
  applyRenames(mergedNotes, renameMap);

  const outPath = path.resolve(__dirname, "../data/notes.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(mergedNotes, null, 2), "utf-8");

  console.log(`✓ Unite e processate ${mergedNotes.length} note → data/notes.json`);

  if (cleanup) {
    console.log("\nPulizia vecchi import:");
    cleanupOldExports(source, config.pattern, allDirs);
  }

  console.log("✓ Completato.\n");
}

main();
