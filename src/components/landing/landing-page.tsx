import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  AudioLines,
  Check,
  ChevronDown,
  CircleCheck,
  CircleHelp,
  Database,
  Eye,
  FileCode2,
  FileImage,
  FileText,
  Fingerprint,
  GitBranch,
  Menu,
  Network,
  Pause,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Video,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#intelligence", label: "Intelligence" },
  { href: "#evidence", label: "Evidence" },
  { href: "#analysts", label: "For analysts" },
];

const MODALITIES = [
  { icon: FileText, label: "Documents", detail: "Pages, tables and embedded context" },
  { icon: FileImage, label: "Images", detail: "Visible text and scene observations" },
  { icon: AudioLines, label: "Audio", detail: "Transcripts, speakers and timestamps" },
  { icon: Video, label: "Video", detail: "Frames, audio and temporal context" },
  { icon: FileCode2, label: "Text", detail: "Narratives, records and identifiers" },
  { icon: Database, label: "Logs", detail: "Structured events and technical signals" },
];

const WORKFLOW = ["Ingest", "Understand", "Structure", "Connect", "Correlate", "Explain", "Verify"];

const MODEL_OUTPUTS = ["Entities", "Events", "Relationships", "Patterns", "Findings"];

const TRUST_ITEMS = [
  [ShieldCheck, "Controlled access", "Secure authentication and investigation-level access keep analytical work bounded."],
  [Fingerprint, "Protected sources", "Original source material is preserved in protected storage and opened through time-limited access."],
  [GitBranch, "Visible provenance", "Findings remain connected to patterns, relationships, events, entities and source evidence."],
  [UserCheck, "Analyst control", "Human review remains the decision point, with uncertainty visible throughout the workflow."],
] as const;

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3" aria-label="SAHAYAK">
      <span className="relative grid size-8 place-items-center border border-primary/40 bg-primary/5" aria-hidden="true">
        <span className="size-2.5 rotate-45 bg-primary shadow-[var(--shadow-glow)]" />
      </span>
      <span className={cn("font-mono font-semibold uppercase text-foreground", compact ? "text-xs tracking-[0.25em]" : "text-sm tracking-[0.32em]")}>SAHAYAK</span>
    </span>
  );
}

function SectionHeading({ eyebrow, title, body, align = "left" }: { eyebrow: string; title: string; body?: string; align?: "left" | "center" }) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
      <h2 className="mt-4 text-balance text-3xl font-semibold leading-tight text-foreground sm:text-4xl lg:text-5xl">{title}</h2>
      {body ? <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">{body}</p> : null}
    </div>
  );
}

function PublicHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
        <a href="#top" className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><BrandMark compact /></a>
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => <a key={item.href} href={item.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{item.label}</a>)}
        </nav>
        <div className="hidden items-center gap-2 sm:flex">
          <Button asChild variant="ghost"><Link to="/auth">Sign in</Link></Button>
          <Button asChild><Link to="/auth">Enter platform <ArrowRight /></Link></Button>
        </div>
        <Button className="sm:hidden" variant="ghost" size="icon" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? <X /> : <Menu />}
        </Button>
      </div>
      {open ? (
        <nav className="border-t border-border bg-background px-5 py-4 sm:hidden" aria-label="Mobile navigation">
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => <a key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">{item.label}</a>)}
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-4">
              <Button asChild variant="outline"><Link to="/auth">Sign in</Link></Button>
              <Button asChild><Link to="/auth">Enter platform</Link></Button>
            </div>
          </div>
        </nav>
      ) : null}
    </header>
  );
}

