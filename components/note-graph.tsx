"use client";

import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { Note, CATEGORY_COLORS } from "@/lib/types";

interface NoteGraphProps {
  notes: Note[];
  onNodeClick: (noteId: string) => void;
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
}

interface VisEdge {
  from: string;
  to: string;
  dashes?: boolean;
  color?: { color: string; highlight: string; hover: string };
  title?: string;
  width?: number;
}

export interface NoteGraphHandle {
  focusNode: (nodeId: string) => void;
}

export const NoteGraph = forwardRef<NoteGraphHandle, NoteGraphProps>(function NoteGraph({ notes, onNodeClick }: NoteGraphProps, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<unknown>(null);
  const { resolvedTheme } = useTheme();
  const [tooltip, setTooltip] = useState<{
    note: Note;
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
    });

    for (const cat of categories) {
      const c = colorMap[cat] || { bg: "#95a5a6", border: "#95a5a6" };
      visNodes.push({
        id: `folder_${cat}`,
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
      });
    }

    for (const note of notes) {
      const c = colorMap[note.category] || { bg: "#95a5a6", border: "#95a5a6" };
      const preview = note.content.slice(0, 80).replace(/\n/g, " ");
      const bgColor = isDark ? "#111827" : "#f8fafc";
      const borderColor = c.bg;
      visNodes.push({
        id: note.id,
        label: `${note.title}\n─────────────\n${preview}...`,
        group: note.category,
        color: {
          background: bgColor,
          border: borderColor,
          highlight: { background: bgColor, border: "#fff" },
          hover: { background: isDark ? "#1e293b" : "#e2e8f0", border: "#fff" },
        },
        font: { size: 10, color: isDark ? "#ccc" : "#2d2d3f", align: "left", multi: true },
        size: 12,
        shape: "box",
        borderWidth: 2,
        widthConstraint: { maximum: 180 },
        margin: { top: 8, bottom: 8, left: 10, right: 10 },
        shadow: { enabled: true, color: `${c.bg}40`, size: 8 },
        shapeProperties: { borderRadius: 20 },
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

    import("vis-network").then(({ Network }) => {
      if (networkRef.current) {
        (networkRef.current as { destroy: () => void }).destroy();
      }

      const options = {
        physics: {
          barnesHut: {
            gravitationalConstant: -12000,
            centralGravity: 0.2,
            springLength: 80,
            springConstant: 0.03,
          },
          stabilization: { iterations: 250 },
        },
        interaction: {
          hover: true,
          tooltipDelay: 200,
          navigationButtons: true,
          keyboard: true,
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
        }
      });

      network.on("blurNode", () => {
        setTooltip(null);
      });

      network.on("click", (params: { nodes: string[] }) => {
        if (params.nodes.length === 1) {
          const nodeId = params.nodes[0];
          if (noteIdSet.has(nodeId)) {
            onNodeClick(nodeId);
          }
        }
      });

      networkRef.current = network;
    });
  }, [notes, onNodeClick, isDark]);

  useImperativeHandle(ref, () => ({
    focusNode: (nodeId: string) => {
      const network = networkRef.current as { focus: (id: string, opts?: unknown) => void; selectNodes: (ids: string[]) => void } | null;
      if (network) {
        network.focus(nodeId, { scale: 1.5, animation: { duration: 600, easingFunction: "easeInOutQuad" } });
        network.selectNodes([nodeId]);
      }
    },
  }), []);

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
      </div>
     </motion.div>
  );
});
