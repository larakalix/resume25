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

## Meadow world polish — November 4, 2026

The dynamic 3D world now has explicit Battery saver, Balanced and Detailed presets plus a conservative Automatic controller. Presets change actual render resolution, shadow resolution, grass instances/distance and butterfly count. Automatic changes only during settled outdoor exploration, uses different slow/fast dwell times and a cooldown, and yields to manual selection. The eagerly loaded HTML/content boundaries remain unchanged; sound synthesis creates its single context only after an explicit opt-in.

Settings includes an optional ten-second local performance sample and JSON download. It measures delivered render intervals; the mean CPU render-call duration is separately named and is not a GPU timer. Idle rendering remains capped at 30 fps; a running sample renders up to 60 fps. Pausing/offscreen suspension or changing quality interrupts a sample so it does not silently combine quality tiers.

One stationary browser exploration sample at 1440×960, Balanced, DPR 1 recorded 59.9 fps, 17.1 ms p95 frame interval, 0.76 ms mean CPU render submission, 171 draw calls and 1,561,622 triangles. The initial downloaded report is `.impeccable/review/globe-polish/desktop-performance-initial.json`. After the camera correction, a fresh sample of the final generated output again showed 59.9 fps / 17.1 ms p95; those rendered results are recorded in `desktop-performance-final.json` and the Settings screenshot. The CPU duration and renderer counters above belong to the initial full report. This is a single local view, not a before/after performance gain, moving-camera stress test, GPU trace, Core Web Vitals result or physical-phone measurement. The user chose browser-only checks for this pass.


## Exploration V2 — November 5, 2026

One local ten-second browser sample per version, at Meadow Bridge (`x=0`, `z=-4.05`), the unchanged default follow perspective, 1280 × 720 CSS viewport, Detailed quality, daytime and clear weather:

| Browser sample | Baseline | V2 |
| --- | ---: | ---: |
| Delivered frames | 57.3 fps | 60 fps |
| 95th percentile frame | 24.1 ms | 17.1 ms |
| Observed draw-call snapshot | 291 | 306 |
| Observed triangle snapshot | 1,693,742 | 1,717,416 |

The snapshots include the new residents/props and can vary with occlusion and actor positions. These single samples establish no local regression at this view; they do not establish a general performance improvement, statistical stability, mobile hardware results or hosted Core Web Vitals. The review folder contains both bridge screenshots and the original UI report text. A preliminary sample accidentally taken from a held overview transition was discarded, and the transition bug was fixed before the final sample.

V2 uses the existing render loop and default-framebuffer capture. Weather adds at most one precipitation draw (512 desktop / 256 narrow viewport drops), omitted indoors and on Battery saver. Guidance uses one three-point draw, no lights and a prewarmed route graph. Photo mode suspends simulation/quality sampling and bounds export size without an additional scene render or permanently preserved framebuffer.
