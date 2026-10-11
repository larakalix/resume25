import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { projects } from '../src/data/projects.ts';
import { posts } from '../src/data/posts.ts';
import { createContentConfig } from '../src/config/create-content-config.ts';
import { fromContentfulExport, toContentfulExport } from '../src/cms/contentful/adapter.ts';

const resume = JSON.parse(await readFile(new URL('../src/content/resume.json', import.meta.url), 'utf8'));
const source = { projects, posts, resume, config: createContentConfig(resume) };
test('Contentful export round-trips all source content, reference order, IDs, HTML and URLs', () => {
    const snapshot = toContentfulExport(source);
    assert.deepEqual(fromContentfulExport(snapshot), source);
    assert.deepEqual(toContentfulExport(source), snapshot);
    assert.equal(new Set(snapshot.entries.map(entry => entry.sys.id)).size, snapshot.entries.length);
    for (const entry of snapshot.entries) {
        const model = snapshot.contentTypes.find(type => type.sys.id === entry.sys.contentType.sys.id);
        assert.ok(model);
        assert.ok(Object.keys(entry.fields).every(key => model.fields.some(field => field.id === key)));
    }
});
test('CMS current roles and changed achievements survive conversion without fabricated dates', () => {
    const updated = structuredClone(source);
    updated.resume.experience[0].endDate = null;
    updated.resume.experience[0].highlights.push({ id: 'additional', text: 'An added achievement.', featured: false });
    const result = fromContentfulExport(toContentfulExport(updated));
    assert.deepEqual(result.resume, updated.resume);
});
test('CMS rejects missing references, duplicate entries, wrong entry types and unsafe destinations', () => {
    const pristine = toContentfulExport(source);
    const find = (snapshot, type) => snapshot.entries.find(entry => entry.sys.contentType.sys.id === type);
    for (const mutate of [
        snapshot => { snapshot.entries.shift(); },
        snapshot => { snapshot.entries.push(snapshot.entries[0]); },
        snapshot => { find(snapshot, 'experience').sys.contentType.sys.id = 'post'; },
        snapshot => { find(snapshot, 'project').fields.url['en-US'] = 'javascript:alert(1)'; },
        snapshot => { delete find(snapshot, 'post').fields.title; },
        snapshot => { find(snapshot, 'achievement').fields.featured['en-US'] = 'true'; },
    ]) {
        const snapshot = structuredClone(pristine);
        mutate(snapshot);
        assert.throws(() => fromContentfulExport(snapshot));
    }
});
test('CMS locale selection is explicit with an optional declared fallback', () => {
    const snapshot = toContentfulExport(source);
    assert.throws(() => fromContentfulExport(snapshot, 'es'));
    assert.deepEqual(fromContentfulExport(snapshot, 'es', 'en-US'), source);
    const translated = toContentfulExport(source, 'es');
    assert.deepEqual(fromContentfulExport(translated, 'es'), source);
});
test('Contentful publication timestamps normalize to the existing calendar-day contract', () => {
    const snapshot = toContentfulExport(source);
    const article = snapshot.entries.find(entry => entry.sys.contentType.sys.id === 'post');
    article.fields.date['en-US'] += 'T00:00:00.000Z';
    assert.deepEqual(fromContentfulExport(snapshot).posts, source.posts);
    article.fields.date['en-US'] = 'not-a-date';
    assert.throws(() => fromContentfulExport(snapshot));
});
