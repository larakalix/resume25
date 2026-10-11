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

Project cards load static WebP previews through a local Nuxt Image provider, with 320, 640, and 960 pixel variants. GIF demonstrations load only after a visitor chooses **Watch demo**. To regenerate previews after replacing an original asset, install Pillow and run:

```sh
python3 scripts/prepare-images.py
```

Commit generated previews. This avoids requiring an image transformation server on static hosting. Inter fonts and Material Design icons are bundled locally.

## SEO and analytics

Set `NUXT_PUBLIC_SITE_URL` to the deployed HTTPS origin **before building** to include canonical URLs and absolute social preview URLs in prerendered HTML. It is intentionally blank by default rather than guessing a production domain.

The client-only PostHog integration loads after rendering and preserves event calls made while its SDK loads. It uses `NUXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NUXT_PUBLIC_POSTHOG_HOST`. Keep credentials in the deployment environment or ignored local `.env` files.

Contact currently uses direct email and social links. The unused contact-form component opens an email draft; it does not submit or claim to deliver a message.

## Interface and interactions

The design rules live in `design-system/ivan-lara/MASTER.md`. The approved studio design now powers the homepage and shared floating capsule navbar. Unused `/studio`, `/concept`, and `/design-lab` preview routes have been removed. Neutral surfaces, rounded cards and the studio palette carry across the portfolio. It retains semantic tokens, light/dark themes, the cursor glow, reduced-motion support, and the existing page-specific features.

The home page derives featured projects, recent roles, and latest writing from existing content. Project filters use `?tech=nuxt`, `?tech=react`, or `?tech=nextjs`; removing or invalidating that parameter shows all projects. Direct query links apply after hydration to preserve compatibility with prerendered static HTML. Resume disclosures support individual controls and expand/collapse all; print exports include all details. Contact copy failures keep the email link available.

`pnpm test:unit` checks the CMS contract, filter/state utilities, clipboard failure handling, shared formatting, and actual server-rendered collection-state components using the installed Vue compiler. `pnpm test:site` checks production routes, prerendered content, images, downloads, and HTTP 404s.

## Contentful-ready objects

Run `pnpm content:export` to create an offline Contentful-style export from existing content. Thirteen content types cover projects, articles, pages, settings, profile, links, and linked resume sections. The adapter preserves UI contracts and source content; round-trip tests cover references, locales, IDs, dates, and invalid content. See [the migration guide](cms/contentful/README.md). No external CMS is connected.
