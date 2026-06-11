"use client";

import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { Note, CATEGORY_COLORS } from "@/lib/types";

interface NoteGraphProps {
  notes: Note[];
  onNodeClick: (noteId: string) => void;
  layoutLocked?: boolean;
  onLayoutChange?: (locked: boolean) => void;
  favoriteIds?: Set<string>;
}

interface VisNode {
  id: string;
  label: string;
  group: string;
  color: { background: string; border: string; highlight: { background: string; border: string }; hover: { background: string; border: string } };
  font: { size: number; color: string; align?: string; multi?: boolean };
  size: number;
  shape: string;
  borderWidth: number;
  widthConstraint?: { maximum: number };
  heightConstraint?: { valign?: string };
  margin?: { top: number; bottom: number; left: number; right: number };
  shadow?: { enabled: boolean; color: string; size: number };
  shapeProperties?: { borderRadius: number };
  fixed?: { x: boolean; y: boolean };
  x?: number;
  y?: number;
}

interface VisEdge {
  from: string;
  to: string;
  dashes?: boolean;
  color?: { color: string; highlight: string; hover: string };
  title?: string;
  width?: number;
}

interface NodePosition {
  x: number;
  y: number;
}

const POSITIONS_STORAGE_KEY = "msb-graph-positions";

