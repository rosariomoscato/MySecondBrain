"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  FolderOpen,
  Cpu,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  ChevronRight,
  Folder,
  ArrowUp,
  Search,
  RefreshCw,
  Save,
  FolderSearch,
} from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRebuild: () => void;
}

interface DirectoryInfo {
  name: string;
  path: string;
}

interface ModelInfo {
  id: string;
  name: string;
  context_length: number;
  isFree: boolean;
}

export function SettingsDialog({ open, onOpenChange, onRebuild }: SettingsDialogProps) {
  const [notesSource, setNotesSource] = useState("");
  const [notesPattern, setNotesPattern] = useState("");
  const [notesFilesDir, setNotesFilesDir] = useState("Files");
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState("notes");

  const [isBrowsing, setIsBrowsing] = useState(false);
  const [browsePath, setBrowsePath] = useState("");
  const [browseParent, setBrowseParent] = useState<string | null>(null);
  const [browseDirs, setBrowseDirs] = useState<DirectoryInfo[]>([]);

  const [keyValid, setKeyValid] = useState<boolean | null>(null);
  const [keyError, setKeyError] = useState("");
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelSearch, setModelSearch] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isSavingAi, setIsSavingAi] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.notes) {
          setNotesSource(data.notes.source || "");
          setNotesPattern(data.notes.pattern || "");
          setNotesFilesDir(data.notes.filesDir || "Files");
        }
        if (data.ai) {
          setApiKey(data.ai.openrouterApiKeyFull || "");
          setSelectedModel(data.ai.openrouterModel || "");
          if (data.ai.openrouterApiKeyFull) {
            setKeyValid(true);
          }
        }
      })
      .catch(() => {});
  }, [open]);

  const handleBrowse = useCallback((targetPath?: string) => {
    const pathParam = targetPath || browsePath;
    setIsBrowsing(true);
    fetch(`/api/settings/browse?path=${encodeURIComponent(pathParam)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) return;
        setBrowsePath(data.currentPath);
        setBrowseParent(data.parentPath);
        setBrowseDirs(data.directories || []);
      })
      .catch(() => {})
      .finally(() => {});
  }, [browsePath]);

  const handleSelectBrowseDir = useCallback((dir: DirectoryInfo) => {
    handleBrowse(dir.path);
  }, [handleBrowse]);

  const handleGoUp = useCallback(() => {
    if (browseParent) handleBrowse(browseParent);
  }, [browseParent, handleBrowse]);

  const handleChooseBrowsePath = useCallback(() => {
    const cwd = process.cwd?.() || "";
    let rel = browsePath;
    if (browsePath.startsWith(cwd)) {
      rel = browsePath.slice(cwd.length);
      if (rel.startsWith("/")) rel = rel.slice(1);
      if (!rel) rel = ".";
    }
    setNotesSource(rel || browsePath);
    setIsBrowsing(false);
  }, [browsePath]);

  const handleVerifyKey = useCallback(async () => {
    if (!apiKey.trim()) return;
    setIsVerifying(true);
    setKeyValid(null);
    setKeyError("");
    setModels([]);
    try {
      const res = await fetch(`/api/settings/models?apiKey=${encodeURIComponent(apiKey)}`);
      const data = await res.json();
      if (data.valid) {
        setKeyValid(true);
        setModels(data.models || []);
        if (!selectedModel && data.models?.length > 0) {
          setSelectedModel(data.models[0].id);
        }
      } else {
        setKeyValid(false);
        setKeyError(data.error || "Chiave non valida");
      }
    } catch {
      setKeyValid(false);
      setKeyError("Errore di connessione");
    }
    setIsVerifying(false);
  }, [apiKey, selectedModel]);

  const handleSaveNotes = useCallback(async () => {
    setIsSavingNotes(true);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: { source: notesSource, pattern: notesPattern, filesDir: notesFilesDir },
        }),
      });
      onOpenChange(false);
      onRebuild();
    } catch {}
    setIsSavingNotes(false);
  }, [notesSource, notesPattern, notesFilesDir, onOpenChange, onRebuild]);

  const handleSaveAi = useCallback(async () => {
    setIsSavingAi(true);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ai: { provider: "openrouter", openrouterApiKey: apiKey, openrouterModel: selectedModel },
        }),
      });
      onOpenChange(false);
    } catch {}
    setIsSavingAi(false);
  }, [apiKey, selectedModel, onOpenChange]);

  const filteredModels = modelSearch
    ? models.filter(
        (m) =>
          m.id.toLowerCase().includes(modelSearch.toLowerCase()) ||
          m.name.toLowerCase().includes(modelSearch.toLowerCase())
      )
    : models;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FolderOpen className="h-5 w-5 text-primary" />
            Impostazioni
          </DialogTitle>
          <DialogDescription>
            Configura la cartella delle note e il modello AI
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeSettingsTab} onValueChange={setActiveSettingsTab} className="flex-1 min-h-0 flex flex-col px-6">
          <TabsList className="w-full bg-muted/50">
            <TabsTrigger value="notes" className="flex-1 flex items-center gap-2">
              <FolderOpen className="h-3.5 w-3.5" />
              Note
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex-1 flex items-center gap-2">
              <Cpu className="h-3.5 w-3.5" />
              Intelligenza Artificiale
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 min-h-0 mt-4 -mx-6 px-6">
            <TabsContent value="notes" className="mt-0 space-y-5 pb-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cartella sorgente</label>
                <div className="flex gap-2">
                  <Input
                    value={notesSource}
                    onChange={(e) => setNotesSource(e.target.value)}
                    placeholder="es. .. o /percorso/alle/note"
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!isBrowsing) {
                        handleBrowse(undefined);
                      } else {
                        setIsBrowsing(false);
                      }
                    }}
                    className="shrink-0 gap-1.5"
                  >
                    <FolderSearch className="h-4 w-4" />
                    {isBrowsing ? "Chiudi" : "Sfoglia"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Percorso relativo alla root del progetto o assoluto
                </p>
              </div>

              {isBrowsing && (
                <div className="border rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
                    <button
                      onClick={handleGoUp}
                      disabled={!browseParent}
                      className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-accent disabled:opacity-30 transition-colors"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-xs text-muted-foreground truncate flex-1">
                      {browsePath}
                    </span>
                    <Button
                      size="sm"
                      onClick={handleChooseBrowsePath}
                      className="h-7 text-xs gap-1"
                    >
                      <Check className="h-3 w-3" />
                      Seleziona
                    </Button>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {browseDirs.length === 0 ? (
                      <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                        Nessuna sottocartella trovata
                      </div>
                    ) : (
                      browseDirs.map((dir) => (
                        <button
                          key={dir.path}
                          onClick={() => handleSelectBrowseDir(dir)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                        >
                          <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate">{dir.name}</span>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 ml-auto shrink-0" />
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Pattern cartelle</label>
                <Input
                  value={notesPattern}
                  onChange={(e) => setNotesPattern(e.target.value)}
                  placeholder="es. UpNote_* oppure * per tutte"
                />
                <p className="text-xs text-muted-foreground">
                  <code className="px-1 py-0.5 rounded bg-muted text-[10px]">UpNote_*</code> = prefisso,{" "}
                  <code className="px-1 py-0.5 rounded bg-muted text-[10px]">*</code> = tutte,{" "}
                  <code className="px-1 py-0.5 rounded bg-muted text-[10px]">nome</code> = esatto
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Sottocartella allegati</label>
                <Input
                  value={notesFilesDir}
                  onChange={(e) => setNotesFilesDir(e.target.value)}
                  placeholder="Files"
                />
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                  className="gap-2"
                >
                  {isSavingNotes ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Salva e re-indicizza
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="ai" className="mt-0 space-y-5 pb-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">API Key OpenRouter</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value);
                        setKeyValid(null);
                        setKeyError("");
                        setModels([]);
                      }}
                      placeholder="sk-or-v1-..."
                      className="pr-10"
                    />
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      type="button"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleVerifyKey}
                    disabled={!apiKey.trim() || isVerifying}
                    className="shrink-0 gap-1.5"
                  >
                    {isVerifying ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : keyValid === true ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : keyValid === false ? (
                      <X className="h-4 w-4 text-red-500" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    Verifica
                  </Button>
                </div>
                {keyError && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <X className="h-3 w-3" /> {keyError}
                  </p>
                )}
                {keyValid === true && (
                  <p className="text-xs text-green-500 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Chiave valida — {models.length} modelli disponibili
                  </p>
                )}
              </div>

              {models.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Modello</label>
                  <Input
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    placeholder="Cerca modello..."
                    className="text-sm"
                  />
                  <div className="border rounded-xl overflow-hidden max-h-64">
                    <ScrollArea className="h-64">
                      {filteredModels.length === 0 ? (
                        <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                          Nessun modello trovato
                        </div>
                      ) : (
                        filteredModels.map((model) => (
                          <button
                            key={model.id}
                            onClick={() => setSelectedModel(model.id)}
                            className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent transition-colors text-left ${
                              selectedModel === model.id ? "bg-primary/10 ring-1 ring-primary/30" : ""
                            }`}
                          >
                            {selectedModel === model.id ? (
                              <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                            ) : (
                              <div className="h-3.5 w-3.5 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="truncate font-medium text-xs">{model.name}</div>
                              <div className="truncate text-[10px] text-muted-foreground">{model.id}</div>
                            </div>
                            <Badge
                              variant={model.isFree ? "secondary" : "outline"}
                              className={`text-[10px] shrink-0 ${
                                model.isFree
                                  ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                              }`}
                            >
                              {model.isFree ? "Free" : "Paid"}
                            </Badge>
                            {model.context_length > 0 && (
                              <span className="text-[10px] text-muted-foreground/50 shrink-0">
                                {model.context_length >= 1000
                                  ? `${Math.round(model.context_length / 1000)}k`
                                  : model.context_length}
                              </span>
                            )}
                          </button>
                        ))
                      )}
                    </ScrollArea>
                  </div>
                </div>
              )}

              {selectedModel && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border">
                  <Cpu className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Modello selezionato</p>
                    <p className="text-sm font-medium truncate">{selectedModel}</p>
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveAi}
                  disabled={isSavingAi || !apiKey.trim() || !selectedModel}
                  className="gap-2"
                >
                  {isSavingAi ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Salva
                </Button>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="h-4" />
      </DialogContent>
    </Dialog>
  );
}
