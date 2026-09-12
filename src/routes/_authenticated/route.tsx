import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedShell,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/investigations", label: "Investigations" },
  { to: "/findings", label: "Findings" },
  { to: "/reports", label: "Reports" },
  { to: "/settings", label: "Settings" },
] as const;

function AuthenticatedShell() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 opacity-[0.12] [background-image:linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] [background-size:64px_64px]" />
      <header className="relative border-b border-border/70 bg-surface/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-6 py-3">
          <Link to="/dashboard" className="font-mono text-sm font-semibold uppercase tracking-[0.35em] text-foreground">
            SAHAYAK
          </Link>
          <nav className="flex flex-1 flex-wrap gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [&.active]:bg-accent [&.active]:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <button
            className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="relative mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
