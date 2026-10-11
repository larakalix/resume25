import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createPortfolioQueries } from '../src/application/content/portfolio-queries.ts';
import { createMockRepositories } from '../src/infrastructure/content/mock-repositories.ts';

const source = JSON.parse(await readFile('src/content/resume.json', 'utf8'));

test('mock repositories preserve source facts and isolate callers from mutation', async () => {
    const repositories = createMockRepositories();
    const first = await repositories.resume.getResume();
    assert.deepEqual(first, source);
    first.profile.name = 'changed by caller';
    first.experience[0].highlights.length = 0;
    assert.deepEqual(await repositories.resume.getResume(), source);
    const posts = await repositories.articles.listArticles();
    assert.ok(posts.every(post => !('content' in post)));
});

test('application queries accept replacement repositories and preserve current roles', async () => {
    const repositories = createMockRepositories();
    const role = { id: 'fixture-current', company: 'Fixture company', role: 'Fixture role', startDate: '2026-01', endDate: null };
    const queries = createPortfolioQueries({
        ...repositories,
        resume: {
            ...repositories.resume,
            async getResume() { return { ...source, experience: [{ ...source.experience[0], ...role }] }; },
        },
    });
    const home = await queries.getHome();
    assert.deepEqual(home.experience, [role]);
    assert.ok(home.articles.every((post, index) => index === 0 || post.date <= home.articles[index - 1].date));
    assert.ok(home.articles.every(post => !('content' in post)));
});

test('missing articles, empty collections and repository failures retain their meaning', async () => {
    const repositories = createMockRepositories();
    const queries = createPortfolioQueries({ ...repositories, articles: { async listArticles() { return []; }, async findArticle() { return null; } }, projects: { async listProjects() { return []; } } });
    assert.equal(await queries.getArticle('missing'), null);
    assert.deepEqual((await queries.getHome()).projects, []);
    assert.deepEqual((await queries.getHome()).articles, []);
    const failed = createPortfolioQueries({ ...repositories, profile: { async getProfile() { throw new Error('Source unavailable'); } } });
    await assert.rejects(failed.getHome(), /Source unavailable/);
});

test('adjacent articles follow date order and preserve authored content', async () => {
    const queries = createPortfolioQueries(createMockRepositories());
    const articles = await queries.listArticles();
    for (const [index, article] of articles.entries()) {
        const result = await queries.getArticle(article.slug);
        assert.equal(result.previous?.id ?? null, articles[index - 1]?.id ?? null);
        assert.equal(result.next?.id ?? null, articles[index + 1]?.id ?? null);
        assert.ok(result.article.content.length > 0);
    }
});