function loadSavedPositions(): Record<string, NodePosition> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(POSITIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePositions(positions: Record<string, NodePosition>) {
  try {
    localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // ignore storage errors
  }
}

export interface NoteGraphHandle {
  focusNode: (nodeId: string) => void;
  resetPositions: () => void;
}

export const NoteGraph = forwardRef<NoteGraphHandle, NoteGraphProps>(function NoteGraph({ notes, onNodeClick, layoutLocked = false, onLayoutChange, favoriteIds }: NoteGraphProps, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<unknown>(null);
  const positionsRef = useRef<Record<string, NodePosition>>(loadSavedPositions());
  const { resolvedTheme } = useTheme();
  const [tooltip, setTooltip] = useState<{
    note: Note;
    x: number;
    y: number;
  } | null>(null);
  const [extTooltip, setExtTooltip] = useState<{
    domain: string;
    url: string;
    type: string;
    x: number;
    y: number;
  } | null>(null);

  const isDark = resolvedTheme === "dark";

  const buildGraph = useCallback(() => {
    if (!containerRef.current) return;

    const categories = [...new Set(notes.map((n) => n.category))];

    const colorMap: Record<string, { bg: string; border: string }> = {};
    for (const [cat, color] of Object.entries(CATEGORY_COLORS)) {
      colorMap[cat] = { bg: color, border: color };
    }

    const savedPositions = positionsRef.current;
    const visNodes: VisNode[] = [];

    visNodes.push({
      id: "root",
      label: (process.env.NEXT_PUBLIC_APP_NAME || "Knowledge Explorer").split(" ")[0],
      group: "root",
      color: {
        background: "#6366f1",
        border: "#818cf8",
        highlight: { background: "#6366f1", border: "#fff" },
        hover: { background: "#6366f1", border: "#fff" },
      },
      font: { size: 16, color: "#fff" },
      size: 30,
      shape: "dot",
      borderWidth: 3,
      ...(savedPositions["root"] ? { x: savedPositions["root"].x, y: savedPositions["root"].y, fixed: layoutLocked ? { x: true, y: true } : undefined } : {}),
    });

    for (const cat of categories) {
      const c = colorMap[cat] || { bg: "#95a5a6", border: "#95a5a6" };
      const catId = `folder_${cat}`;
      visNodes.push({
        id: catId,
        label: `#${cat.replace(/_/g, " ")}`,
        group: cat,
        color: {
          background: c.bg,
          border: c.border,
          highlight: { background: c.bg, border: "#fff" },
          hover: { background: c.bg, border: "#fff" },
        },
        font: { size: 13, color: isDark ? "#e0e0e0" : "#1a1a2e" },
        size: 22,
        shape: "dot",
        borderWidth: 2,
        ...(savedPositions[catId] ? { x: savedPositions[catId].x, y: savedPositions[catId].y, fixed: layoutLocked ? { x: true, y: true } : undefined } : {}),
      });
    }

    for (const note of notes) {
      const c = colorMap[note.category] || { bg: "#95a5a6", border: "#95a5a6" };
      const preview = note.content.slice(0, 80).replace(/\n/g, " ");
      const bgColor = isDark ? "#111827" : "#f8fafc";
      const borderColor = c.bg;
      const isFav = favoriteIds?.has(note.id);
      const titlePrefix = isFav ? "\u2605 " : "";
      visNodes.push({
        id: note.id,
        label: `${titlePrefix}${note.title}\n─────────────\n${preview}...`,
        group: note.category,
        color: {
          background: bgColor,
          border: isFav ? "#f59e0b" : borderColor,
          highlight: { background: bgColor, border: "#fff" },
          hover: { background: isDark ? "#1e293b" : "#e2e8f0", border: "#fff" },
        },
        font: { size: 10, color: isDark ? "#ccc" : "#2d2d3f", align: "left", multi: true },
        size: 12,
        shape: "box",
        borderWidth: isFav ? 3 : 2,
        widthConstraint: { maximum: 180 },
        margin: { top: 8, bottom: 8, left: 10, right: 10 },
        shadow: { enabled: true, color: isFav ? "#f59e0b40" : `${c.bg}40`, size: isFav ? 12 : 8 },
        shapeProperties: { borderRadius: 20 },
        ...(savedPositions[note.id] ? { x: savedPositions[note.id].x, y: savedPositions[note.id].y, fixed: layoutLocked ? { x: true, y: true } : undefined } : {}),
      });
    }

    const visEdges: VisEdge[] = [];

    for (const cat of categories) {
      visEdges.push({ from: "root", to: `folder_${cat}`, width: 1.5 });
    }

    for (const note of notes) {
      visEdges.push({
        from: `folder_${note.category}`,
        to: note.id,
        width: 0.5,
        color: { color: isDark ? "#333" : "#ccc", highlight: "#fff", hover: "#888" },
      });
    }

    const noteIdSet = new Set(notes.map((n) => n.id));
    const noteMap = new Map(notes.map((n) => [n.id, n]));
    const addedLinks = new Set<string>();

    const externalUrlMap = new Map<string, { domain: string; type: string }>();
    for (const note of notes) {
      for (const url of note.externalLinks) {
        if (!externalUrlMap.has(url)) {
          try {
            const u = new URL(url);
            const host = u.hostname.toLowerCase().replace(/^www\./, "");
            const isVideo = /^(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|twitch\.tv)/.test(host);
            externalUrlMap.set(url, { domain: host, type: isVideo ? "video" : "site" });
          } catch {
            externalUrlMap.set(url, { domain: url, type: "site" });
          }
        }
      }
    }

    const urlToExtIdMap = new Map<string, string>();
    let extCounter = 0;
    const urlToExtId = (url: string) => {
      if (urlToExtIdMap.has(url)) return urlToExtIdMap.get(url)!;
      const id = `ext_${extCounter++}`;
      urlToExtIdMap.set(url, id);
      return id;
    };

    for (const [url, meta] of externalUrlMap.entries()) {
      const id = urlToExtId(url);
      const isVideo = meta.type === "video";
      const extColor = isVideo ? "#ef4444" : "#64748b";
      visNodes.push({
        id,
        label: meta.domain.replace(/\.(com|org|net|it|io|dev)/, "").slice(0, 20),
        group: "external",
        color: {
          background: isDark ? "#1e293b" : "#f1f5f9",
          border: extColor,
          highlight: { background: isDark ? "#334155" : "#e2e8f0", border: "#fff" },
          hover: { background: isDark ? "#334155" : "#e2e8f0", border: "#fff" },
        },
        font: { size: 8, color: isDark ? "#94a3b8" : "#64748b" },
        size: 8,
        shape: isVideo ? "diamond" : "square",
        borderWidth: 2,
        margin: { top: 4, bottom: 4, left: 4, right: 4 },
        shadow: { enabled: true, color: `${extColor}30`, size: 4 },
        shapeProperties: { borderRadius: isVideo ? 0 : 4 },
        ...(savedPositions[id] ? { x: savedPositions[id].x, y: savedPositions[id].y, fixed: layoutLocked ? { x: true, y: true } : undefined } : {}),
      });
    }
    for (const note of notes) {
      for (const rawLink of note.links) {
        let linkTitle = rawLink;
        if (linkTitle.startsWith("#")) {
          const pipeIdx = linkTitle.indexOf(" | ");
          if (pipeIdx >= 0) {
            linkTitle = linkTitle.substring(pipeIdx + 3);
          } else {
            linkTitle = linkTitle.substring(1);
          }
        }
        linkTitle = linkTitle.replace(/\\_/g, "_");

        const normalize = (s: string) => s.toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ").trim();
        const normLink = normalize(linkTitle);

        const target = notes.find((n) => {
          const nTitle = normalize(n.title);
          return nTitle === normLink || nTitle.includes(normLink) || normLink.includes(nTitle);
        });
        if (target && target.id !== note.id && noteIdSet.has(target.id)) {
          const key = [note.id, target.id].sort().join("-");
          if (!addedLinks.has(key)) {
            addedLinks.add(key);
            visEdges.push({
              from: note.id,
              to: target.id,
              dashes: true,
              color: { color: "#fbbf24", highlight: "#fbbf24", hover: "#fbbf24" },
              width: 1,
            });
          }
        }
      }
    }

    for (const note of notes) {
      for (const url of note.externalLinks) {
        const extId = urlToExtId(url);
        visEdges.push({
          from: note.id,
          to: extId,
          dashes: true,
          color: { color: isDark ? "#334155" : "#cbd5e1", highlight: "#94a3b8", hover: "#64748b" },
          width: 0.5,
        });
      }
    }

    import("vis-network").then(({ Network }) => {
      if (networkRef.current) {
        (networkRef.current as { destroy: () => void }).destroy();
      }

      const hasSavedPositions = Object.keys(savedPositions).length > 0;

      const options = {
        physics: {
          enabled: !layoutLocked,
          barnesHut: {
            gravitationalConstant: -12000,
            centralGravity: 0.2,
            springLength: 80,
            springConstant: 0.03,
          },
          stabilization: { iterations: layoutLocked ? 0 : 250 },
        },
        interaction: {
          hover: true,
          tooltipDelay: 200,
          navigationButtons: true,
          keyboard: true,
          dragNodes: true,
        },
        nodes: {
          shadow: {
            enabled: true,
            color: "rgba(0,0,0,0.3)",
            size: 5,
          },
        },
        edges: {
          smooth: { enabled: true, type: "continuous", roundness: 0.5 } as const,
          color: { color: "#444", highlight: "#fff", hover: "#aaa" },
        },
      };

      const network = new Network(
        containerRef.current!,
        { nodes: visNodes, edges: visEdges },
        options
      );

      if (hasSavedPositions) {
        const applyPositions = () => {
          const allNodeIds = visNodes.map((n) => n.id);
          for (const nid of allNodeIds) {
            if (savedPositions[nid]) {
              network.moveNode(nid, savedPositions[nid].x, savedPositions[nid].y);
            }
          }
        };

        if (layoutLocked) {
          network.once("afterDrawing", () => {
            applyPositions();
            network.redraw();
          });
        } else {
          network.once("stabilized", applyPositions);
        }
      }

      network.on("dragEnd", (params: { nodes: string[] }) => {
        if (params.nodes.length > 0) {
          const newPositions = { ...positionsRef.current };
          for (const nodeId of params.nodes) {
            const pos = network.getPositions([nodeId])[nodeId];
            if (pos) {
              newPositions[nodeId] = { x: pos.x, y: pos.y };
            }
          }
          positionsRef.current = newPositions;
          savePositions(newPositions);
        }
      });

      network.on("hoverNode", (params: { node: string }) => {
        const note = noteMap.get(params.node);
        if (note) {
          const canvasRect = containerRef.current?.getBoundingClientRect();
          const pos = network.getPositions([params.node])[params.node];
          if (canvasRect && pos) {
            const canvasPoint = network.canvasToDOM({ x: pos.x, y: pos.y });
            setTooltip({
              note,
              x: canvasPoint.x,
              y: canvasPoint.y,
            });
          }
        } else if (params.node.startsWith("ext_")) {
          for (const [url, meta] of externalUrlMap.entries()) {
            const extId = urlToExtId(url);
            if (extId === params.node) {
              const canvasRect = containerRef.current?.getBoundingClientRect();
              const pos = network.getPositions([params.node])[params.node];
              if (canvasRect && pos) {
                const canvasPoint = network.canvasToDOM({ x: pos.x, y: pos.y });
                setExtTooltip({
                  domain: meta.domain,
                  url,
                  type: meta.type,
                  x: canvasPoint.x,
                  y: canvasPoint.y,
                });
              }
              break;
            }
          }
        }
      });

      network.on("blurNode", () => {
        setTooltip(null);
        setExtTooltip(null);
      });

      network.on("click", (params: { nodes: string[] }) => {
        if (params.nodes.length === 1) {
          const nodeId = params.nodes[0];
          if (noteIdSet.has(nodeId)) {
            onNodeClick(nodeId);
          } else if (nodeId.startsWith("ext_")) {
            for (const [url] of externalUrlMap.entries()) {
              const extId = urlToExtId(url);
              if (extId === nodeId) {
                window.open(url, "_blank", "noopener,noreferrer");
                break;
              }
            }
          }
        }
      });

      networkRef.current = network;
    });
  }, [notes, onNodeClick, isDark, layoutLocked, favoriteIds]);

  useImperativeHandle(ref, () => ({
    focusNode: (nodeId: string) => {
      const network = networkRef.current as { focus: (id: string, opts?: unknown) => void; selectNodes: (ids: string[]) => void } | null;
      if (network) {
        network.focus(nodeId, { scale: 1.5, animation: { duration: 600, easingFunction: "easeInOutQuad" } });
        network.selectNodes([nodeId]);
      }
    },
    resetPositions: () => {
      positionsRef.current = {};
      localStorage.removeItem(POSITIONS_STORAGE_KEY);
      buildGraph();
    },
  }), [buildGraph]);

  useEffect(() => {
    buildGraph();
    return () => {
      if (networkRef.current) {
        (networkRef.current as { destroy: () => void }).destroy();
      }
    };
  }, [buildGraph]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="h-full w-full"
    >
      <div
        ref={containerRef}
        className="h-full w-full rounded-lg border border-border/50 bg-background/50 relative"
      >
        {tooltip && (
          <div
            className="absolute z-50 pointer-events-none"
            style={{
              left: tooltip.x,
              top: tooltip.y - 20,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="rounded-xl p-3 max-w-[300px] shadow-xl border border-border/50 bg-popover/95 backdrop-blur-xl">
              <p className="font-semibold text-sm text-foreground mb-1.5">
                {tooltip.note.title}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                {tooltip.note.content.slice(0, 250).replace(/\n/g, " ")}...
              </p>
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full border"
                  style={{
                    borderColor: `${tooltip.note.categoryColor}50`,
                    color: tooltip.note.categoryColor,
                    backgroundColor: `${tooltip.note.categoryColor}10`,
                  }}
                >
                  #{tooltip.note.category.replace(/_/g, " ")}
                </span>
                {tooltip.note.links.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {tooltip.note.links.length} link
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
        {extTooltip && (
          <div
            className="absolute z-50 pointer-events-none"
            style={{
              left: extTooltip.x,
              top: extTooltip.y - 20,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="rounded-xl p-3 max-w-[250px] shadow-xl border border-border/50 bg-popover/95 backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full border"
                  style={{
                    borderColor: extTooltip.type === "video" ? "#ef444450" : "#64748b50",
                    color: extTooltip.type === "video" ? "#ef4444" : "#64748b",
                    backgroundColor: extTooltip.type === "video" ? "#ef444410" : "#64748b10",
                  }}
                >
                  {extTooltip.type === "video" ? "Video" : "Sito"}
                </span>
              </div>
              <p className="font-semibold text-sm text-foreground mb-1">
                {extTooltip.domain}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {extTooltip.url}
              </p>
            </div>
          </div>
        )}
      </div>
     </motion.div>
  );
});
