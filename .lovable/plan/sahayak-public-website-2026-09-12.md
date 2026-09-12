# SAHAYAK Public Website

## Goal
Replace the sparse public homepage with a premium, cinematic intelligence-grid experience while preserving the existing authenticated application, backend, routes, and product identity.

## Build
- Create a focused public landing component set for the sticky navigation, mobile menu, diagrams, content sections, and footer.
- Rebuild the `/` page around the selected **Cinematic intelligence grid** direction.
- Keep every entry CTA connected to the existing `/auth` page and use working in-page navigation for public sections.
- Present the complete product story: fragmented inputs, multimodal processing, unified intelligence model, cross-source correlation, knowledge graph, provenance, explainability, analyst review, trust, use cases, comparison, and final CTA.
- Use conceptual diagrams and restrained examples only—no fake dashboard, seeded intelligence, unsupported certifications, or claims that correlation proves intent.

## Visual Direction
- Preserve SAHAYAK’s deep navy, cyan signal accent, fine grid, monospace labels, compact radii, and evidence-oriented tone.
- Use full-width editorial bands and diagrammatic moments rather than a page made entirely of cards.
- Add subtle signal-flow and reveal motion with a reduced-motion fallback.
- Maintain strong contrast, visible focus states, semantic structure, and responsive layouts from mobile through wide desktop.

## Technical Details
- Modify `src/routes/index.tsx` for route composition and complete route-specific metadata, canonical link, and Open Graph URL.
- Add small landing-only components under `src/components/landing/`; use the existing Button component and Lucide icons.
- Extend `src/styles.css` only for shared landing tokens/animations that cannot be expressed cleanly with existing utilities.
- Leave `src/routes/auth.tsx`, all `_authenticated` routes, backend code, persistence, storage, and processing pipelines unchanged.

## Validation
- Verify the build signal and runtime console.
- Check desktop and mobile rendering for overlap, menu behavior, anchor navigation, focus behavior, and reduced motion.
- Confirm all public CTAs reach `/auth` and the authenticated workspace remains unaffected.
