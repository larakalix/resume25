# Portfolio performance

## Implemented

- The pointer glow moves with a single `translate3d` write per animation frame, outside Vue's render cycle. Its surface stays 200px square and shrinks using scale. A radial gradient replaces the blur filter. Pointer listeners and pending frames stop on hidden tabs, coarse pointers, reduced-motion preference, and component disposal. The previous idle animation and permanent `will-change` were removed.
- Shared configuration and contact components import a generated profile, not the full resume/schema. Home imports only the latest role summaries. Blog/home listings import article metadata without bodies. Full resume achievements and article bodies remain with their detail routes.
- `scripts/prepare-resume.mjs` derives summaries from the existing content sources during dev startup, production builds, and static generation. Generated snapshots are committed, checked for source parity, and never edited manually. Content edits during development require a dev restart to refresh summaries.
- Home's feature preview and supporting previews declare separate responsive image sizes. Explicit xs/sm candidates retain useful 320/640px choices. The lead remains eager and supporting previews remain lazy. No speculative preload was added.
- `pnpm perf:bundle` reports the homepage's eager JavaScript graph. It follows entry/modulepreload/static imports, counting each file once. Dynamic imports (including analytics), navigation prefetch, images, CSS, and fonts are excluded. Gzip estimates depend on the compression implementation and do not represent measured network transfer.

The current home sections are mostly simple markup and CSS interactions. No blanket hydration delay was added: navigation, filters, copy actions and disclosures remain immediately usable. Further hydration work should follow a browser main-thread profile of the remaining shared runtime.

## Validation boundary

Bundle size comparisons are local build evidence, not Lighthouse, mobile hardware, or real-user Core Web Vitals measurements. Resume/CMS export data, download content, routes, links, and analytics events remain covered by the existing regression suites. New checks cover generated summary parity and exclusion of detailed content from eager homepage JavaScript.

## Local result — October 13, 2026

| Homepage eager JavaScript | Before | After |
| --- | ---: | ---: |
| Uncompressed bytes | 430,247 | 402,018 |

Reduction: 28,229 bytes (6.56%). A same-tool Python gzip comparison estimated 150,464 → 141,058 bytes (about 9.2 KiB less, 6.25%); the Node report's compression implementation produces slightly different gzip totals. These counts exclude dynamic analytics and route prefetch.

Lint, typecheck, production build, static generation, 16 unit/content tests, and 14 production route/bundle tests passed. Browser checks covered all five pages at 375/768/1024/1440px without horizontal overflow; copy confirmation, resume expand/collapse, React/Next.js filtering and Back, and cursor rendering in both themes were checked. Computed cursor styles confirmed transform positioning, a fixed 200px surface, and no blur filter. Browser warning/error logs were empty. Visibility/reduced-motion cleanup was checked in source; no real-device CPU trace or live Core Web Vitals measurement was performed.
