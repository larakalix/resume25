# Studio preview

Current route cleanup: `/studio`, `/concept`, and `/design-lab` were removed after the approved design became the public portfolio. References to preview routes below describe historical exploration, not active pages.

Approved public route: `/`. `/studio` permanently redirects to the homepage. The homepage component and shared navbar replace the former warm design; the neutral palette and rounded card tokens apply to all public routes.

Reference: https://www.marco.fyi/ — floating capsule navigation, quiet neutral surfaces, rounded varied-size project tiles and playful product framing. Use original CMS project screenshots and resume facts, not the reference author's work or biography.

UI/UX Pro Max's explicit `Bento Grids` style query matched `bento-box-grid`: modular asymmetric cards, neutral base with brand accent, negative space, responsive spans and subtle feedback. The broad system query returned Vibrant & Block-based, whose bright palette was not adopted because it did not fit the supplied reference.

Use self-hosted Inter, 16px main body text, compact metadata, 16px grid gaps and 22–28px tile radii. Scoped semantic tokens define off-white background, neutral tiles, charcoal text and a restrained warm accent, with dark-theme counterparts. Preserve cursor glow, 44px navigation targets, focus outlines, semantic links, one h1, source-backed content, project analytics and reduced-motion final states. Use CSS for 160ms control feedback and 300ms tile entrances. No demo content, animation dependencies, pinned scrolling or copied assets.

Validation: lint, typecheck, production build and all 13 existing site regressions pass. Browser checks at 375, 768, 1024 and 1440px found no horizontal overflow, one h1 and all five navigation links. Mobile and desktop reviewed, both themes checked, native bio disclosure exercised and no browser warnings/errors captured. Reduced-motion behavior is CSS verified. Screenshots: studio-desktop.png and studio-mobile.png outside the repository.

Public rollout validation: lint, typecheck, 14 unit tests, 13 production route tests, production build and static generation pass. Route tests now verify the studio grid at `/`, absence of prototype controls, correct navigation and the `/studio` permanent redirect. All five public pages were checked at 375/768/1024/1440px: no horizontal overflow, one h1 and correct active navigation. Desktop and mobile screenshots saved as studio-public-desktop.png and studio-public-mobile.png outside the repository. No browser warnings or errors captured.

## Responsive layout rules

- Phones below 640px: one column, 12px gaps, compact intro/card padding and fluid heading size. At widths below 360px, the theme control moves above the full-width navigation so every link retains a 44px target.
- Tablets from 640–1023px: full-width introduction with two internal text columns, then a full-width lead project. Supporting work and lower sections use two columns. Blog and Contact stack their page introduction above two content columns from 768px.
- Laptops/desktops from 1024px: intro and lead project share one row; two supporting projects and the approach tile share the next. Recent experience spans the grid with two role columns. The introduction no longer stretches over multiple project rows.
- Large screens: shell stays centered at a maximum width of 1440px. Gutters scale from 12px to 32px. Role dates wrap below descriptions on smaller laptops; window titles truncate within their decorative frame rather than stretching tiles. Mobile split-page gaps are 32px rather than 80px.

Responsive validation: final production build, lint, typecheck and all 13 site regression tests pass. Browser checks covered all five public pages at 320, 375, 640, 768, 1024, 1280, 1440 and 1920px (40 combinations): no horizontal overflow and all navigation targets at least 44×44px. Final mobile, tablet and desktop screenshots were reviewed and saved as responsive-mobile.png, responsive-tablet.png and responsive-desktop.png outside the repository. No browser warnings/errors captured.
