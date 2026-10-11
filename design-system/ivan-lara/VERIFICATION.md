# Portfolio refresh verification

Local verification, October 10, 2026. No deployment or external CMS connection was performed.

## Automated checks

- `pnpm lint` and `pnpm typecheck`: pass.
- `pnpm test:unit`: 9 tests pass, including actual collection-component SSR rendering, state precedence, filter normalization, shared formatting, clipboard failure, and content-driven resume contracts.
- `pnpm generate`: pass, 18 prerendered routes/payloads.
- `pnpm build`: pass.
- `pnpm test:site`: 12 tests pass against the production build, including all pages/articles, downloads, resume content, previews, and real 404 responses.
- `git diff --check`: pass.
- Build emits the existing Nuxt module-preload-polyfill sourcemap warning; both builds complete successfully.

## Browser checks

All five main routes and all three article routes have one primary heading and no horizontal overflow at 375, 768, 1024, and 1440px in light mode. All eight routes also pass at 375 and 1440px in dark mode.

Verified keyboard activation and visible focus, project filter query changes and browser Back, direct filtered-page reload without hydration warnings, explicit demo show/hide without autoplay, individual resume disclosures and Expand all/Collapse all, copy-email success, and article reading-progress changes while scrolling. Education anchors settle 64px below the viewport top. Footer social controls measure 44px tall. Home section observers reveal all content after scrolling. The final contact copy check produces no browser warnings/errors.

Clipboard rejection/unavailable cases are covered by unit tests; a real browser permission failure was not forced. Reduced-motion CSS removes transitions, animation, and smooth scrolling and displays pending sections immediately; the shared reveal component checks and listens for the preference. Browser emulation of reduced motion was unavailable, so that preference was inspected in code rather than exercised live.

Print CSS includes every achievement independently of disclosure state. The print action opens the native dialog, but computer-use restrictions prevent inspecting that dialog. Native pagination remains unverified.

## Contrast

Computed WCAG ratios against the page background: light primary 13.20:1, secondary 7.15:1, accent 6.08:1; dark primary 14.06:1, secondary 9.24:1, accent 8.15:1. The faintest resume text (65% primary) is 4.51:1 light and 6.74:1 dark. Nuxt UI semantic colors use the same palette.

## Duplication

Repeated with jscpd 5.4.0 and the same baseline flags:

```sh
npx --yes jscpd --reporters ai --summary --output /tmp/resume25-dry-exact-after src scripts tests
npx --yes jscpd --reporters ai --summary --output /tmp/resume25-dry-renamed-after --min-lines 10 --ignore-identifiers --min-tokens 70 src scripts tests
npx --yes jscpd --reporters ai --summary --output /tmp/resume25-dry-similar-after --min-lines 10 --max-gap-lines 1 --similarity 0.9 src scripts tests
```

All three final scans report zero clones and 0.0% duplication. The default exact baseline had one clone (0.2%); renamed and similar baselines had none.

Intentional similarities: page-specific card layouts, CMS records, and explicit schema/test cases retain their distinct semantics. No detected clone was excluded as intentional and no additional generic card/layout abstraction was introduced.

## Preview and screenshots

Local preview: http://127.0.0.1:4173/

Final screenshots are saved in the task's visualization directory as `portfolio-refresh-desktop.png`, `portfolio-refresh-desktop-full.png`, `portfolio-refresh-mobile.png`, and `portfolio-refresh-dark.png`.

## Navbar and Contentful follow-up

The navbar now uses text links with a small orange current-page dot; arrows remain in content. The original cursor effect stays mounted. Keyboard activation updates the active route, all five navbar links have at least 44px targets, and no navbar overflow occurs at 375/768/1024/1440px. Light/dark desktop and mobile views were inspected; the final browser warning/error log is empty. Screenshots: `navbar-clean-desktop.png` and `navbar-clean-mobile.png`.

Lint, typecheck, static generation, and production build pass after the configuration-factory extraction. The unit suite now has 14 passing tests; the production site suite has 12. `pnpm content:export` produces 13 content types and 108 entries, and round-trip tests preserve all existing source content and ordering. The Contentful guide documents the offline snapshot boundary, future asset/delivery work, and lack of a live import test.

## Original-feel restoration, October 11, 2026

At the user's request, the latest design restores the original split layouts, social navbar, smaller headings, compact home project rows, 4px card corners, and quiet tonal surfaces. The current design tokens and layout rules in MASTER.md supersede the earlier visual descriptions and contrast figures above. New CMS data/models, filters/history, explicit demos, resume controls, reading progress, downloads, and copy-email behavior remain.

Lint, typecheck, static generation, production build, all 14 unit/component tests, and all 12 production regressions pass. Browser checks on home, blog, projects, contact, resume, and an article pass at 375/768/1024/1440px with one primary heading and no horizontal overflow. Verified compact demo show/hide, keyboard filters and Back, resume expand/collapse, copy success, and the dark blog view; the final browser warning/error log is empty. Screenshots: `original-feel-desktop.png` and `original-feel-mobile.png`.
