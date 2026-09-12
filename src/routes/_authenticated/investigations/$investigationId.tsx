import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { deleteSource, getInvestigation, getSourceDetail, processSource } from "@/lib/sources.functions";
import {
  decideMatchCandidate,
  getEntityDetail,
  getFindingDetail,
  getGraph,
  listEntities,
  listFindings,
  listMatchCandidates,
  listPatterns,
  listTimeline,
  reviewFinding,
  runAnalysis,
  searchInvestigation,
} from "@/lib/analysis.functions";
import { updateInvestigation } from "@/lib/app.functions";
import { UploadPanel } from "@/components/upload-panel";
import { GraphCanvas } from "@/components/graph-canvas";
import { EvidenceList, useOpenOriginal } from "@/components/evidence-list";
import { ConfidenceMeter, EmptyState, MetricTile, Panel, RiskBadge, SectionTitle, StatusChip } from "@/components/intel-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TABS = ["overview", "intelligence", "graph", "findings"] as const;
type Tab = (typeof TABS)[number];

export const Route = createFileRoute("/_authenticated/investigations/$investigationId")({
  validateSearch: z.object({ tab: z.enum(TABS).default("overview") }),
  head: () => ({
    meta: [
      { title: "Investigation workspace — SAHAYAK" },
      { name: "description", content: "Sources, entities, events, graph and findings for one investigation." },
      { property: "og:title", content: "Investigation workspace — SAHAYAK" },
      { property: "og:description", content: "Multimodal intelligence workspace with evidence provenance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Workspace,
});

function Workspace() {
  const { investigationId } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const qc = useQueryClient();

  const get = useServerFn(getInvestigation);
  const analyse = useServerFn(runAnalysis);
  const update = useServerFn(updateInvestigation);

  const { data, isLoading, error } = useQuery({
    queryKey: ["investigation", investigationId],
    queryFn: () => get({ data: { investigationId } }),
    refetchInterval: (q) =>
      (q.state.data?.sources ?? []).some((s: any) => ["pending", "processing", "queued"].includes(s.processing_status ?? ""))
        ? 5000
        : false,
  });

  const analysis = useMutation({
    mutationFn: () => analyse({ data: { investigationId } }),
    onSuccess: (r: any) => {
      toast.success(`Analysis complete — ${r.patterns} patterns, ${r.findings} findings.`);
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patch = useMutation({
    mutationFn: (input: Record<string, unknown>) => update({ data: { investigationId, ...input } as any }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["investigation", investigationId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (error) return <EmptyState title="Investigation unavailable" description={(error as Error).message} />;
  if (!data) return null;

  const inv = data.investigation;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{inv.title}</h1>
          {inv.description ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{inv.description}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={inv.priority ?? "medium"} onValueChange={(v) => patch.mutate({ priority: v })}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["critical", "high", "medium", "low"].map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={inv.status ?? "active"} onValueChange={(v) => patch.mutate({ status: v })}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["active", "monitoring", "closed", "archived"].map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => analysis.mutate()} disabled={analysis.isPending}>
            {analysis.isPending ? "Correlating…" : "Run cross-source analysis"}
          </Button>
        </div>
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-border/60 pb-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => navigate({ search: { tab: t } })}
            className={`rounded-md px-3 py-1.5 text-sm capitalize transition-colors ${
              tab === t ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "overview" ? <OverviewTab data={data} /> : null}
      {tab === "intelligence" ? <IntelligenceTab investigationId={investigationId} sources={data.sources} /> : null}
      {tab === "graph" ? <GraphTab investigationId={investigationId} /> : null}
      {tab === "findings" ? <FindingsTab investigationId={investigationId} /> : null}
    </div>
  );
}

function OverviewTab({ data }: { data: any }) {
  const run = data.lastRun;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <MetricTile label="Sources" value={data.sources.length} />
        <MetricTile label="Entities" value={data.counts.entities} />
        <MetricTile label="Events" value={data.counts.events} />
        <MetricTile label="Relationships" value={data.counts.relationships} />
        <MetricTile label="Patterns" value={data.counts.patterns} />
        <MetricTile label="Findings" value={data.counts.findings} />
      </div>

      <Panel className="p-5">
        <SectionTitle title="Latest analysis run" />
        {!run ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No analysis run yet. Ingest sources, then run cross-source analysis.
          </p>
        ) : (
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            <div className="flex flex-wrap items-center gap-3">
              <StatusChip status={run.status} />
              <span>
                {run.sources_processed ?? 0} sources · {run.patterns_found ?? 0} patterns · {run.findings_found ?? 0} findings
              </span>
            </div>
            <p className="font-mono text-xs">
              started {run.started_at ? new Date(run.started_at).toLocaleString() : "—"}
              {run.completed_at ? ` · completed ${new Date(run.completed_at).toLocaleString()}` : ""}
            </p>
            {run.error_summary ? <p className="text-xs text-destructive">{run.error_summary}</p> : null}
          </div>
        )}
      </Panel>
    </div>
  );
}

function IntelligenceTab({ investigationId, sources }: { investigationId: string; sources: any[] }) {
  const qc = useQueryClient();
  const reprocess = useServerFn(processSource);
  const remove = useServerFn(deleteSource);
  const entitiesFn = useServerFn(listEntities);
  const timelineFn = useServerFn(listTimeline);
  const matchesFn = useServerFn(listMatchCandidates);
  const decideFn = useServerFn(decideMatchCandidate);
  const searchFn = useServerFn(searchInvestigation);

  const [openSourceId, setOpenSourceId] = useState<string | null>(null);
  const [openEntityId, setOpenEntityId] = useState<string | null>(null);
  const [entityQuery, setEntityQuery] = useState("");
  const [term, setTerm] = useState("");
  const [submitted, setSubmitted] = useState("");

  const entities = useQuery({
    queryKey: ["entities", investigationId, entityQuery],
    queryFn: () => entitiesFn({ data: { investigationId, search: entityQuery } }),
  });
  const timeline = useQuery({
    queryKey: ["timeline", investigationId],
    queryFn: () => timelineFn({ data: { investigationId } }),
  });
  const matches = useQuery({
    queryKey: ["matches", investigationId],
    queryFn: () => matchesFn({ data: { investigationId } }),
  });
  const search = useQuery({
    queryKey: ["search", investigationId, submitted],
    enabled: submitted.length > 0,
    queryFn: () => searchFn({ data: { investigationId, query: submitted } }),
  });

  const retry = useMutation({
    mutationFn: (id: string) => reprocess({ data: { sourceId: id, force: true } }),
    onSuccess: () => {
      toast.success("Reprocessed.");
      qc.invalidateQueries({ queryKey: ["investigation", investigationId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { sourceId: id } }),
    onSuccess: () => {
      toast.success("Source removed.");
      qc.invalidateQueries({ queryKey: ["investigation", investigationId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const decide = useMutation({
    mutationFn: (v: { candidateId: string; status: "confirmed" | "rejected" }) => decideFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches", investigationId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <UploadPanel investigationId={investigationId} />

      <section className="space-y-3">
        <SectionTitle title="Sources" />
        {sources.length === 0 ? (
          <EmptyState
            title="No intelligence sources"
            description="Upload a PDF, image, audio, video, text or log to begin."
          />
        ) : (
          <Panel className="divide-y divide-border/60">
            {sources.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <button className="min-w-0 text-left" onClick={() => setOpenSourceId(s.id)}>
                  <p className="truncate text-sm text-foreground hover:text-primary">{s.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.source_type} · {s.original_filename} · {s.original_language ?? "language unknown"}
                  </p>
                  {s.processing_error ? <p className="text-xs text-destructive">{s.processing_error}</p> : null}
                </button>
                <div className="flex items-center gap-3">
                  <StatusChip status={s.processing_status} />
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => retry.mutate(s.id)}
                    disabled={retry.isPending}
                  >
                    Reprocess
                  </button>
                  <button className="text-xs text-destructive hover:underline" onClick={() => del.mutate(s.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </Panel>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <SectionTitle title="Entities" />
          <Input placeholder="Filter entities" value={entityQuery} onChange={(e) => setEntityQuery(e.target.value)} />
          <Panel className="max-h-96 divide-y divide-border/60 overflow-auto">
            {(entities.data?.length ?? 0) === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">No entities extracted yet.</p>
            ) : (
              entities.data!.map((e: any) => (
                <button
                  key={e.id}
                  onClick={() => setOpenEntityId(e.id)}
                  className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-accent/40"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-foreground">{e.name}</span>
                    <span className="block text-xs text-muted-foreground">{e.entity_type}</span>
                  </span>
                  <ConfidenceMeter value={e.confidence} />
                </button>
              ))
            )}
          </Panel>
        </div>

        <div className="space-y-3">
          <SectionTitle title="Timeline" />
          <Panel className="max-h-96 divide-y divide-border/60 overflow-auto">
            {(timeline.data?.length ?? 0) === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">No events extracted yet.</p>
            ) : (
              timeline.data!.map((ev: any) => (
                <div key={ev.id} className="p-3">
                  <p className="text-sm text-foreground">{ev.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {ev.event_time ? new Date(ev.event_time).toLocaleString() : (ev.event_time_text ?? "time unknown")}
                    {ev.location_text ? ` · ${ev.location_text}` : ""}
                  </p>
                  {(ev.event_participants ?? []).length ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {ev.event_participants.map((p: any) => p.entities?.name).filter(Boolean).join(", ")}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </Panel>
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle title="Possible entity matches" hint="Nothing is merged without your decision." />
        <Panel className="divide-y divide-border/60">
          {(matches.data?.length ?? 0) === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">No candidate matches.</p>
          ) : (
            matches.data!.map((m: any) => (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm text-foreground">
                    {m.a?.name} ↔ {m.b?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{m.reason}</p>
                  <ConfidenceMeter value={m.confidence} />
                </div>
                {m.status === "pending" ? (
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => decide.mutate({ candidateId: m.id, status: "confirmed" })}>
                      Merge alias
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => decide.mutate({ candidateId: m.id, status: "rejected" })}>
                      Keep separate
                    </Button>
                  </div>
                ) : (
                  <StatusChip status={m.status} />
                )}
              </div>
            ))
          )}
        </Panel>
      </section>

      <section className="space-y-3">
        <SectionTitle title="Search this investigation" />
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(term.trim());
          }}
        >
          <Input placeholder="Search entities, events, findings and evidence" value={term} onChange={(e) => setTerm(e.target.value)} />
          <Button type="submit">Search</Button>
        </form>
        {search.data ? (
          <Panel className="space-y-3 p-4 text-sm">
            <ResultGroup label="Entities" items={search.data.entities.map((e: any) => e.name)} />
            <ResultGroup label="Events" items={search.data.events.map((e: any) => e.title)} />
            <ResultGroup label="Findings" items={search.data.findings.map((e: any) => e.title)} />
            <ResultGroup label="Evidence" items={search.data.evidence.map((e: any) => e.evidence_text ?? "")} />
          </Panel>
        ) : null}
      </section>

      <SourceDialog sourceId={openSourceId} onClose={() => setOpenSourceId(null)} />
      <EntityDialog entityId={openEntityId} onClose={() => setOpenEntityId(null)} />
    </div>
  );
}

function ResultGroup({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label} ({items.length})
      </p>
      {items.length ? (
        <ul className="mt-1 space-y-0.5 text-foreground">
          {items.slice(0, 10).map((t, i) => (
            <li key={i} className="truncate">
              {t}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No matches.</p>
      )}
    </div>
  );
}

function SourceDialog({ sourceId, onClose }: { sourceId: string | null; onClose: () => void }) {
  const fn = useServerFn(getSourceDetail);
  const openOriginal = useOpenOriginal();
  const { data, isLoading } = useQuery({
    queryKey: ["source", sourceId],
    enabled: !!sourceId,
    queryFn: () => fn({ data: { sourceId: sourceId! } }),
  });

  return (
    <Dialog open={!!sourceId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-auto">
        <DialogHeader>
          <DialogTitle>{data?.source?.title ?? "Source"}</DialogTitle>
        </DialogHeader>
        {isLoading || !data ? (
          <Skeleton className="h-64" />
        ) : (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <StatusChip status={data.source.processing_status} />
              <span className="text-muted-foreground">
                {data.source.source_type} · {data.source.original_language ?? "language unknown"}
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => openOriginal("intelligence-sources", data.source.storage_path!)}
              >
                Open original
              </Button>
            </div>

            {data.pages.length ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Document pages</p>
                <div className="mt-2 space-y-3">
                  {data.pages.map((p: any) => (
                    <div key={p.page_number} className="rounded-md border border-border/60 p-3">
                      <p className="text-xs text-muted-foreground">Page {p.page_number}</p>
                      <p className="mt-1 whitespace-pre-wrap text-foreground">{p.extracted_content}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {data.transcript ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Transcript ({data.transcript.language ?? "language unknown"})
                </p>
                <div className="mt-2 space-y-1">
                  {data.segments.length ? (
                    data.segments.map((s: any, i: number) => (
                      <p key={i} className="text-foreground">
                        <span className="font-mono text-xs text-muted-foreground">
                          {s.start_time !== null ? `${s.start_time.toFixed(1)}s` : "--"}
                          {s.speaker_label ? ` ${s.speaker_label}` : ""}
                        </span>{" "}
                        {s.text}
                      </p>
                    ))
                  ) : (
                    <p className="whitespace-pre-wrap text-foreground">{data.transcript.transcript}</p>
                  )}
                </div>
              </div>
            ) : null}

            {data.frames.length ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Video frames</p>
                <div className="mt-2 space-y-2">
                  {data.frames.map((f: any) => (
                    <div key={f.id} className="rounded-md border border-border/60 p-3">
                      <p className="text-xs text-muted-foreground">
                        Frame {f.frame_index} at {Number(f.timestamp_seconds ?? 0).toFixed(1)}s · {f.analysis_status}
                      </p>
                      {(f.visual_observations ?? []).map((o: any, i: number) => (
                        <p key={i} className="mt-1 text-foreground">
                          {o.observation_type === "ocr" ? "Visible text: " : ""}
                          {o.observation_text}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Processing jobs</p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {data.jobs.map((j: any, i: number) => (
                  <li key={i}>
                    {j.provider}/{j.job_type} — {j.status}
                    {j.error_message ? ` · ${j.error_message}` : ""}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Evidence from this source</p>
              <div className="mt-2">
                <EvidenceList evidence={data.evidence as any} />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EntityDialog({ entityId, onClose }: { entityId: string | null; onClose: () => void }) {
  const fn = useServerFn(getEntityDetail);
  const { data, isLoading } = useQuery({
    queryKey: ["entity", entityId],
    enabled: !!entityId,
    queryFn: () => fn({ data: { entityId: entityId! } }),
  });

  return (
    <Dialog open={!!entityId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-auto">
        <DialogHeader>
          <DialogTitle>{data?.entity?.name ?? "Entity"}</DialogTitle>
        </DialogHeader>
        {isLoading || !data ? (
          <Skeleton className="h-64" />
        ) : (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-muted-foreground">{data.entity.entity_type}</span>
              <ConfidenceMeter value={data.entity.confidence} />
              {data.entity.risk_score !== null ? (
                <span className="text-xs text-muted-foreground">risk {Math.round(data.entity.risk_score * 100)}%</span>
              ) : null}
            </div>
            {data.entity.description ? <p className="text-foreground">{data.entity.description}</p> : null}
            {data.aliases.length ? (
              <p className="text-xs text-muted-foreground">Aliases: {data.aliases.map((a: any) => a.alias).join(", ")}</p>
            ) : null}
            {data.counterparts.length ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Connected entities</p>
                <p className="mt-1 text-foreground">{data.counterparts.map((c: any) => c.name).join(", ")}</p>
              </div>
            ) : null}
            {data.events.length ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Events</p>
                <ul className="mt-1 space-y-0.5 text-foreground">
                  {data.events.map((e: any, i: number) => (
                    <li key={i}>
                      {e.events?.title} {e.role ? `(${e.role})` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Evidence</p>
              <div className="mt-2">
                <EvidenceList evidence={data.evidence as any} />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function GraphTab({ investigationId }: { investigationId: string }) {
  const fn = useServerFn(getGraph);
  const [entityId, setEntityId] = useState<string | null>(null);
  const [edge, setEdge] = useState<any>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["graph", investigationId],
    queryFn: () => fn({ data: { investigationId } }),
  });

  if (isLoading) return <Skeleton className="h-[560px] rounded-xl" />;
  if (!data || data.nodes.length === 0) {
    return (
      <EmptyState
        title="Knowledge graph is empty"
        description="Process sources and run cross-source analysis to populate entities and relationships."
      />
    );
  }

  const nodeName = (id: string | null) => data.nodes.find((n: any) => n.id === id)?.name ?? "unknown";

  return (
    <div className="space-y-4">
      <GraphCanvas nodes={data.nodes as any} edges={data.edges as any} onSelectNode={setEntityId} onSelectEdge={setEdge} />
      <Dialog open={!!edge} onOpenChange={(o) => !o && setEdge(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Relationship</DialogTitle>
          </DialogHeader>
          {edge ? (
            <div className="space-y-2 text-sm">
              <p className="text-foreground">
                {nodeName(edge.source_entity_id)} — {String(edge.relationship_type).replace(/_/g, " ")} —{" "}
                {nodeName(edge.target_entity_id)}
              </p>
              <ConfidenceMeter value={edge.confidence} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <EntityDialog entityId={entityId} onClose={() => setEntityId(null)} />
    </div>
  );
}

function FindingsTab({ investigationId }: { investigationId: string }) {
  const patternsFn = useServerFn(listPatterns);
  const findingsFn = useServerFn(listFindings);
  const [openId, setOpenId] = useState<string | null>(null);

  const patterns = useQuery({
    queryKey: ["patterns", investigationId],
    queryFn: () => patternsFn({ data: { investigationId } }),
  });
  const findings = useQuery({
    queryKey: ["findings", investigationId],
    queryFn: () => findingsFn({ data: { investigationId, status: "all" as const } }),
  });

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <SectionTitle title="Detected patterns" hint="Weak signals no single source establishes alone." />
        {(patterns.data?.length ?? 0) === 0 ? (
          <EmptyState title="No patterns yet" description="Run cross-source analysis after at least one source is processed." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {patterns.data!.map((p: any) => (
              <Panel key={p.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{p.title}</p>
                  <RiskBadge level={p.risk_level} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {p.source_count ?? 0} sources · {p.evidence_count ?? 0} evidence items
                </p>
                <div className="mt-2">
                  <ConfidenceMeter value={p.confidence} />
                </div>
                {p.uncertainty ? <p className="mt-2 text-xs text-caution">Uncertainty: {p.uncertainty}</p> : null}
              </Panel>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <SectionTitle title="Findings" hint="Each finding separates facts, inference and uncertainty." />
        {(findings.data?.length ?? 0) === 0 ? (
          <EmptyState title="No findings" description="Findings are generated from supported patterns during analysis." />
        ) : (
          <div className="space-y-3">
            {findings.data!.map((f: any) => (
              <Panel key={f.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <button className="text-left" onClick={() => setOpenId(f.id)}>
                    <p className="text-base font-medium text-foreground hover:text-primary">{f.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{f.summary}</p>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    <RiskBadge level={f.risk_level} />
                    <StatusChip status={f.status} />
                  </div>
                </div>
                <div className="mt-3">
                  <ConfidenceMeter value={f.confidence} />
                </div>
              </Panel>
            ))}
          </div>
        )}
      </section>

      <FindingDialog findingId={openId} onClose={() => setOpenId(null)} investigationId={investigationId} />
    </div>
  );
}

function FindingDialog({
  findingId,
  onClose,
  investigationId,
}: {
  findingId: string | null;
  onClose: () => void;
  investigationId: string;
}) {
  const detailFn = useServerFn(getFindingDetail);
  const reviewFn = useServerFn(reviewFinding);
  const qc = useQueryClient();
  const [notes, setNotes] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["finding", findingId],
    enabled: !!findingId,
    queryFn: () => detailFn({ data: { findingId: findingId! } }),
  });

  const review = useMutation({
    mutationFn: (decision: "accepted" | "rejected" | "needs_more_evidence") =>
      reviewFn({ data: { findingId: findingId!, decision, notes: notes.trim() || null } }),
    onSuccess: () => {
      toast.success("Decision recorded.");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["finding", findingId] });
      qc.invalidateQueries({ queryKey: ["findings", investigationId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!findingId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-auto">
        <DialogHeader>
          <DialogTitle>{data?.finding?.title ?? "Finding"}</DialogTitle>
        </DialogHeader>
        {isLoading || !data ? (
          <Skeleton className="h-72" />
        ) : (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <RiskBadge level={data.finding.risk_level} />
              <StatusChip status={data.finding.status} />
              <ConfidenceMeter value={data.finding.confidence} />
            </div>
            <p className="text-foreground">{data.finding.summary}</p>
            {data.finding.detection_reason ? (
              <p className="text-xs text-muted-foreground">Why this surfaced: {data.finding.detection_reason}</p>
            ) : null}

            <Claims label="Facts" tone="text-verified" items={data.finding.facts} />
            <Claims label="Inference" tone="text-primary" items={data.finding.inference} />
            <Claims label="Uncertainty" tone="text-caution" items={data.finding.uncertainty} />

            {data.finding.patterns ? (
              <div className="rounded-md border border-border/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Originating pattern</p>
                <p className="mt-1 text-foreground">{(data.finding as any).patterns.title}</p>
                <p className="text-xs text-muted-foreground">{(data.finding as any).patterns.description}</p>
              </div>
            ) : null}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Evidence chain</p>
              <div className="mt-2">
                <EvidenceList evidence={data.evidence as any} />
              </div>
            </div>

            <div className="space-y-3 border-t border-border/60 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Analyst decision</p>
              <Textarea rows={3} placeholder="Analyst note (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => review.mutate("accepted")} disabled={review.isPending}>
                  Approve
                </Button>
                <Button size="sm" variant="secondary" onClick={() => review.mutate("needs_more_evidence")} disabled={review.isPending}>
                  Request further investigation
                </Button>
                <Button size="sm" variant="ghost" onClick={() => review.mutate("rejected")} disabled={review.isPending}>
                  Reject
                </Button>
              </div>
              {data.reviews.length ? (
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {data.reviews.map((r: any) => (
                    <li key={r.id}>
                      {r.decision.replace(/_/g, " ")} · {new Date(r.created_at).toLocaleString()}
                      {r.notes ? ` — ${r.notes}` : ""}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Claims({ label, items, tone }: { label: string; items: unknown; tone: string }) {
  const list = Array.isArray(items) ? (items as string[]) : [];
  if (!list.length) return null;
  return (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-wider ${tone}`}>{label}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-foreground">
        {list.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
