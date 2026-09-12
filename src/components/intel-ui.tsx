import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 bg-card/70 backdrop-blur-sm shadow-[var(--shadow-panel)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</h2>
        {hint ? <p className="mt-1 text-sm text-muted-foreground/80">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-surface/40 px-6 py-14 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

const RISK_CLASS: Record<string, string> = {
  critical: "border-destructive/50 bg-destructive/15 text-destructive",
  high: "border-caution/50 bg-caution/15 text-caution",
  medium: "border-primary/40 bg-primary/10 text-primary",
  low: "border-border bg-muted/40 text-muted-foreground",
  informational: "border-border bg-muted/40 text-muted-foreground",
};

export function RiskBadge({ level }: { level: string | null }) {
  const key = (level ?? "informational").toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider",
        RISK_CLASS[key] ?? RISK_CLASS["informational"],
      )}
    >
      {key.replace(/_/g, " ")}
    </span>
  );
}

export function StatusChip({ status }: { status: string | null }) {
  const key = (status ?? "unknown").toLowerCase();
  const tone =
    key === "processed" || key === "accepted" || key === "completed"
      ? "border-verified/50 bg-verified/15 text-verified"
      : key === "failed" || key === "rejected"
        ? "border-destructive/50 bg-destructive/15 text-destructive"
        : key === "processing" || key === "running" || key === "pending" || key === "queued"
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-muted/40 text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wider", tone)}>
      {key.replace(/_/g, " ")}
    </span>
  );
}

export function confidenceLabel(value: number | null | undefined): string {
  if (value === null || value === undefined) return "Unrated";
  const pct = value <= 1 ? value * 100 : value;
  if (pct >= 90) return "Strong evidence";
  if (pct >= 70) return "High confidence";
  if (pct >= 40) return "Moderate evidence";
  return "Weak signal";
}

export function ConfidenceMeter({ value }: { value: number | null | undefined }) {
  const pct = value === null || value === undefined ? 0 : Math.round((value <= 1 ? value * 100 : value));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">
        {confidenceLabel(value)}
        {value === null || value === undefined ? "" : ` · ${pct}%`}
      </span>
    </div>
  );
}

export function MetricTile({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <Panel className="p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-mono text-2xl text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground/80">{hint}</p> : null}
    </Panel>
  );
}