function SignalMap() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[34rem]" aria-label="Six source types converging into structured intelligence">
      <div className="absolute inset-[12%] rounded-full border border-border/60" />
      <div className="absolute inset-[25%] rounded-full border border-primary/20" />
      <div className="absolute inset-1/2 z-20 grid size-28 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-primary/50 bg-background shadow-[var(--shadow-glow)] sm:size-36">
        <div className="text-center">
          <Network className="mx-auto size-6 text-primary" />
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground">Intelligence<br />model</p>
        </div>
      </div>
      <svg className="absolute inset-0 size-full text-primary/50" viewBox="0 0 400 400" aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeWidth="1">
          <path className="signal-path" d="M200 48 C200 118 200 135 200 154" />
          <path className="signal-path signal-delay-1" d="M334 122 C280 151 262 165 243 179" />
          <path className="signal-path signal-delay-2" d="M334 278 C279 248 262 234 243 220" />
          <path className="signal-path signal-delay-3" d="M200 352 C200 285 200 264 200 246" />
          <path className="signal-path signal-delay-4" d="M66 278 C121 248 138 234 157 220" />
          <path className="signal-path signal-delay-5" d="M66 122 C121 151 138 165 157 179" />
        </g>
      </svg>
      {[
        ["PDF", "left-1/2 top-0 -translate-x-1/2"], ["IMG", "right-1 top-[22%]"], ["AUDIO", "bottom-[18%] right-0"],
        ["VIDEO", "bottom-0 left-1/2 -translate-x-1/2"], ["TEXT", "bottom-[18%] left-0"], ["LOG", "left-1 top-[22%]"],
      ].map(([label, position]) => <div key={label} className={cn("absolute z-10 grid h-11 min-w-14 place-items-center border border-border bg-surface px-2 font-mono text-[9px] tracking-[0.14em] text-muted-foreground", position)}>{label}</div>)}
      <div className="absolute bottom-[7%] left-1/2 -translate-x-1/2 font-mono text-[9px] uppercase tracking-[0.2em] text-primary">Signals converge</div>
    </div>
  );
}

function Hero() {
  return (
    <section id="top" className="relative min-h-[calc(100svh-4rem)] overflow-hidden border-b border-border/60">
      <div className="landing-grid absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl items-center gap-10 px-5 py-16 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-20">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 border border-primary/25 bg-primary/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
            <span className="size-1.5 rounded-full bg-primary motion-safe:animate-pulse" /> Multimodal intelligence analysis
          </div>
          <h1 className="mt-7 text-balance text-5xl font-semibold uppercase leading-[0.98] text-foreground sm:text-6xl lg:text-7xl">Turn fragmented signals into structured intelligence</h1>
          <p className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">SAHAYAK brings documents, images, audio, video, text and logs into one evidence-backed model—so analysts can find connections without losing sight of the source.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 px-6"><Link to="/auth">Enter SAHAYAK <ArrowRight /></Link></Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-6"><a href="#how-it-works">See how it works <ChevronDown /></a></Button>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-border/70 pt-5 text-xs text-muted-foreground">
            {["Source-preserving", "Evidence-linked", "Analyst controlled"].map((item) => <span key={item} className="inline-flex items-center gap-2"><Check className="size-3.5 text-verified" />{item}</span>)}
          </div>
        </div>
        <SignalMap />
      </div>
      <div className="absolute bottom-0 left-1/2 hidden -translate-x-1/2 items-center gap-3 pb-5 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground lg:flex"><span className="h-px w-12 bg-border" /> Follow the signal <span className="h-px w-12 bg-border" /></div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section className="border-b border-border/60 bg-surface/30 py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:px-8">
        <SectionHeading eyebrow="The challenge" title="The signals are there. The connection is the problem." />
        <div className="grid gap-6 sm:grid-cols-2">
          <p className="text-lg leading-8 text-muted-foreground">Critical context is scattered across formats, systems and time. Reviewing each source in isolation hides the relationships that matter.</p>
          <p className="text-lg leading-8 text-muted-foreground">SAHAYAK structures every source into comparable intelligence objects, then surfaces possible links for an analyst to examine—not conclusions to accept blindly.</p>
        </div>
      </div>
    </section>
  );
}

