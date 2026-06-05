import * as fs from "fs";
import * as path from "path";

export interface NotesSettings {
  source: string;
  pattern: string;
  filesDir: string;
}

export interface AISettings {
  provider: string;
  openrouterApiKey: string;
  openrouterModel: string;
}

export interface AppSettings {
  notes: NotesSettings;
  ai: AISettings;
}

const SETTINGS_PATH = path.join(process.cwd(), "data", "settings.json");

const DEFAULT_SETTINGS: AppSettings = {
  notes: {
    source: "..",
    pattern: "UpNote_*",
    filesDir: "Files",
  },
  ai: {
    provider: process.env.LLM_PROVIDER || "openrouter",
    openrouterApiKey: process.env.OPENROUTER_API_KEY || "",
    openrouterModel: process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat-v3-0324:free",
  },
};

function loadNotesConfig(): Partial<NotesSettings> {
  const configPath = path.join(process.cwd(), "notes.config.json");
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(raw);
      return {
        source: parsed.source,
        pattern: parsed.pattern,
        filesDir: parsed.filesDir,
      };
    } catch {
      return {};
    }
  }
  return {};
}

export function getSettings(): AppSettings {
  if (fs.existsSync(SETTINGS_PATH)) {
    try {
      const raw = fs.readFileSync(SETTINGS_PATH, "utf-8");
      const saved = JSON.parse(raw);
      return {
        notes: {
          ...DEFAULT_SETTINGS.notes,
          ...saved.notes,
        },
        ai: {
          ...DEFAULT_SETTINGS.ai,
          ...saved.ai,
        },
      };
    } catch {
      // fall through
    }
  }

  const notesConfig = loadNotesConfig();

  return {
    notes: {
      ...DEFAULT_SETTINGS.notes,
      ...notesConfig,
    },
    ai: {
      ...DEFAULT_SETTINGS.ai,
    },
  };
}

export function saveSettings(settings: AppSettings): void {
  const dir = path.dirname(SETTINGS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf-8");

  const notesConfigPath = path.join(process.cwd(), "notes.config.json");
  const existing: Record<string, unknown> = fs.existsSync(notesConfigPath)
    ? JSON.parse(fs.readFileSync(notesConfigPath, "utf-8"))
    : {};
  const updated = {
    ...existing,
    source: settings.notes.source,
    pattern: settings.notes.pattern,
    filesDir: settings.notes.filesDir,
  };
  fs.writeFileSync(notesConfigPath, JSON.stringify(updated, null, 2), "utf-8");
}

export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return key ? "••••" : "";
  return key.slice(0, 4) + "••••" + key.slice(-4);
}
