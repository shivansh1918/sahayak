import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { createInvestigation, listInvestigations } from "@/lib/sources.functions";
import { updateInvestigation } from "@/lib/app.functions";
import { EmptyState, Panel, RiskBadge, SectionTitle, StatusChip } from "@/components/intel-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/investigations/")({
  head: () => ({
    meta: [
      { title: "Investigations — SAHAYAK" },
      { name: "description", content: "Create and manage intelligence investigations in SAHAYAK." },
      { property: "og:title", content: "Investigations — SAHAYAK" },
      { property: "og:description", content: "Every investigation collects its own multimodal sources and findings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InvestigationsPage,
});

function InvestigationsPage() {
  const list = useServerFn(listInvestigations);
  const create = useServerFn(createInvestigation);
  const update = useServerFn(updateInvestigation);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["investigations"], queryFn: () => list() });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"critical" | "high" | "medium" | "low">("medium");
  const [tags, setTags] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          title,
          description: description.trim() ? description.trim() : null,
          priority,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        },
      }),
    onSuccess: () => {
      toast.success("Investigation created.");
      setOpen(false);
      setTitle("");
      setDescription("");
      setTags("");
      qc.invalidateQueries({ queryKey: ["investigations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const archive = useMutation({
    mutationFn: (id: string) => update({ data: { investigationId: id, status: "archived" as const } }),
    onSuccess: () => {
      toast.success("Investigation archived.");
      qc.invalidateQueries({ queryKey: ["investigations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Investigations"
        hint="Each investigation is an isolated intelligence workspace."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>New investigation</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New investigation</DialogTitle>
                <DialogDescription>Sources, entities and findings are scoped to this investigation.</DialogDescription>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate();
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea id="desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Priority</Label>
                    <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating…" : "Create investigation"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState
          title="No investigations"
          description="Create an investigation to start ingesting intelligence sources."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data!.map((inv) => (
            <Panel key={inv.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <Link
                  to="/investigations/$investigationId"
                  params={{ investigationId: inv.id }}
                  className="text-base font-medium text-foreground hover:text-primary"
                >
                  {inv.title}
                </Link>
                <div className="flex shrink-0 gap-2">
                  <RiskBadge level={inv.priority} />
                  <StatusChip status={inv.status} />
                </div>
              </div>
              {inv.description ? (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{inv.description}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1">
                  {(inv.tags ?? []).map((t: string) => (
                    <span key={t} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                      {t}
                    </span>
                  ))}
                </div>
                {inv.status !== "archived" ? (
                  <button
                    className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    onClick={() => archive.mutate(inv.id)}
                  >
                    Archive
                  </button>
                ) : null}
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