function ModalitiesSection() {
  return (
    <section id="intelligence" className="scroll-mt-20 border-b border-border/60 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="One intake layer" title="Different sources. One intelligence language." body="Each modality follows its own processing path, then enters the same structured model for comparison and analysis." />
        <div className="mt-14 grid border-l border-t border-border sm:grid-cols-2 lg:grid-cols-3">
          {MODALITIES.map(({ icon: Icon, label, detail }, index) => (
            <article key={label} className="group border-b border-r border-border p-6 transition-colors hover:bg-surface/50 sm:p-8">
              <div className="flex items-start justify-between">
                <Icon className="size-6 text-primary" strokeWidth={1.5} />
                <span className="font-mono text-[10px] text-muted-foreground">0{index + 1}</span>
              </div>
              <h3 className="mt-12 text-xl font-semibold text-foreground">{label}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function WorkflowSection() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-b border-border/60 bg-surface/20 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="From raw data to intelligence" title="A traceable path from intake to analyst decision." align="center" />
        <div className="relative mt-16 grid gap-3 sm:grid-cols-2 lg:grid-cols-7 lg:gap-0">
          <div className="absolute left-[7%] right-[7%] top-5 hidden h-px bg-border lg:block" aria-hidden="true" />
          {WORKFLOW.map((step, index) => (
            <div key={step} className="relative flex items-center gap-4 border border-border bg-background p-4 lg:block lg:border-0 lg:bg-transparent lg:p-0 lg:text-center">
              <span className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full border border-primary/40 bg-background font-mono text-[10px] text-primary">{String(index + 1).padStart(2, "0")}</span>
              <span className="text-sm font-medium text-foreground lg:mt-5 lg:block">{step}</span>
            </div>
          ))}
        </div>
        <div className="mt-20 grid gap-px overflow-hidden border border-border bg-border lg:grid-cols-4">
          {[
            ["Documents + images", "Extract page content, tables, visible text and scene observations."],
            ["Audio", "Transcribe speech with segments and timestamps that preserve where words appeared."],
            ["Video", "Combine browser-derived frames and audio with temporal references."],
            ["Text + logs", "Parse narratives and structured records for identifiers, events and context."],
          ].map(([title, body]) => <div key={title} className="bg-background p-6 sm:p-8"><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Processing path</p><h3 className="mt-5 text-lg font-semibold text-foreground">{title}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p></div>)}
        </div>
        <div className="mt-px bg-primary/8 px-5 py-7 text-center ring-1 ring-primary/20">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Converges into one model</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">{MODEL_OUTPUTS.map((item) => <span key={item} className="border border-primary/25 bg-background px-3 py-1.5 text-xs text-foreground">{item}</span>)}</div>
        </div>
      </div>
    </section>
  );
}

function CorrelationSection() {
  return (
    <section className="border-b border-border/60 py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
        <div>
          <SectionHeading eyebrow="Cross-source correlation" title="The pattern emerges between sources." body="SAHAYAK compares entities, identifiers, places and time windows across the investigation, then presents possible connections with evidence and uncertainty intact." />
          <div className="mt-8 border-l-2 border-caution bg-caution/5 p-5">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-caution"><Radar className="size-4" /> Potential pattern</div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">A matching person reference, device identifier and location window appear across three independent sources.</p>
            <p className="mt-4 text-xs text-caution">Analytical inference · Correlation does not establish intent.</p>
          </div>
        </div>
        <div className="relative min-h-[30rem] border border-border bg-surface/30 p-6 sm:p-8">
          <div className="flex items-center justify-between border-b border-border pb-4"><span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Correlation view</span><span className="inline-flex items-center gap-2 text-xs text-verified"><span className="size-1.5 rounded-full bg-verified" />3 sources</span></div>
          <div className="relative mt-5 h-[23rem]" aria-label="Conceptual cross-source correlation map">
            <svg className="absolute inset-0 size-full text-border" viewBox="0 0 500 340" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M85 65 L250 170 L420 80"/><path d="M250 170 L400 280"/><path d="M250 170 L95 278"/></g></svg>
            {[
              ["Source 01", "Document", "left-0 top-4"], ["Source 02", "Audio", "right-0 top-8"], ["Source 03", "Log", "bottom-2 right-2"], ["Location", "Sector 7", "bottom-2 left-0"],
            ].map(([label, value, pos]) => <div key={label} className={cn("absolute z-10 w-28 border border-border bg-background p-3 sm:w-32", pos)}><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-primary">{label}</p><p className="mt-1 text-xs text-muted-foreground">{value}</p></div>)}
            <div className="absolute left-1/2 top-1/2 z-20 w-36 -translate-x-1/2 -translate-y-1/2 border border-caution/50 bg-background p-4 text-center shadow-[var(--shadow-panel)]"><UserCheck className="mx-auto size-5 text-caution"/><p className="mt-2 text-sm font-medium text-foreground">Person A</p><p className="mt-1 text-[10px] text-muted-foreground">Possible shared entity</p></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function KnowledgeGraphSection() {
  return (
    <section className="border-b border-border/60 bg-surface/20 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end"><SectionHeading eyebrow="Knowledge graph" title="See the investigation as a connected system." body="Explore the people, organizations, locations, devices and events that emerge from the evidence—along with the relationships that connect them." /><Button asChild variant="outline"><Link to="/auth">Explore in SAHAYAK <ArrowRight /></Link></Button></div>
        <div className="relative mt-14 min-h-[34rem] overflow-hidden border border-border bg-background">
          <div className="landing-grid absolute inset-0 opacity-50" />
          <svg className="absolute inset-0 size-full text-border" viewBox="0 0 1000 520" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="currentColor"><path d="M120 120 L380 230 L650 110 L840 230"/><path d="M380 230 L270 410"/><path d="M380 230 L580 400"/><path d="M650 110 L580 400"/><path d="M840 230 L580 400"/></g></svg>
          {[
            ["Person", "A. Rao", "left-[6%] top-[14%] border-primary/50"], ["Event", "Meeting", "left-[31%] top-[38%] border-caution/50"], ["Device", "ID ••82", "left-[60%] top-[12%] border-verified/50"], ["Organization", "Northline", "right-[5%] top-[38%] border-primary/50"], ["Location", "Sector 7", "bottom-[10%] left-[20%] border-border"], ["Source", "Audio 03", "bottom-[12%] left-[53%] border-border"],
          ].map(([type, name, pos]) => <div key={`${type}-${name}`} className={cn("absolute min-w-28 border bg-background p-3 shadow-[var(--shadow-panel)] sm:min-w-36", pos)}><p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{type}</p><p className="mt-1 text-sm font-medium text-foreground">{name}</p></div>)}
          <div className="absolute bottom-5 right-5 flex items-center gap-4 border border-border bg-background/90 px-4 py-3 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground"><span className="flex items-center gap-2"><span className="size-2 rounded-full bg-primary" />entity</span><span className="flex items-center gap-2"><span className="size-2 rounded-full bg-caution" />event</span><span className="flex items-center gap-2"><span className="size-2 rounded-full bg-verified" />device</span></div>
        </div>
      </div>
    </section>
  );
}

function EvidenceSection() {
  return (
    <section id="evidence" className="scroll-mt-20 border-b border-border/60 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Evidence and provenance" title="Every finding has a way back." body="SAHAYAK keeps the analytical chain visible, so a reviewer can move from a finding to the exact source context that supports it." />
        <div className="mt-14 grid gap-3 lg:grid-cols-6 lg:gap-0">
          {["Finding", "Pattern", "Relationship", "Entity", "Event", "Original evidence"].map((item, index) => (
            <div key={item} className="relative flex min-h-24 items-center border border-border bg-surface/30 p-4 lg:border-r-0 lg:last:border-r">
              <div><p className="font-mono text-[9px] text-primary">0{index + 1}</p><p className="mt-2 text-sm font-medium text-foreground">{item}</p></div>
              {index < 5 ? <ArrowRight className="absolute -right-3 z-10 hidden size-5 rounded-full bg-background p-1 text-primary lg:block" /> : null}
            </div>
          ))}
        </div>
        <div className="mt-16 grid gap-px overflow-hidden border border-border bg-border lg:grid-cols-3">
          {[
            [CircleCheck, "Facts", "Person A appears in three independent sources within the same investigation."],
            [Sparkles, "Inference", "The connected activity may indicate a shared operational context."],
            [CircleHelp, "Uncertainty", "Intent, identity certainty and the reason for co-occurrence remain unestablished."],
          ].map(([Icon, title, body]) => { const Graphic = Icon as typeof CircleCheck; return <article key={String(title)} className="bg-background p-7 sm:p-9"><Graphic className={cn("size-6", title === "Facts" ? "text-verified" : title === "Inference" ? "text-primary" : "text-caution")} /><h3 className="mt-8 text-xl font-semibold text-foreground">{title as string}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{body as string}</p></article>; })}
        </div>
      </div>
    </section>
  );
}

function AnalystSection() {
  return (
    <section id="analysts" className="scroll-mt-20 border-b border-border/60 bg-surface/20 py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
        <SectionHeading eyebrow="Analyst in the loop" title="AI surfaces the signal. The analyst makes the call." body="SAHAYAK presents evidence-backed findings with confidence and uncertainty. Analysts approve, reject, request further investigation or add context before anything becomes a decision." />
        <div className="border border-border bg-background shadow-[var(--shadow-panel)]">
          <div className="flex items-center justify-between border-b border-border px-5 py-4"><span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Finding review</span><span className="border border-caution/40 bg-caution/10 px-2 py-1 font-mono text-[9px] uppercase text-caution">Awaiting review</span></div>
          <div className="p-5 sm:p-7"><p className="text-lg font-semibold text-foreground">Repeated co-occurrence across source types</p><p className="mt-3 text-sm leading-6 text-muted-foreground">A person reference and device identifier recur across a document, audio segment and technical log.</p><div className="mt-6"><div className="flex justify-between text-xs"><span className="text-muted-foreground">Confidence</span><span className="font-mono text-primary">78%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full w-[78%] bg-primary" /></div></div><div className="mt-7 grid gap-2 sm:grid-cols-2">{[[Check,"Approve"],[X,"Reject"],[Search,"Investigate further"],[FileText,"Add note"]].map(([Icon,label]) => { const Graphic=Icon as typeof Check; return <Button key={String(label)} variant="outline" className="justify-start"><Graphic />{label as string}</Button>; })}</div></div>
        </div>
      </div>
    </section>
  );
}

function TrustAndUseCases() {
  return (
    <>
      <section className="border-b border-border/60 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Built for sensitive work" title="Control, context and accountability by design." />
          <div className="mt-14 grid gap-px overflow-hidden border border-border bg-border md:grid-cols-2 lg:grid-cols-4">{TRUST_ITEMS.map(([Icon,title,body]) => <article key={title} className="bg-background p-7"><Icon className="size-6 text-primary" strokeWidth={1.5}/><h3 className="mt-8 font-semibold text-foreground">{title}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p></article>)}</div>
        </div>
      </section>
      <section className="border-b border-border/60 bg-surface/20 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Operational uses" title="A common layer for complex investigations." body="Apply the same evidence-first workflow wherever information arrives fragmented and decisions require a defensible chain of reasoning." />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{["Investigative analysis","Threat intelligence","Due diligence","Incident reconstruction"].map((item,index)=><div key={item} className="border-t border-primary/50 bg-background py-6"><span className="font-mono text-[9px] text-muted-foreground">0{index+1}</span><h3 className="mt-5 text-lg font-medium text-foreground">{item}</h3></div>)}</div>
          <div className="mt-20 grid overflow-hidden border border-border lg:grid-cols-2">
            <div className="bg-surface/40 p-7 sm:p-10"><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Traditional workflow</p><ul className="mt-8 space-y-5 text-sm text-muted-foreground">{["Sources reviewed in separate tools","Connections tracked manually","Reasoning detached from evidence","Review context scattered across notes"].map((item)=><li key={item} className="flex gap-3"><Pause className="mt-0.5 size-4 shrink-0 text-muted-foreground"/>{item}</li>)}</ul></div>
            <div className="border-t border-border bg-primary/5 p-7 sm:p-10 lg:border-l lg:border-t-0"><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">With SAHAYAK</p><ul className="mt-8 space-y-5 text-sm text-foreground">{["Modalities normalized into one model","Possible links surfaced across sources","Facts, inference and uncertainty separated","Every finding traceable to evidence"].map((item)=><li key={item} className="flex gap-3"><Check className="mt-0.5 size-4 shrink-0 text-verified"/>{item}</li>)}</ul></div>
          </div>
        </div>
      </section>
    </>
  );
}

function FinalCta() {
  return (
    <section className="relative overflow-hidden py-28 sm:py-36">
      <div className="landing-grid absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-6">
        <Eye className="mx-auto size-8 text-primary" strokeWidth={1.5} />
        <h2 className="mt-7 text-balance text-4xl font-semibold uppercase leading-tight text-foreground sm:text-6xl">Turn signals into understanding.</h2>
        <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-8 text-muted-foreground">Bring your sources into one evidence-backed analytical workspace.</p>
        <Button asChild size="lg" className="mt-9 h-12 px-7"><Link to="/auth">Enter SAHAYAK <ArrowRight /></Link></Button>
      </div>
    </section>
  );
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} className="text-xs text-muted-foreground transition-colors hover:text-foreground">{children}</a>;
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />
      <main>
        <Hero />
        <ProblemSection />
        <ModalitiesSection />
        <WorkflowSection />
        <CorrelationSection />
        <KnowledgeGraphSection />
        <EvidenceSection />
        <AnalystSection />
        <TrustAndUseCases />
        <FinalCta />
      </main>
      <footer className="border-t border-border bg-surface/30">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div><BrandMark compact /><p className="mt-3 text-xs text-muted-foreground">From fragmented signals to structured intelligence.</p></div>
          <nav className="flex flex-wrap gap-x-6 gap-y-3" aria-label="Footer navigation"><FooterLink href="#how-it-works">How it works</FooterLink><FooterLink href="#evidence">Evidence</FooterLink><FooterLink href="#analysts">For analysts</FooterLink><Link to="/auth" className="text-xs text-primary hover:text-primary/80">Enter platform</Link></nav>
        </div>
      </footer>
    </div>
  );
}
