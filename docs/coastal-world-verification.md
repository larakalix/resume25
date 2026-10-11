# Coastal world: local acceptance record

Verified on November 5, 2026 in the local production/static preview at `http://127.0.0.1:4173/`. The archipelago is the homepage default; `/?world=archipelago` explicitly selects it and `/?world=legacy` retains the previous world for comparison. Deployment is separate.

## Build and regression gates

| Gate | Result |
| --- | --- |
| `pnpm lint` | Passed |
| `pnpm typecheck` | Passed |
| `pnpm test:unit` | 440 passed, zero failed |
| `pnpm build` | Passed, production Node output |
| `pnpm test:site` | 16 passed, zero failed |
| `pnpm generate` | Passed, 26 prerendered routes |
| `git diff --check` | Passed |

Tests include the new authored world/asset/cast contracts, DOM-free compiler, real CUTES geometry/UV/atlas/skin/clip identity, root-motion removal and travel-driven poses, independent skeleton ownership, all seasonal hats, actual ferry canopy clearance, deck geometry/collision agreement, road connectivity, dense resident routes, staging/cleanup, all room contracts, ferry clock/skip behavior, delivery and passport migration/reset.

CMS content, resume facts, portfolio URLs, exports and dependencies were preserved. The new world lives under `src/experience/archipelago/`; the shared scene accepts a compiled world adapter while retaining one clock, render loop, controls and interaction systems.

## Browser acceptance

There are **101 passing assertions** across four browser reports, with no page exceptions or reported browser errors:

- `browser-report.json`: 28 checks, including real imported cast, walking/crouch/jump/wave, orbit/recenter, direct keyboard recovery from Ivan dialogue, photo clock/restoration, full ferry/skip, drizzle, responsive HUD/settings and reduced motion.
- `broad-browser-report.json`: 60 checks. Bare `/` loads the new default. All eleven rooms render, four stair transitions work, exterior returns match the new map, pet actions remain usable, ducks approach/feed/resume roaming, footsteps appear/expire, holiday hats work and Calm/Night preserve deliberate movement.
- `deep-browser-report.json`: 10 checks for workshop completion, the entire three-stop delivery and persistence, ferry/photo/reduced-motion interaction, pause and Reset/reload.
- `storage-browser-report.json`: 3 checks: readable saved progress with every localStorage mutation denied, Reset's history fallback, and same-entry reload without resurrecting stale stamps.

Viewports: **375×812, 768×1024, 1024×768, 1440×900 and 844×390**. The mobile pass sends simultaneous joystick and scenery touches through Chrome's input protocol and cancels interrupted gestures. Reduced-motion media preference is explicitly exercised.

The full browser capture was repeated after the final canopy polish; a recorded frame was also inspected to verify the passenger stays readable beneath its cutaway roof. The larger room/animal/storage pass remains applicable because that polish changes only ferry roof geometry/material presentation and retains the same passenger offset; the real-character clearance test covers every hat.

The sand browser check produced five accepted footprint instances and observed all expire after 8.534 seconds of active world time. Unit regressions preserve the 96-print pool, eight-second lifetime and fade beginning at five seconds.

## Matched browser performance

Fresh isolated Chrome/ANGLE Metal browser/context per world, 1440×900, DPR 1, Balanced, Day, Clear weather, sound off, Calm off. Each uses the same ten-second keyboard walking/running/jump/wave workload at its authored spawn. OS/driver caches and other system activity are not reset. One sample per world is a local comparison, not a cross-device benchmark.

| Measurement | Legacy | Archipelago |
| --- | ---: | ---: |
| Recorded fps | 58.1 | 57 |
| p95 frame interval | 24.7 ms | 25 ms |
| Mean render CPU submission | 1.49 ms | 1.42 ms |
| Draw calls | 302 | 198 |
| Triangles | 1,539,064 | 1,330,869 |
| Readiness from local navigation | 3.714 s | 4.767 s |
| Initial encoded same-origin resources | 4.266 MB | 6.421 MB |

The richer cast raises initial resource cost and adds roughly one second to this local readiness sample. District staging shares house and Japanese catalogs, uses explicit distant proxies and upgrades actual native geometry as areas come into view; the initial overview caused both catalogs to load in this measured view, so no initial-byte reduction is claimed. Buildings and resident animation use horizon/proximity limits, and vegetation retains the existing global budget.

`performance-comparison.json` and the two `performance-*-sample.json` files contain workload, timings, resource and renderer details. Render CPU time measures command submission, not complete GPU execution. The recording frame rate is separate from these renderer samples.

## Review artifacts

All artifacts are local under `.impeccable/review/archipelago/`:

- `master-map.svg`, `master-map.json`, `master-map.png`: deterministic sampled master map; definition SHA-256 `de983d6531a8439cd9c5f61d8f9d2034d03b1167c3271ab6e995720090adbb61`.
- `desktop-overview.png`, `desktop-bridge.png`, `desktop-harbor.png`, `desktop-market.png`, `desktop-orchard.png`, `desktop-coast.png`, `desktop-ivan-conversation.png`, `desktop-ferry.png`.
- `overview-375.png`, `walking-375.png` and corresponding tablet/laptop/short-landscape captures, plus settings and reduced-motion captures.
- `character-movement.mp4`, `ferry-ride.mp4`: short H.264 recordings trimmed with margins around the recorded actions. Raw recordings and conservative timestamp metadata remain available.
- `postcard-harbor-day.png`, `postcard-harbor-night.png`: actual downloadable 1440×900 PNGs, inspected for orientation, colors, caption and nonblank content.
- `media-verification.json`, browser/performance reports and `*-final.log` gate output.

Physical-phone gesture validation, Safari/other-GPU testing, hosted loading and deployment were not part of this local browser delivery. If both durable storage and history writes are forbidden, Reset can only guarantee a fresh current session; the same-history-entry fallback was explicitly checked.
