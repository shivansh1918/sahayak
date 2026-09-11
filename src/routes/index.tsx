import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SAHAYAK — Multimodal Intelligence Analysis Platform" },
      {
        name: "description",
        content:
          "SAHAYAK turns documents, images, audio, video, text and logs into structured, evidence-backed intelligence with a knowledge graph and analyst review.",
      },
      { property: "og:title", content: "SAHAYAK — Multimodal Intelligence Analysis Platform" },
      {
        property: "og:description",
        content: "From fragmented signals to structured intelligence: entities, events, correlation, findings and evidence provenance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const PIPELINE = [
  ["Multimodal intake", "PDF, images, audio, voice, video, text, CSV, JSON and logs — the original file is always preserved."],
  ["Structured extraction", "Document AI, speech-to-text, frame sampling and vision feed one common intelligence schema."],
  ["Cross-source correlation", "Entities, identifiers, locations and time windows are compared across every source."],
  ["Weak signal detection", "Patterns no single source establishes on its own are surfaced with confidence and uncertainty."],
  ["Explainable findings", "Every finding separates facts, inference and uncertainty, and links back to the original evidence."],
  ["Analyst decision", "The analyst approves, rejects or requests further investigation. The system never decides alone."],
];

function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] [background-size:64px_64px]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-mono text-sm font-semibold uppercase tracking-[0.4em] text-foreground">SAHAYAK</span>
        <Link
          to="/auth"
          className="rounded-md border border-border bg-surface/60 px-4 py-2 text-sm text-foreground transition-colors hover:bg-accent"
        >
          Sign in
        </Link>
      </header>

      <section className="relative mx-auto max-w-4xl px-6 pb-16 pt-16 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Multimodal intelligence analysis</p>
        <h1 className="mt-5 text-balance text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
          From fragmented signals to structured intelligence
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground">
          SAHAYAK ingests heterogeneous sources, extracts entities and events, discovers relationships, correlates
          across sources and produces explainable findings — every one traceable to the original evidence.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            to="/auth"
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Open the console
          </Link>
        </div>
      </section>

      <section className="relative mx-auto grid max-w-6xl gap-4 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        {PIPELINE.map(([title, body], i) => (
          <article
            key={title}
            className="rounded-xl border border-border/70 bg-card/60 p-5 shadow-[var(--shadow-panel)] backdrop-blur-sm"
          >
            <span className="font-mono text-xs text-primary">{String(i + 1).padStart(2, "0")}</span>
            <h2 className="mt-2 text-sm font-semibold text-foreground">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
