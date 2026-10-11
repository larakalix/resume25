import { mkdir, readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { parse } from 'valibot';
import { projects } from '../src/data/projects.ts';
import { posts } from '../src/data/posts.ts';
import { resumeSchema } from '../src/schemas/resume-schema.ts';
import { createContentConfig } from '../src/config/create-content-config.ts';
import { createLemonadeModelTemplate } from '../src/cms/lemonade/content-types.ts';
import { createLemonadeSeed, restoreLemonadeSeed } from '../src/cms/lemonade/seed.ts';

const resume = parse(resumeSchema, JSON.parse(await readFile(new URL('../src/content/resume.json', import.meta.url), 'utf8')));
const source = { projects, posts, resume, config: createContentConfig(resume) };
const template = createLemonadeModelTemplate(source);
const seed = createLemonadeSeed(source);
assert.deepEqual(restoreLemonadeSeed(seed), source, 'Lemonade seed must retain the entire source snapshot');
const directory = new URL('../cms/lemonade/', import.meta.url);
for (const path of ['content-types/', 'content/', 'draft-import/']) await mkdir(new URL(path, directory), { recursive: true });
const write = async (path, value) => writeFile(new URL(path, directory), JSON.stringify(value, null, 2) + '\n');
await write('model-template.json', template);
await write('seed-content.json', seed);
for (const model of template.models) {
    await write(`content-types/${model.key}.json`, model);
    await write(`content/${model.key}.json`, seed.entries.filter(entry => entry.content_type === model.key));
}
for (const type of ['project', 'article']) await write(`draft-import/${type}.json`, seed.entries.filter(entry => entry.content_type === type).map(entry => entry.fields));
await write('manifest.json', {
    format: 'resume25-lemonade-migration', version: 1, model_template: 'model-template.json', seed_content: 'seed-content.json',
    root_seed_key: seed.root, model_count: template.models.length, entry_count: seed.entries.length,
    entry_order: ['profile', 'project', 'article', 'experience', 'page', 'resume', 'site_settings'],
    models: template.models.map(model => ({ key: model.key, singleton: !!model.singleton, definition: `content-types/${model.key}.json`, content: `content/${model.key}.json`, entry_count: seed.entries.filter(entry => entry.content_type === model.key).length })),
    identity_policy: 'seed_key and $ref are migration-only. Resolve entry references to Lemonade-generated UUIDs before writing drafts. Embedded IDs are deterministic UUIDv5 values.',
    assets_policy: 'Preserve local/HTTPS paths as text. No asset upload or URL download is implied.',
});
console.log(`Created ${template.models.length} Lemonade models and ${seed.entries.length} source-backed seed entries in cms/lemonade/`);
