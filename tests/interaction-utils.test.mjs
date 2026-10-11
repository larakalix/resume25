import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getCollectionState } from '../src/utils/collection-state.ts';
import { filterProjects, normalizeTechnology, resolveProjectFilter } from '../src/utils/project-filters.ts';
import { splitPageDescription } from '../src/utils/page-description.ts';
import { formatPostDate } from '../src/utils/post-date.ts';
import { formatResumeDate } from '../src/utils/resume-date.ts';
import { copyEmail } from '../src/utils/copy-email.ts';

test('collection states prioritize loading, then errors, then empty, then content', () => {
    for (const count of [0, 3]) {
        assert.equal(getCollectionState(true, true, count), 'loading');
        assert.equal(getCollectionState(true, false, count), 'loading');
        assert.equal(getCollectionState(false, true, count), 'error');
    }
    assert.equal(getCollectionState(false, false, 0), 'empty');
    assert.equal(getCollectionState(false, false, 3), 'ready');
});
test('technology filtering handles legacy spelling, invalid queries, and no results without changing source order', () => {
    const projects = [{ tags: ['NextJS'] }, { tags: ['Next.js', 'React'] }, { tags: ['Nuxt'] }];
    assert.equal(normalizeTechnology('Next.js'), 'nextjs');
    assert.deepEqual(filterProjects(projects, 'nextjs'), projects.slice(0, 2));
    assert.deepEqual(filterProjects(projects, 'react'), [projects[1]]);
    assert.deepEqual(filterProjects(projects, 'nuxt'), [projects[2]]);
    assert.deepEqual(filterProjects(projects, 'unknown'), []);
    assert.equal(filterProjects(projects, 'all'), projects);
    for (const query of [undefined, null, ['react'], '', 'javascript:alert(1)']) assert.equal(resolveProjectFilter(query), 'all');
    assert.equal(resolveProjectFilter('react'), 'react');
});
test('shared formatting trims empty paragraphs and keeps dates stable across timezone boundaries', () => {
    assert.deepEqual(splitPageDescription(' Hello | | world | '), ['Hello', 'world']);
    assert.deepEqual(splitPageDescription(''), []);
    assert.equal(formatPostDate('2025-06-15'), 'June 15, 2025');
    assert.equal(formatPostDate('2025-01-01T00:30:00Z'), 'January 1, 2025');
    assert.equal(formatResumeDate('2025-01'), 'Jan 2025');
});
test('copy email reports success and provides an email-link fallback on failure or missing clipboard', async () => {
    let copied;
    assert.match(await copyEmail('hello@example.com', async text => { copied = text; }), /copied/);
    assert.equal(copied, 'hello@example.com');
    assert.match(await copyEmail('hello@example.com', async () => { throw new Error('Denied'); }), /Use the email link/);
    assert.match(await copyEmail('hello@example.com'), /Use the email link/);
});
