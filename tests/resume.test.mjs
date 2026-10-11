import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { safeParse } from 'valibot';
import { resumeSchema } from '../src/schemas/resume-schema.ts';

const document = JSON.parse(await readFile(new URL('../src/content/resume.json', import.meta.url), 'utf8'));
test('published resume passes the CMS contract', () => {
    assert.ok(safeParse(resumeSchema, document).success);
    assert.ok(document.experience.length > 0);
});
test('invalid CMS dates, duplicate IDs and unsafe links are rejected', () => {
    for (const mutate of [
        doc => { doc.experience[0].startDate = '2025-13'; },
        doc => { doc.experience[0].endDate = '2020-01'; },
        doc => { doc.experience[1].id = doc.experience[0].id; },
        doc => { doc.experience[0].highlights[1].id = doc.experience[0].highlights[0].id; },
        doc => { doc.profile.links[0].url = 'javascript:alert(1)'; },
        doc => { doc.downloads.pdf = '//example.com/resume.pdf'; },
    ]) {
        const candidate = structuredClone(document);
        mutate(candidate);
        assert.equal(safeParse(resumeSchema, candidate).success, false);
    }
});

test('CMS accepts added or removed roles, updated achievements, and current employment', () => {
    const current = structuredClone(document);
    current.experience[0].endDate = null;
    current.experience[0].highlights.push({ id: 'new-achievement', text: 'An updated achievement.', featured: true });
    assert.ok(safeParse(resumeSchema, current).success);
    const added = structuredClone(current.experience[0]);
    added.id = 'another-role';
    current.experience.push(added);
    assert.ok(safeParse(resumeSchema, current).success);
    current.experience = current.experience.slice(0, 1);
    assert.ok(safeParse(resumeSchema, current).success);
});
