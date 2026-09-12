import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getMyProfile, updateMyProfile } from "@/lib/app.functions";
import { Panel, SectionTitle } from "@/components/intel-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — SAHAYAK" },
      { name: "description", content: "Your SAHAYAK analyst profile and access role." },
      { property: "og:title", content: "Settings — SAHAYAK" },
      { property: "og:description", content: "Manage your analyst profile in SAHAYAK." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const read = useServerFn(getMyProfile);
  const write = useServerFn(updateMyProfile);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["profile"], queryFn: () => read() });
  const [name, setName] = useState("");

  useEffect(() => {
    if (data?.profile?.full_name) setName(data.profile.full_name);
  }, [data]);

  const save = useMutation({
    mutationFn: () => write({ data: { fullName: name.trim() || null } }),
    onSuccess: () => {
      toast.success("Profile updated.");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;

  return (
    <div className="max-w-xl space-y-6">
      <SectionTitle title="Settings" hint="Your analyst identity and authorisation." />
      <Panel className="space-y-4 p-5">
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={data?.profile?.email ?? ""} readOnly disabled />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="full-name">Full name</Label>
          <Input id="full-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Roles</Label>
          <p className="text-sm text-muted-foreground">
            {data?.roles?.length ? data.roles.join(", ") : "analyst"} — enforced server-side by database policy.
          </p>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save profile"}
        </Button>
      </Panel>
    </div>
  );
}
