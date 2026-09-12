import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { listInvestigations } from "@/lib/sources.functions";
import { buildReport } from "@/lib/analysis.functions";
import { ConfidenceMeter, EmptyState, Panel, RiskBadge, SectionTitle } from "@/components/intel-ui";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — SAHAYAK" },
      { name: "description", content: "Assemble investigation reports strictly from evidence-backed findings." },
      { property: "og:title", content: "Reports — SAHAYAK" },
      { property: "og:description", content: "Sources, findings, confidence and uncertainty in one report." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const list = useServerFn(listInvestigations);
  const report = useServerFn(buildReport);
  const [selected, setSelected] = useState<string | null>(null);
  const [onlyAccepted, setOnlyAccepted] = useState(true);

  const investigations = useQuery({ queryKey: ["investigations"], queryFn: () => list() });
  const reportQuery = useQuery({
    queryKey: ["report", selected, onlyAccepted],
    enabled: !!selected,
    queryFn: () => report({ data: { investigationId: selected!, onlyAccepted } }),
  });

  return (
    <div className="space-y-6">
      <SectionTitle title="Reports" hint="Built only from persisted, evidence-backed records." />

      <Panel className="flex flex-wrap items-center gap-3 p-4">
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
          value={selected ?? ""}
          onChange={(e) => setSelected(e.target.value || null)}
        >
          <option value="">Select an investigation…</option>
          {(investigations.data ?? []).map((i) => (
            <option key={i.id} value={i.id}>
              {i.title}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={onlyAccepted} onChange={(e) => setOnlyAccepted(e.target.checked)} />
          Approved findings only
        </label>
        {selected ? (
          <Button variant="secondary" onClick={() => window.print()}>
            Print / save PDF
          </Button>
        ) : null}
      </Panel>

      {!selected ? (
        <EmptyState title="No report selected" description="Choose an investigation to assemble its report." />
      ) : reportQuery.isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : reportQuery.error ? (
        <EmptyState title="Report unavailable" description={(reportQuery.error as Error).message} />
      ) : (
        <article className="space-y-6">
          <Panel className="p-6">
            <h1 className="text-xl font-semibold text-foreground">{reportQuery.data!.investigation.title}</h1>
            <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
              {reportQuery.data!.investigation.priority} priority · {reportQuery.data!.investigation.status} · generated{" "}
              {new Date(reportQuery.data!.generatedAt).toLocaleString()}
            </p>
            {reportQuery.data!.investigation.description ? (
              <p className="mt-3 text-sm text-muted-foreground">{reportQuery.data!.investigation.description}</p>
            ) : null}
          </Panel>

          <Panel className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Sources</h2>
            {reportQuery.data!.sources.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No sources ingested.</p>
            ) : (
              <ul className="mt-3 space-y-1 text-sm text-foreground">
                {reportQuery.data!.sources.map((s: any) => (
                  <li key={s.id} className="flex flex-wrap justify-between gap-2">
                    <span>
                      {s.title} <span className="text-muted-foreground">({s.source_type})</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {s.original_language ?? "language unknown"} · {s.processing_status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Findings</h2>
            {reportQuery.data!.findings.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No findings match this filter. Nothing unsupported is included in the report.
              </p>
            ) : (
              <div className="mt-4 space-y-6">
                {reportQuery.data!.findings.map((f: any) => (
                  <section key={f.id} className="border-t border-border/60 pt-4 first:border-0 first:pt-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-medium text-foreground">{f.title}</h3>
                      <RiskBadge level={f.risk_level} />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{f.summary}</p>
                    <div className="mt-2">
                      <ConfidenceMeter value={f.confidence} />
                    </div>
                    <FactBlock label="Facts" items={f.facts} />
                    <FactBlock label="Inference" items={f.inference} />
                    <FactBlock label="Uncertainty" items={f.uncertainty} />
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Evidence</p>
                      <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                        {(f.finding_evidence ?? []).map((fe: any, i: number) => (
                          <li key={i}>
                            “{fe.evidence?.evidence_text}” — {fe.evidence?.intelligence_sources?.title}{" "}
                            {fe.evidence?.location_reference ? `(${fe.evidence.location_reference})` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                ))}
              </div>
            )}
          </Panel>
        </article>
      )}
    </div>
  );
}

function FactBlock({ label, items }: { label: string; items: unknown }) {
  const list = Array.isArray(items) ? (items as string[]) : [];
  if (!list.length) return null;
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-foreground">
        {list.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
