import { createFileRoute } from "@tanstack/react-router";

import { LandingPage } from "@/components/landing/landing-page";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SAHAYAK — Multimodal Intelligence Analysis" },
      {
        name: "description",
        content: "Turn documents, images, audio, video, text and logs into structured, evidence-backed intelligence with SAHAYAK.",
      },
      { property: "og:title", content: "SAHAYAK — Multimodal Intelligence Analysis" },
      {
        property: "og:description",
        content: "From fragmented signals to structured intelligence, with cross-source correlation, provenance and analyst review.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: LandingPage,
});
