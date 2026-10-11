import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { parse } from 'valibot';
import { projects } from '../src/data/projects.ts';
import { posts } from '../src/data/posts.ts';
import { resumeSchema } from '../src/schemas/resume-schema.ts';
import { createContentConfig } from '../src/config/create-content-config.ts';
import { createLemonadeModelTemplate } from '../src/cms/lemonade/content-types.ts';
import { createLemonadeSeed, restoreLemonadeSeed } from '../src/cms/lemonade/seed.ts';

const document = JSON.parse(await readFile('src/content/resume.json', 'utf8'));
const source = (resume = document) => { const validated = parse(resumeSchema, resume); return { projects, posts, resume: validated, config: createContentConfig(validated) }; };
const json = async path => JSON.parse(await readFile(`cms/lemonade/${path}`, 'utf8'));

test('Lemonade native model template is dependency-closed and uses bounded native fields', async () => {
    const template = createLemonadeModelTemplate(source());
    assert.equal(template.format, 'lemonade-model-template');
    assert.equal(template.version, 1);
    assert.deepEqual(Object.keys(template).sort(), ['description', 'format', 'models', 'name', 'version']);
    assert.ok(Buffer.byteLength(JSON.stringify(template)) <= 262144);
    const keys = new Set(template.models.map(model => model.key));
    assert.equal(keys.size, template.models.length);
    function check(model, embedded = false) {
        assert.match(model.key, /^[a-z][a-z0-9_]{0,47}$/);
        assert.ok(model.fields.length >= 1 && model.fields.length <= 24);
        assert.equal(new Set(model.fields.map(field => field.key)).size, model.fields.length);
        for (const field of model.fields) {
            assert.equal(typeof field.required, 'boolean');
            assert.match(field.key, /^[a-z][a-z0-9_]{0,47}$/);
            if (field.target) assert.ok(keys.has(field.target));
            if (field.type === 'choices') {
                assert.ok(field.options.length >= 1 && field.options.length <= 100);
                assert.equal(new Set(field.options).size, field.options.length);
            }
            if (embedded) assert.ok(!('unique' in field));
            field.components?.forEach(component => check(component, true));
        }
    }
    template.models.forEach(model => check(model));
    assert.deepEqual(await json('model-template.json'), template);
    for (const model of template.models) assert.deepEqual(await json(`content-types/${model.key}.json`), model);
});

test('Lemonade seeds round-trip every source fact, HTML body, path, ID and order', async () => {
    const input = source();
    const seed = createLemonadeSeed(input);
    assert.deepEqual(restoreLemonadeSeed(seed), input);
    assert.deepEqual(await json('seed-content.json'), seed);
    assert.deepEqual(createLemonadeSeed(input), seed, 'Component UUIDs must be deterministic');
    const manifest = await json('manifest.json');
    assert.equal(manifest.entry_count, seed.entries.length);
    for (const model of manifest.models) {
        const expected = seed.entries.filter(entry => entry.content_type === model.key);
        assert.deepEqual(await json(model.content), expected);
        assert.equal(model.entry_count, expected.length);
    }
});

test('native flat draft files contain only project/article field values', async () => {
    const seed = createLemonadeSeed(source());
    for (const type of ['project', 'article']) {
        const drafts = await json(`draft-import/${type}.json`);
        assert.deepEqual(drafts, seed.entries.filter(entry => entry.content_type === type).map(entry => entry.fields));
        assert.ok(drafts.length <= 100 && Buffer.byteLength(JSON.stringify(drafts)) < 2 * 1024 * 1024);
        for (const row of drafts) {
            assert.ok(!('seed_key' in row) && !('fields' in row));
            assert.ok(Object.values(row).every(value => value === null || ['string', 'number', 'boolean'].includes(typeof value) || (Array.isArray(value) && value.every(item => typeof item === 'string'))));
        }
    }
});

test('Lemonade export follows changed role counts, achievement counts and current employment', () => {
    const changed = structuredClone(document);
    const current = structuredClone(changed.experience[0]);
    current.id = 'fixture-current-role'; current.endDate = null;
    current.highlights = current.highlights.slice(0, 1).map(item => ({ ...item, id: 'fixture-achievement', featured: false }));
    changed.experience = [current, ...changed.experience.slice(1, -1)];
    const input = source(changed);
    const seed = createLemonadeSeed(input);
    assert.deepEqual(restoreLemonadeSeed(seed), input);
    const currentSeed = seed.entries.find(entry => entry.seed_key === `experience:${current.id}`);
    assert.equal(currentSeed.fields.end_date, null);
    assert.equal(currentSeed.fields.highlights.length, current.highlights.length);
    assert.equal(currentSeed.fields.highlights[0].fields.featured, false);
});

test('broken references, duplicate identities and invalid domain fields fail restoration', () => {
    const make = () => structuredClone(createLemonadeSeed(source()));
    const missing = make(); missing.entries = missing.entries.filter(entry => entry.content_type !== 'profile');
    assert.throws(() => restoreLemonadeSeed(missing), /Missing or wrong profile reference/);
    const wrong = make(); wrong.entries.find(entry => entry.content_type === 'resume').fields.profile = { $ref: wrong.entries.find(entry => entry.content_type === 'project').seed_key };
    assert.throws(() => restoreLemonadeSeed(wrong), /Missing or wrong profile reference/);
    const duplicate = make(); duplicate.entries.push(duplicate.entries[0]);
    assert.throws(() => restoreLemonadeSeed(duplicate), /Duplicate migration seed identity/);
    const invalid = make(); invalid.entries.find(entry => entry.content_type === 'article').fields.slug = '../bad';
    assert.throws(() => restoreLemonadeSeed(invalid));
});
