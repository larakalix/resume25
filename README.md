# Ivan Lara — portfolio and resume

A Nuxt 4 portfolio with typed local content, prerendered pages, responsive WebP previews, and a printable resume.

## Development

Use Node.js 22.18+ (native TypeScript imports in the resume generator) and pnpm 10.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

## Checks and production output

```sh
pnpm lint
pnpm typecheck
pnpm build
pnpm test:unit
pnpm test:site
pnpm generate
```

`build` produces a Nitro server and prerendered content pages. `generate` produces a static site in `.output/public`; configure your static host to serve `404.html` with HTTP status 404 for unknown URLs. No API or email delivery server is included.

## Content

- `src/content/resume.json`: CMS-ready resume document, including all employment achievements, dates, skills, education, certification, and contact details.
- `src/schemas/resume-schema.ts`: runtime content validation; inferred types live in `src/types/resume.ts`.
- `src/data/resume.ts`: validated content boundary shared by the site. See `src/content/README.md` for the CMS mapping contract.
- `src/data/projects.ts`: project descriptions, links, thumbnails, and optional demos.
- `src/data/posts.ts`: authored articles. HTML is trusted local content; sanitize it before connecting an external content source.
- `src/config/content-config.ts`: navigation and page copy.

The resume text download is regenerated before builds and static generation. After editing content during development, run `node scripts/prepare-resume.mjs`. The `/resume` page includes expandable role details and print styles that include every achievement. It also offers the unchanged source PDF and a generated text download. The content is sourced from `RS_IL2026.pdf`; pending degree paperwork and completed employment dates are preserved. A remote CMS/admin dashboard is not connected.

## Images and fonts

Project cards load static WebP previews through a local Nuxt Image provider, with 320, 640, and 960 pixel variants. Demo controls are removed; project links open the original destinations. To regenerate previews after replacing an original asset, install Pillow and run:

```sh
python3 scripts/prepare-images.py
```

Commit generated previews. This avoids requiring an image transformation server on static hosting. Typography uses the platform system font stack; Material Design icons are bundled locally.

## SEO and analytics

Set `NUXT_PUBLIC_SITE_URL` to the deployed HTTPS origin **before building** to include canonical URLs and absolute social preview URLs in prerendered HTML. It is intentionally blank by default rather than guessing a production domain.

The client-only PostHog integration loads after rendering and preserves event calls made while its SDK loads. It uses `NUXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NUXT_PUBLIC_POSTHOG_HOST`. Keep credentials in the deployment environment or ignored local `.env` files.

Contact currently uses direct email and social links. The unused contact-form component opens an email draft; it does not submit or claim to deliver a message.

## Interface and interactions

The current design rules live in `DESIGN.md` and `.impeccable/design.json`. The November 2026 redesign uses blue actions, platform typography, open sections, restrained image surfaces, and a functional translucent masthead. It replaces the former studio/card-wall design and cursor glow. The five public pages and article routes retain their data and interactions; unused `/studio`, `/concept`, and `/design-lab` routes remain removed. Light/dark themes, reduced motion, increased contrast, and reduced transparency are supported.

The home page derives featured projects, recent roles, and latest writing from existing content. Project filters use `?tech=nuxt`, `?tech=react`, or `?tech=nextjs`; removing or invalidating that parameter shows all projects. Direct query links apply after hydration to preserve compatibility with prerendered static HTML. Resume disclosures support individual controls and expand/collapse all; print exports include all details. Contact copy failures keep the email link available.

`pnpm test:unit` checks the CMS contract, filter/state utilities, clipboard failure handling, shared formatting, and actual server-rendered collection-state components using the installed Vue compiler. `pnpm test:site` checks production routes, prerendered content, images, downloads, and HTTP 404s.

## Contentful-ready objects

Run `pnpm content:export` to create an offline Contentful-style export from existing content. Thirteen content types cover projects, articles, pages, settings, profile, links, and linked resume sections. The adapter preserves UI contracts and source content; round-trip tests cover references, locales, IDs, dates, and invalid content. See [the migration guide](cms/contentful/README.md). No external CMS is connected.


## Mock content architecture

Published data is served through typed domain models and narrow repository ports, application queries, mock infrastructure, Nitro endpoints, and Nuxt SSR-aware query composables. The mock repositories use the existing projects, articles, and resume; they do not invent replacement content. Swap adapters at `src/server/utils/portfolio.ts` to change acquisition without modifying pages. See [content architecture and CMS replacement steps](docs/content-architecture.md).

Both `pnpm build` and `pnpm generate` prerender content and mock read-only API snapshots. JSON decoding is explicit so static refresh works without a Nuxt server. Keep CMS credentials server-only, validate/map CMS output at the adapter boundary, and regenerate downloads from the same published snapshot.


## Lemonade CMS migration files

Run `pnpm content:export:lemonade` to regenerate the native schema template and source-backed migration JSON in [`cms/lemonade`](cms/lemonade/README.md). Start with `cms/lemonade/model-template.json` to create the seven models through Lemonade's model-template review flow. Individual definitions, complete seed records, and flat project/article draft files are included. The seed graph uses symbolic identities that must be resolved to real Lemonade entry UUIDs; it is not a native bulk-entry import. No live CMS connection or publishing is performed.
