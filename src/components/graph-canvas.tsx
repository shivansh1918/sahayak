import { useMemo, useState } from "react";

import { Panel } from "@/components/intel-ui";

type Node = { id: string; name: string; entity_type: string | null; risk_score: number | null; confidence: number | null };
type Edge = { id: string; source_entity_id: string | null; target_entity_id: string | null; relationship_type: string | null; confidence: number | null };

const TYPE_COLOR: Record<string, string> = {
  person: "var(--color-primary)",
  organization: "var(--color-chart-2)",
  location: "var(--color-chart-3)",
  vehicle: "var(--color-chart-4)",
  device: "var(--color-chart-5)",
  ip_address: "var(--color-caution)",
  domain: "var(--color-caution)",
};

export function GraphCanvas({
  nodes,
  edges,
  onSelectNode,
  onSelectEdge,
}: {
  nodes: Node[];
  edges: Edge[];
  onSelectNode: (id: string) => void;
  onSelectEdge: (edge: Edge) => void;
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [minConfidence, setMinConfidence] = useState(0);

  const filtered = useMemo(() => {
    const keep = nodes.filter((n) => {
      if (type !== "all" && n.entity_type !== type) return false;
      if ((n.confidence ?? 0) * 100 < minConfidence) return false;
      if (query && !n.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
    const ids = new Set(keep.map((n) => n.id));
    return { nodes: keep, edges: edges.filter((e) => ids.has(e.source_entity_id ?? "") && ids.has(e.target_entity_id ?? "")) };
  }, [nodes, edges, query, type, minConfidence]);

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    const n = filtered.nodes.length || 1;
    filtered.nodes.forEach((node, i) => {
      const ring = i % 3;
      const radius = 130 + ring * 90;
      const angle = (i / n) * Math.PI * 2 + ring * 0.5;
      map.set(node.id, { x: 500 + radius * Math.cos(angle), y: 320 + radius * Math.sin(angle) });
    });
    return map;
  }, [filtered.nodes]);

  const types = Array.from(new Set(nodes.map((n) => n.entity_type).filter(Boolean))) as string[];

  return (
    <div className="space-y-3">
      <Panel className="flex flex-wrap items-center gap-3 p-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search nodes"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
        >
          <option value="all">All entity types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Min confidence {minConfidence}%
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={minConfidence}
            onChange={(e) => setMinConfidence(Number(e.target.value))}
          />
        </label>
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.nodes.length} nodes · {filtered.edges.length} relationships
        </span>
      </Panel>

      <Panel className="overflow-hidden">
        <svg viewBox="0 0 1000 640" className="h-[560px] w-full">
          {filtered.edges.map((e) => {
            const a = positions.get(e.source_entity_id ?? "");
            const b = positions.get(e.target_entity_id ?? "");
            if (!a || !b) return null;
            return (
              <line
                key={e.id}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="var(--color-border)"
                strokeWidth={1 + (e.confidence ?? 0) * 2}
                className="cursor-pointer"
                onClick={() => onSelectEdge(e)}
              />
            );
          })}
          {filtered.nodes.map((n) => {
            const p = positions.get(n.id);
            if (!p) return null;
            const risk = n.risk_score ?? 0;
            return (
              <g key={n.id} className="cursor-pointer" onClick={() => onSelectNode(n.id)}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={8 + risk * 8}
                  fill={TYPE_COLOR[n.entity_type ?? ""] ?? "var(--color-muted-foreground)"}
                  fillOpacity={0.85}
                  stroke={risk > 0.6 ? "var(--color-destructive)" : "var(--color-border)"}
                  strokeWidth={risk > 0.6 ? 2 : 1}
                />
                <text x={p.x + 14} y={p.y + 4} fontSize="11" fill="var(--color-foreground)">
                  {n.name.length > 26 ? `${n.name.slice(0, 26)}…` : n.name}
                </text>
              </g>
            );
          })}
        </svg>
      </Panel>
    </div>
  );
}
