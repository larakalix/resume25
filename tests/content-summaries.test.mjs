import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { posts } from '../src/data/posts.ts';

const json = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const resume = await json('../src/content/resume.json');

test('generated profile and recent roles match the resume without shipping achievements', async () => {
    assert.deepEqual(await json('../src/data/generated/profile.json'), resume.profile);
    const recent = await json('../src/data/generated/recent-experience.json');
    assert.deepEqual(recent.map(role => role.id), resume.experience.slice(0, 2).map(role => role.id));
    for (const role of recent) {
        const source = resume.experience.find(item => item.id === role.id);
        assert.deepEqual(Object.keys(role).sort(), ['company', 'endDate', 'id', 'role', 'startDate']);
        for (const key of Object.keys(role)) assert.deepEqual(role[key], source[key]);
    }
});

test('post summaries preserve listing fields and exclude article bodies', async () => {
    const summaries = await json('../src/data/generated/post-summaries.json');
    assert.equal(summaries.length, posts.length);
    for (const post of posts) {
        const { content: _content, ...expected } = post;
        const summary = summaries.find(item => item.id === post.id);
        assert.deepEqual(summary, expected);
        assert.ok(!Object.hasOwn(summary, 'content'));
    }
});
