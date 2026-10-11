# Resume content model

`resume.json` is the CMS-ready singleton document for `/resume`. It is portable JSON rather than a dependency on a particular CMS vendor. No remote CMS or editing dashboard is connected yet.

- `profile`: name, headline, summary, contact fields, links, location and relocation preference.
- `experience`: ordered roles with stable IDs, employer, title, location, remote flag, monthly dates, technologies and achievement blocks. `featured: true` shows a block immediately; remaining blocks expand on the website and always appear in print/text exports.
- `skillGroups`, `education`, `certifications`, `languages`: structured, repeatable entries. Education `status` preserves incomplete qualifications.
- `downloads`: same-origin paths to the original PDF and generated text version.
- `schemaVersion`: versioned contract; `sourceDocument`: provenance filename.

Dates use `YYYY-MM`; only a genuinely current role should have `endDate: null`. Array order controls display order. IDs must be unique within each collection. All source achievement text is preserved from `RS_IL2026.pdf`; the profile is condensed for the web. The original PDF is published unchanged in `public/ivan-lara-resume.pdf`.

Edit this file, then build or generate. `src/data/resume.ts` validates it with the Valibot schema in `src/schemas/resume-schema.ts`; invalid content fails the build. Types are inferred in `src/types/resume.ts`. The text download is regenerated before builds and static generation. When replacing the content with a CMS, map its response to this shape, validate at the content boundary, and fetch through Nuxt `useAsyncData` with a stable key. Regenerate the text export from the same published snapshot and configure a rebuild webhook if using static hosting. Replace the PDF separately when the original document changes.


### Lightweight browser summaries

`pnpm dev`, `pnpm build`, and `pnpm generate` regenerate `src/data/generated/profile.json`, `recent-experience.json`, and `post-summaries.json` from the validated resume and article sources. These snapshots are derived assets; edit the source resume/posts, never the generated files. Restart dev after changing those content sources to refresh the summaries. The shared site configuration, homepage, contact page, and article listings use summaries; full achievements and article bodies stay with their detail pages. Summary regression tests detect stale or incomplete snapshots.

Run `pnpm perf:bundle` after a production build to report the homepage's eager JavaScript dependency graph. It excludes dynamic analytics imports, navigation prefetch, CSS, images, and fonts; its gzip estimate uses level 9 and is not a measured network transfer or Core Web Vitals score.
