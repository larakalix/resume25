# Warm motion portfolio — October 11, 2026

Current route cleanup: `/studio`, `/concept`, and `/design-lab` were removed after the approved design became the public portfolio. References to preview routes below describe historical exploration, not active pages.

Approved for implementation: the refined design is now the public homepage and shared navigation. The sections below document the design exploration; their earlier isolation statements are historical. Public components are OrHome and MlNavbar; the noindex `/concept` route reuses those components with preview navigation. The default layout keeps production SEO, cursor glow, skip link, footer and existing page features.

The user approved three reference-backed visual directions and one isolated animated homepage prototype. `/design-lab` presents three original miniature compositions; `/concept` implements direction 01. These routes use noindex, nofollow. They are not linked from the public navigation and do not replace `/` or alter any existing page.

## Directions and sources

1. **Warm motion — recommended and prototyped.** Original cream, charcoal and orange identity, split introduction/project composition, quiet numbered project controls, browser-frame previews, deliberate small movements. Emil Kowalski's [Animations on the Web](https://animations.dev/) is the reference for caring about timing and easing. Its public description was reviewed; no course material was accessed or copied.
2. **After hours — composition study.** Charcoal canvas, stronger project imagery and warm highlights. [Dennis Snellenberg](https://dennissnellenberg.com/) was visually reviewed for confident portfolio hierarchy and project-led presentation. This is an interpretation, not a reproduction of his portrait hero, marquee, loading screen or scroll behavior.
3. **Studio index — composition study.** Off-white grid, compact numbered rows and restrained highlights. [Rauno Freiberg](https://rauno.me/) was visually reviewed as a reference for interaction craft and personality. The index composition is our proposal, not his current homepage layout.

[Codrops Image Reveal Hover Effects](https://tympanus.net/Development/ImageRevealHover/) provides a public working reference for image-reveal interactions. The prototype adapts the idea to explicit project buttons usable with touch and keyboard. Pinterest's suggested pin could not be opened reliably and is not treated as a verified visual source. No external images or code were copied into the portfolio.

## Implementation

- Existing resume and project/post data supply every professional fact, destination and screenshot.
- Keep Inter and semantic theme tokens. Concept-specific stage colors are scoped to the prototype with independent dark values. White browser chrome represents the actual project screenshots and is intentionally constant across themes.
- Name remains 36–48px. No portrait placeholder, invented availability status or invented statistics.
- Three actual buttons select project previews. Selection is explicit, never autoplay or hover-only. Pressed state, visible arrow and announced selected project support keyboard and screen readers. Re-selecting a project is a no-op; changing project closes its demo.
- Vue Transition crossfades and translates previews in the same grid cell, retaining layout height. 160ms feedback, 300ms preview changes, 60ms entrance stagger. Major lower sections reuse MlReveal. Existing cursor glow remains.
- Preserve links, explicit GIF demo controls and project-link analytics. Main routes retain their own features and styles.
- Reduced motion disables entrances, transitions, rotation and cursor effects. Content renders server-side and remains readable without JavaScript; the first project is visible without hydration.
- No animation library or external CMS dependency added.

## Skill search assessment

UI/UX Pro Max's design-system query returned Brutalism/monochrome-blue. That recommendation does not fit the user's established identity; retain the existing palette and use only its applicable readable-fallback, focus and reduced-motion guidance. Two Vue transition searches returned no database matches; Vue Transition implementation follows the Vue skill and installed Vue patterns, not a claimed database match.

## Local validation

- Lint and typecheck pass; 14 unit tests and 12 existing production regression tests pass. Final production build passes after the dark-stage selector correction.
- Both new routes checked at 375, 768, 1024 and 1440px: one primary heading, no horizontal overflow, noindex/nofollow.
- Local HTTP responses contain readable SSR content and the first project without JavaScript; no GIF demo appears before interaction.
- Browser verified Enter-key project selection, matching destination links, demo expansion, and demo reset when another project is selected. Light and dark themes visually reviewed; the dark-stage variable resolves to rgb(73,55,42).
- Primary/secondary copy, selection states and stage captions exceed 4.5:1 contrast in both palettes. Mobile action targets measure 48px; project-selection targets measure 56px.
- Reduced-motion rules inspected in source and loaded browser styles. OS-level reduced-motion emulation was not available through the browser controls; no claim of a live OS preference test. No deployment, live CMS operation, or site-wide design rollout performed.
- Screenshots saved outside the repo: portfolio-directions.png, warm-motion-desktop.png, warm-motion-dark.png, warm-motion-mobile.png.

## UI/UX Pro Max refinement

The explicit follow-up skill invocation refines `/concept` only. The new design-system query `portfolio minimal interactive` with variance 3, motion 4 and density 5 returned **Minimalism & Swiss Style** and Hero + Features + CTA. Adopt its grid, hierarchy and restrained feedback; preserve the user's cream/orange palette and existing self-hosted Inter rather than substituting the generic blue palette and font recommendation. UX searches returned heading hierarchy and readable mobile font size/contrast. The responsive Nuxt query had no matches; its one narrower `layout` retry returned definePageMeta, already used by this route.

- A dedicated concept navbar uses plain-name identity and a grouped navigation control. All five routes remain visible on mobile. Active Home points to the concept; Current portfolio links back to the live homepage. Social destinations remain in the shared footer.
- Hero uses the first complete sentence from the source summary. The full source bio remains in the About my approach disclosure in the background section, and in the unchanged resume.
- Primary project action receives stronger filled treatment while all three introduction links remain full width.
- Project selectors sit directly above their preview on all sizes. Three numbered buttons include a visible selected checkmark and aria-pressed, so color is not the sole indicator. Counts derive from data.
- Preview is level and lifts slightly on interaction; readable screenshot framing replaces the decorative tilt. Stable detail space reduces movement when changing projects.
- Body text is 16px on mobile; useful metadata is at least 12px. Reuse 160ms feedback and 300ms transitions, progressive reveals and reduced-motion fallbacks.

Refinement validation: lint, typecheck and final production build pass; all 14 unit and 12 existing site tests pass. Final browser checks at 375/768/1024/1440px found one h1, five visible navigation links and no horizontal overflow. Project buttons measure 90–100px tall and retain names without truncation. Keyboard selection updates the correct external destination; demo expansion and native bio disclosure work. Both themes reviewed with no browser errors or warnings; reduced-motion fallback remains source/CSS-verified, with the earlier OS-emulation limitation unchanged. New screenshots: ui-refined-desktop.png, ui-refined-mobile.png and ui-refined-dark.png.

## Approved public rollout

The approved home design is now shared by `/` and the noindex `/concept` review route, without review controls on the public homepage. The shared navbar preserves all five routes and identifies Blog as the current section on article pages. The cursor glow, CMS content, analytics, downloads, filters, resume disclosures and contact actions remain available.

Validation: lint, typecheck, production build, static generation, 14 unit tests and 13 site tests pass. All five public pages fit at 375, 768, 1024 and 1440px with one h1 and the correct active navigation item. Browser smoke checks confirm keyboard project selection resets demos, filter history restores on Back, resume expand/collapse works and copy email announces success. No browser warnings or errors were captured. Desktop and mobile screenshots are saved as approved-home-desktop.png and approved-home-mobile.png outside the repository. Reduced motion remains source/CSS verified; no deployment was performed.
