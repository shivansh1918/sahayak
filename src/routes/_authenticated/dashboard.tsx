import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getDashboard } from "@/lib/app.functions";
import { EmptyState, MetricTile, Panel, RiskBadge, SectionTitle, StatusChip } from "@/components/intel-ui";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SAHAYAK" },
      { name: "description", content: "Live intelligence posture across your SAHAYAK investigations." },
      { property: "og:title", content: "Dashboard — SAHAYAK" },
      { property: "og:description", content: "Investigations, sources, entities, patterns and findings awaiting review." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const fn = useServerFn(getDashboard);
  const { data, isLoading, error } = useQuery({ queryKey: ["dashboard"], queryFn: () => fn() });

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }
  if (error) {
    return <EmptyState title="Dashboard unavailable" description={(error as Error).message} />;
  }
  if (!data) return null;

  const m = data.metrics;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Intelligence overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">All figures are computed live from persisted records.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <MetricTile label="Active investigations" value={m.activeInvestigations} hint={`${m.investigations} total`} />
        <MetricTile label="Sources processed" value={m.sourcesProcessed} />
        <MetricTile label="Entities" value={m.entities} />
        <MetricTile label="Events" value={m.events} />
        <MetricTile label="Patterns" value={m.patterns} />
        <MetricTile label="Awaiting review" value={m.pendingFindings} />
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <SectionTitle title="Recent intelligence activity" />
          <Panel className="divide-y divide-border/60">
            {data.recentSources.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">No sources have been ingested yet.</div>
            ) : (
              data.recentSources.map((s: any) => (
                <Link
                  key={s.id}
                  to="/investigations/$investigationId"
                  params={{ investigationId: s.investigation_id }}
                  className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-accent/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{s.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.source_type} · {s.investigations?.title ?? "Investigation"}
                    </p>
                  </div>
                  <StatusChip status={s.processing_status} />
                </Link>
              ))
            )}
          </Panel>
        </div>

        <div className="space-y-3">
          <SectionTitle title="Priority findings" />
          <Panel className="divide-y divide-border/60">
            {data.priorityFindings.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">No high or critical findings yet.</div>
            ) : (
              data.priorityFindings.map((f: any) => (
                <Link
                  key={f.id}
                  to="/investigations/$investigationId"
                  params={{ investigationId: f.investigation_id }}
                  search={{ tab: "findings" }}
                  className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-accent/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{f.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{f.investigations?.title ?? ""}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <RiskBadge level={f.risk_level} />
                    <StatusChip status={f.status} />
                  </div>
                </Link>
              ))
            )}
          </Panel>
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle title="Recent analysis runs" />
        <Panel className="divide-y divide-border/60">
          {data.runs.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No analysis runs recorded.</div>
          ) : (
            data.runs.map((r: any) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm text-foreground">{r.investigations?.title ?? "Investigation"}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.sources_processed ?? 0} sources · {r.patterns_found ?? 0} patterns · {r.findings_found ?? 0} findings
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted-foreground">
                    {r.started_at ? new Date(r.started_at).toLocaleString() : ""}
                  </span>
                  <StatusChip status={r.status} />
                </div>
              </div>
            ))
          )}
        </Panel>
      </section>
    </div>
  );
}
