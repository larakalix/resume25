# Ivan Lara: approved studio portfolio

Current route cleanup: `/studio`, `/concept`, and `/design-lab` were removed after the approved design became the public portfolio. References to preview routes below describe historical exploration, not active pages.

The user approved replacing the public portfolio with the studio design on October 11, 2026. The studio grid is now the homepage, `/studio` redirects to `/`, and all public routes share its floating navbar, neutral palette and rounded cards. The specification is in [pages/studio.md](pages/studio.md). Existing content, URLs, CMS contracts, downloads, filters, resume disclosures and the cursor glow remain available.

## Previous design history

# Ivan Lara: approved warm motion portfolio

The user approved implementation of the refined `/concept` design on October 11, 2026. The interactive home is now `/`, and its navbar is shared across all routes. `/concept` remains a noindex review route using the same home and navbar components. No production page includes the prototype toolbar.

The approved specification and its source references are in [pages/concept.md](pages/concept.md). This approval supersedes earlier restoration notes below for the homepage and navigation. Other page-specific layouts and features remain intact.

## Earlier design notes

Audience: recruiters and clients. Retain factual career content, products, and destinations.

## Visual language

The user selected restoration of the original overall feel on October 11, 2026. Use the original split introduction/content composition, compact project rows, social links in the navbar, and restrained cards. Retain the new functional features. Avoid oversized promotional headings, large rounded cards, heavy shadows, or a new logo treatment.

Self-hosted Inter, 400/500/600/800. Page headings restore the original extra-bold 36–48px scale; section titles are 24px and card titles 16–18px. Body copy starts at 16px with a 1.6 line height; card descriptions use 14px. Long-form articles use a 780px measure. Cards use a 4px radius, quiet tonal backgrounds, no shadows, and 8–16px padding. Major sections use 48px spacing.

Semantic palette (light / dark):
- background: #fff0e3 / #282829
- surface: #f6e6d7 / #303031
- muted surface: #eddbca / #39393a
- primary text: #282829 / #fff0e3
- secondary text: #333 / #ccc
- accent: #9a3f12 / #fea75f
- border: #d9c3b2 / #625247

Accent orange is darker for readable light-theme text. Nuxt UI semantic variables map to the same warm surfaces, borders, and text; neutral buttons retain the library's interaction variants. All interactive controls have visible focus and at least 44px targets. Decorative arrows are hidden from screen readers. Source images use responsive WebP previews and reserved aspect ratios.

## Interaction rules

Use 160ms feedback and 300ms entrances with cubic-bezier(0.2, 0.7, 0.2, 1). Hover and keyboard focus communicate the same affordance; touch gets native pressed feedback. Do not dim unrelated cards. The original pointer glow is restored on fine pointers and hidden for reduced motion, coarse pointers, and print.

The navbar restores social links on the left and navigation/theme controls on the right. At narrower widths, all five routes appear in a second row. Current-page links use a subtle underline. Directional arrows remain in content. Page headers omit duplicate sidebar navigation.

Home has an introduction on the left and compact recent-project rows on the right, with recent roles and writing below. Blog/contact restore the original split composition; articles stack in the content column. The projects route retains the new three-column desktop grid, two columns on tablet, and one on mobile. Every split layout stacks on mobile.

Scroll reveal is a progressive enhancement on major home sections only. HTML is visible before hydration and without JavaScript. Sections above the fold remain visible, observers disconnect once a section enters, and reduced motion shows the final state immediately. No pinned scrolling, animation library, parallax, or autoplay GIFs.

Project filters use the `tech` query parameter (`nuxt`, `react`, `nextjs`; absence or invalid input means All). Filter matching normalizes punctuation and case in existing tags. Start hydration from the prerendered All view before applying a direct-link query. Filter changes use router history and announce counts. Preserve selected content order.

Resume disclosures are individually controlled; Expand all opens every additional-detail list, Collapse all closes them. Print includes all achievements regardless of disclosure state. Keep PDF/text download content and source qualifications intact.

Contact copy uses the CMS email, announces success/failure, and always retains a working mailto link. The decorative article reading indicator follows scroll position with requestAnimationFrame and cleans up listeners on navigation. Article lists are newest first.

## Reuse and checks

Share list-state rendering with loading > error > empty > ready precedence. Header props derive from PageConfig. The CMS document is the source for profile data and dynamic resume test expectations. Avoid a generic layout/card framework: project, career, contact, and article components retain their own semantics.

Check 375/768/1024/1440px, both themes, keyboard focus, no horizontal overflow, filtering/back navigation, disclosures, demo toggles, clipboard fallback, reduced motion, and complete print content. Run lint, typecheck, production/static builds, unit/component and site regression checks; repeat the duplication scans with baseline flags.

The follow-up restoration uses the committed portfolio as the visual reference: 16px desktop column gaps, original shell insets and vertical padding, extra-bold main headings, compact social pills, and the original AtLinkButton content-link treatment. Home action links fill the introduction column and sit below the introduction, aligned toward the bottom of the split panel on desktop. New resume, CMS, filters, demo controls, reading progress, and clipboard behavior remain intact. Do not reinterpret restoration as another design direction.

### Shared button shape

All Nuxt UI buttons use `rounded-full` through `src/app.config.ts`, including linked buttons, filters, downloads, disclosures, and form actions. Keep the same pill silhouette across pages; use `solid` for primary actions, `outline` for secondary actions, `ghost` for low-emphasis utilities, and `link` for inline disclosures. Icon-only controls remain circular. Existing color, size, loading, and accessibility behavior stays with Nuxt UI.

### Card consistency

Home and inner pages use one geometry scale: 28px corners (22px mobile), 32px section-card padding (24px mobile), and 24px content-card padding (20px mobile). Values live in `--radius-card`, `--card-padding`, and `--card-content-padding`. Use the standard surface for content and the muted surface for overview/contact emphasis. Content headings use 18px semibold; metadata uses 12px muted text; action links use 14px medium charcoal with the shared small arrow. Project previews share a bordered browser frame. Avoid adding hover outlines to noninteractive containers; retain keyboard focus feedback.
