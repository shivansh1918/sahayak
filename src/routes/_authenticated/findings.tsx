import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { listAllFindings } from "@/lib/app.functions";
import { ConfidenceMeter, EmptyState, Panel, RiskBadge, SectionTitle, StatusChip } from "@/components/intel-ui";
import { Skeleton } from "@/components/ui/skeleton";

const STATUSES = ["all", "pending_review", "accepted", "rejected", "needs_more_evidence", "draft"] as const;

export const Route = createFileRoute("/_authenticated/findings")({
  head: () => ({
    meta: [
      { title: "Findings — SAHAYAK" },
      { name: "description", content: "Explainable findings awaiting analyst review across all investigations." },
      { property: "og:title", content: "Findings — SAHAYAK" },
      { property: "og:description", content: "Facts, inference and uncertainty for every generated finding." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FindingsPage,
});

function FindingsPage() {
  const fn = useServerFn(listAllFindings);
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");
  const { data, isLoading } = useQuery({
    queryKey: ["all-findings", status],
    queryFn: () => fn({ data: { status } }),
  });

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Findings"
        hint="Generated from correlated intelligence. The analyst makes the final decision."
        action={
          <div className="flex flex-wrap gap-1">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-md px-2.5 py-1 text-xs capitalize transition-colors ${
                  status === s ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        }
      />

      {isLoading ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState
          title="No findings"
          description="Findings appear after sources are processed and cross-source analysis has run."
        />
      ) : (
        <div className="space-y-3">
          {data!.map((f: any) => (
            <Panel key={f.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    to="/investigations/$investigationId"
                    params={{ investigationId: f.investigation_id }}
                    search={{ tab: "findings" }}
                    className="text-base font-medium text-foreground hover:text-primary"
                  >
                    {f.title}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">{f.investigations?.title}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <RiskBadge level={f.risk_level} />
                  <StatusChip status={f.status} />
                </div>
              </div>
              {f.summary ? <p className="mt-3 text-sm text-muted-foreground">{f.summary}</p> : null}
              <div className="mt-3">
                <ConfidenceMeter value={f.confidence} />
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
