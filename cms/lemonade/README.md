# Lemonade CMS migration files

These files prepare the **existing** portfolio content for Lemonade. They do not change the running site, connect a CMS, create entries, upload media, or publish anything.

## Start with the model template

**`model-template.json` is the schema import file.** It uses Lemonade's native `lemonade-model-template` version 1 envelope, with all seven models and their reference dependencies included. In your target Lemonade workspace/environment, open **Content types → Your model templates** and use the JSON import/review flow and review the create-only changes before applying. The destination CMS must include this feature; a local source validation is not proof that a deployed instance has it. Existing conflicting model keys require an explicit decision in Lemonade; this is not an overwrite script.

`content-types/*.json` contains each raw model definition (`key`, `name`, `fields`, optional `singleton`) for inspection or manual setup. Those individual files are **not** standalone model-template import envelopes.

| Key | Kind | Content |
| --- | --- | --- |
| `profile` | Singleton | Name, headline, summary, contact/location facts and embedded links |
| `project` | Collection | Original ID, description, preview/demo paths, URL, tags and source order |
| `article` | Collection | Original ID, slug, excerpt, exact authored HTML, publication date, tags and optional image |
| `experience` | Collection | Original role ID, employer, role, location, remote flag, months, embedded achievements and technologies |
| `page` | Collection | Page key, title, subtitle, description, embedded action and metadata |
| `resume` | Singleton | Version/source, profile/experience references, embedded skills/education/certifications/languages, download paths |
| `site_settings` | Singleton | Site title/description, embedded navigation/social/contact links and ordered references to all collections/resume |

Reusable embedded definitions live inside these models: `portfolio_link`, `portfolio_achievement`, `portfolio_skill_group`, `portfolio_education`, `portfolio_certification`, `portfolio_language`, `portfolio_action`, and `portfolio_seo`. They are not extra top-level content types. Lemonade's template review adopts their definitions with the models.

## Content files: two different purposes

### Native guided draft imports

After creating the models, **`draft-import/project.json`** and **`draft-import/article.json`** are flat arrays of field values for Lemonade's guided **Import drafts** flow. Map the source columns to matching field keys. `content_id` is schema-declared unique, so it is available as an explicit matching field for update/upsert. Imported rows remain drafts; publication is a separate action.

They stay within the current importer limits (100 rows / 2 MiB per file). Tags are multiple-choice arrays. Article HTML is a long-text value, not a rich-text document or nested component. Image/demo paths are ordinary text, not media uploads.

### Portable complete seed graph

**`seed-content.json`** preserves the complete portfolio graph in the migration-only `resume25-lemonade-seed` v1 format. `content/*.json` groups the same entries by model. These are **not native bulk-entry import files**, and must not be uploaded as such. The guided importer does not accept nested components or bulk-create singleton entries.

- `seed_key` is a deterministic migration identity such as `experience:apply-digital`, **not** a Lemonade entry UUID.
- `{ "$ref": "profile:main" }` is a symbolic migration reference. After creating entries in Lemonade, build a mapping of seed keys to the real returned UUIDs and replace every symbolic reference with its corresponding UUID.
- Embedded values already use Lemonade's `{ "id": "<uuid>", "type": "<component-key>", "fields": { ... } }` shape. These deterministic UUIDv5 IDs identify embedded instances only, not database entries.
- Create/edit component-bearing and singleton entries through the editor, or a later management-API migration that resolves IDs. `manifest.json` records dependency order: profile, projects, articles, experience, pages, resume, then site settings. Resolve references to drafts in the intended environment; any publishing order/readiness must be reviewed separately.
- Source ordering is retained in arrays/references, plus explicit `sort_order` on collection records. Do not replace source IDs with newly assigned UUIDs; keep them in `content_id`.

## Preservation choices

- Resume months remain `YYYY-MM` **text**, rather than invented calendar days. A current role retains `end_date: null` and the field is optional. Real role dates/statuses and every achievement remain unchanged.
- `publication_date` uses Lemonade's native date type because articles already have full publication days.
- Article bodies remain exact authored HTML in `content_html` (`long_text`). A future live CMS adapter must sanitize remotely editable HTML before rendering or deliberately convert to rich text with a corresponding renderer.
- `image_path`, `demo_path`, `pdf_path`, and `text_path` preserve existing local/HTTPS paths. They are not Lemonade image/file UUIDs. No URL was fetched and no media was uploaded. Keep current public assets available when switching providers.
- Tags, technologies and skill lists use `choices`, with allowed options derived from all current values. Values and list order are preserved. Update the allowed options when introducing new values; this is not a free-form JSON field.
- API field names use snake_case. The offline seed restoration demonstrates their mapping back to the existing TypeScript/domain contracts. No live delivery adapter is connected.

## Regenerate and verify

```sh
pnpm content:export:lemonade
pnpm test:unit
pnpm lint
pnpm typecheck
```

Edit the original sources, then regenerate; don't maintain a second hand-edited copy here. The generator reads `src/data/projects.ts`, `src/data/posts.ts`, `src/content/resume.json` and the shared page/site configuration factory. It checks an exact round trip through `src/cms/lemonade/seed.ts` before writing, preserving IDs, HTML, array order, booleans, optional fields, dates and download paths. JSON files are deterministic and intentionally included for review.

## Format evidence and verification scope

The format was checked against the current **local Lemonade source** at `/Users/ivanlara/Documents/GitHub/cms` (HEAD `1178ac7`, November 3, 2026), particularly:

- `apps/cms/lib/cms/content/model_templates/document.ex` — native template envelope, dependency closure and bounds;
- `apps/cms/lib/cms/content/content_type.ex` — field keys, types, required flags, choices, references and singleton definitions;
- `apps/cms/lib/cms/content/composition.ex` — component schemas and embedded instance structure;
- `docs/model-templates.md` — template import navigation and create-only behavior;
- `docs/editorial-imports.md` — guided importer data types, limits, singleton/nested-content exclusions and reference UUID requirements.

Local pure validation accepted all **seven model definitions** and **26 entry shapes** using Lemonade's own template and entry validators. Entry checks used temporary UUIDs to resolve symbolic references **in memory**; there was no database access. This verifies schema/value shapes, not actual destination records, access permissions, plan limits, publication, a deployed backend or a live import. The automated portfolio tests separately check deterministic output, source round-trip, changed/current roles and corrupt references. Recheck the destination Lemonade version when importing later.
