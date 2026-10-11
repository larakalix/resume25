# Contentful migration preparation

The site still uses local content. This folder provides an offline migration export; it does not connect to Contentful, upload files, or publish entries.

The model follows Contentful's [content types and fields](https://www.contentful.com/developers/docs/concepts/data-model/), [entry references](https://www.contentful.com/developers/docs/concepts/links/), and [CLI import/export structure](https://www.contentful.com/developers/docs/tutorials/cli/import-and-export/).

## Models

The actual field definitions are in `src/cms/contentful/content-types.json`.

| Content type | Purpose and relationships |
| --- | --- |
| siteSettings | One root; ordered navigation, social/contact links, pages, projects, articles, and resume |
| project | Existing ID, name, description, preview/demo paths, URL, and technology tags |
| post | Existing ID, unique slug, title, excerpt, HTML body, publication date, tags, optional image |
| page | Page key, title, subtitle, description, optional CTA, and SEO fields |
| link | Reusable label, destination, optional icon |
| resume | Source/version, profile, ordered experience/skills/qualifications/languages, download paths |
| profile | Factual personal/professional details and ordered link references |
| experience | Existing role ID, employer, role, location, month dates, remote status, ordered achievement references, technologies |
| achievement | Existing achievement ID, text, featured flag |
| skillGroup | Existing ID, label, ordered skills |
| education | Existing ID, institution, qualification, month, explicit status |
| certification | Existing ID, issuer, name, month |
| language | Name and proficiency |

Contentful entries use `sys.id`, `sys.contentType`, and localized field maps. References use `{ "sys": { "type": "Link", "linkType": "Entry", "id": "…" } }`. UI components continue to receive their existing plain objects through the adapter. `contentId` preserves domain IDs separately from Contentful IDs. Reference arrays preserve editorial order; article listing still sorts by publication date.

Resume months remain `YYYY-MM` Symbol fields, avoiding fabricated day/time precision. A current role omits `endDate`; the adapter restores `null`. Publication dates use Contentful Date fields. Slugs and page keys are unique. CTA/download objects are small JSON fields rather than opaque page/resume blobs.

## Generate and verify locally

```sh
pnpm content:export
pnpm test:unit
```

The deterministic, ignored `cms/contentful/portfolio-export.json` contains content types, entries, locales, and an empty asset list. It is generated from the actual project/article data, resume JSON, and shared configuration factory. Regenerate after content changes; do not maintain a second hand-edited content copy. `toContentfulExport` validates its generated graph through `fromContentfulExport` before writing.

`src/cms/contentful/adapter.ts` resolves localized export snapshots and validates their linked data against the current UI contracts. It rejects duplicate IDs, missing/wrong references, missing required fields, invalid resume content, and unsafe destinations. Locale fallback is explicit. Round-trip tests verify all source facts, URLs, HTML, order, and IDs, including current roles and changed achievements.

## Future migration

1. Review the generated file and import into an isolated Contentful environment using the official CLI. Confirm import validation and editor behavior there; no live Contentful import has been tested here.
2. Keep existing slugs, domain IDs, reference order, and download URLs. The `siteSettings-main` entry is the root.
3. Images, GIFs, and resume downloads currently retain their local paths/HTTPS URLs as Symbol fields. Upload assets separately and deliberately migrate those fields to Asset links plus an asset resolver if desired. The export makes no claim to contain uploaded assets.
4. Article bodies remain trusted local HTML in a Text field to preserve current rendering. Sanitize remotely editable HTML before rendering, or migrate to Rich Text with a dedicated renderer; never pass Rich Text JSON to `v-html`.
5. Add a server/build-time Contentful provider with private credentials, pagination, locale handling, publication/preview policy, and caching. The current adapter accepts **localized CMA/CLI snapshots**, not unresolved/raw CDA responses. Normalize live delivery responses and resolve links before applying these domain validators. Keep credentials out of public runtime config.
6. Run the existing build/static/site and CMS tests before switching the local provider. An external connection, asset migration, editor setup, and deployment remain separate work.
