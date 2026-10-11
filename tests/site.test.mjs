import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { after, before, test } from 'node:test';

const origin = 'http://127.0.0.1:4184';
let server;
before(async () => {
    server = spawn(process.execPath, ['.output/server/index.mjs'], {
        env: { ...process.env, HOST: '127.0.0.1', PORT: '4184' },
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    const timeout = setTimeout(() => server.kill(), 10000);
    const ready = await Promise.race([
        once(server.stdout, 'data').then(([chunk]) => chunk.toString().includes('Listening')),
        once(server, 'exit').then(() => false),
    ]);
    clearTimeout(timeout);
    assert.ok(ready, 'Production preview must start');
});
after(() => { server?.kill(); });

const pages = [
    ['/', 'Explore the world'],
    ['/projects', 'All projects'],
    ['/blog', 'Why use Nuxt?'],
    ['/contact', 'Get in touch'],
    ['/resume', 'Download text resume'],
    ['/post/why-use-nuxt', 'File-based routing'],
    ['/post/nuxt-vs-other-frameworks', 'Nuxt vs Next.js'],
    ['/post/nuxt-v4-new-features', 'New directory structure'],
];
for (const [path, expectedContent] of pages) {
    test(`${path} has prerendered content and one primary heading`, async () => {
        const file = `.output/public${path === '/' ? '' : path}/index.html`;
        const html = await readFile(file, 'utf8');
        const body = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replaceAll('&#39;', "'");
        assert.ok(body.includes(expectedContent), 'Content must exist without executing JavaScript');
        assert.equal((body.match(/<h1\b/g) ?? []).length, 1);
        assert.match(html, /name="description" content="[^"]+"/);
        const response = await fetch(`${origin}${path}`);
        assert.equal(response.status, 200);
    });
}

test('project cards use existing responsive previews and no autoplay GIFs', async () => {
    const html = await readFile('.output/public/projects/index.html', 'utf8');
    const images = [...html.matchAll(/<img\b[^>]*>/g)].map(match => match[0]);
    assert.equal(images.length, 9);
    for (const image of images) {
        assert.ok(!image.includes('.gif'));
        assert.match(image, /loading="lazy"/);
        assert.match(image, /srcset="[^"]+\.webp/);
        assert.match(image, /width="960"/);
        const urls = [...image.matchAll(/\/img\/[a-z0-9-]+\.webp/g)].map(match => match[0]);
        for (const url of new Set(urls)) {
            assert.ok((await stat(`.output/public${url}`)).size < 100000);
        }
    }
});

test('missing articles and routes return 404 without redirecting', async () => {
    for (const path of ['/post/does-not-exist', '/does-not-exist', '/not-found']) {
        const response = await fetch(`${origin}${path}`, { redirect: 'manual', headers: { accept: 'text/html' } });
        assert.equal(response.status, 404, path);
        const html = await response.text();
        assert.match(html, /Page not found/);
        assert.match(html, /noindex/);
    }
});

test('download matches the generated resume and the social preview is served', async () => {
    const response = await fetch(`${origin}/ivan-lara-resume.txt`);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), await readFile('public/ivan-lara-resume.txt', 'utf8'));
    const image = await fetch(`${origin}/social-preview.png`);
    assert.equal(image.status, 200);
    assert.match(image.headers.get('content-type'), /image\/png/);
});

test('resume renders every role and preserves qualification status and dates', async () => {
    const document = JSON.parse(await readFile('src/content/resume.json', 'utf8'));
    const html = await readFile('.output/public/resume/index.html', 'utf8');
    const text = await readFile('public/ivan-lara-resume.txt', 'utf8');
    for (const role of document.experience) {
        assert.ok(html.includes(role.company));
        assert.ok(html.includes(`datetime="${role.startDate}"`));
        if (role.endDate) assert.ok(html.includes(`datetime="${role.endDate}"`));
        else assert.ok(html.includes('Present'));
        for (const highlight of role.highlights) assert.ok(text.includes(highlight.text));
    }
    for (const item of document.education) assert.ok(html.includes(item.status));
    assert.ok(html.includes(document.profile.phoneHref));
    assert.equal(text.includes('Present'), document.experience.some(role => role.endDate === null));
    const pdf = await fetch(`${origin}${document.downloads.pdf}`);
    assert.equal(pdf.status, 200);
    assert.match(pdf.headers.get('content-type'), /application\/pdf/);
    assert.deepEqual(Buffer.from(await pdf.arrayBuffer()), await readFile('public/ivan-lara-resume.pdf'));
});

test('approved homepage ships without review chrome and navigation follows the current route', async () => {
    const home = await (await fetch(`${origin}/`)).text();
    const body = home.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
    assert.ok(!body.includes('Three design directions'));
    assert.ok(!body.includes('Warm motion · Prototype'));
    assert.ok(!/<meta[^>]+name="robots"[^>]+noindex/.test(home));
    assert.match(body, /portfolio-home/);
    assert.ok(!body.includes('Studio concept'));
    for (const path of ['/studio', '/concept', '/design-lab']) {
        const removed = await fetch(`${origin}${path}`, { redirect: 'manual' });
        assert.equal(removed.status, 404, `${path} preview route is removed`);
    }
    assert.ok(!body.includes('Compare with current portfolio'));
    assert.match(body, /Explore the world/);
    assert.match(body, /data-experience="globe"/);
    assert.ok(!body.includes('Watch demo'));
    assert.ok(!body.includes('.gif'), 'Homepage does not render demo content');
    for (const [path] of pages) {
        const html = await (await fetch(`${origin}${path}`)).text();
        const nav = html.match(/<nav\b[^>]*aria-label="Main navigation"[^>]*>[\s\S]*?<\/nav>/)?.[0];
        assert.ok(nav, path);
        const anchors = nav.match(/<a\b[^>]*>/g) ?? [];
        for (const destination of ['/', '/blog', '/projects', '/resume', '/contact']) {
            assert.ok(anchors.some(anchor => anchor.includes(`href="${destination}"`)), `${path}: ${destination}`);
        }
        const expected = path.startsWith('/post/') ? '/blog' : path;
        assert.ok(anchors.some(anchor => anchor.includes(`href="${expected}"`) && /aria-current="(?:page|true)"/.test(anchor)), path);
        assert.ok(!nav.includes('href="/concept"'), 'Main navigation must use public routes');
    }
});


test('homepage eager JavaScript excludes resume achievements and full article bodies', async () => {
    const { clientBundleReport } = await import('../scripts/client-bundle-report.mjs');
    const report = await clientBundleReport();
    const scripts = (await Promise.all(report.files.map(path => readFile(`.output/public/${path}`, 'utf8')))).join('\n');
    const source = JSON.parse(await readFile('src/content/resume.json', 'utf8'));
    for (const role of source.experience) {
        for (const highlight of role.highlights) assert.ok(!scripts.includes(highlight.text), `Unneeded achievement shipped: ${role.id}`);
    }
    const { posts } = await import('../src/data/posts.ts');
    for (const post of posts) {
        const bodyHeading = post.content.match(/<h2>([^<]+)<\/h2>/)?.[1];
        assert.ok(bodyHeading, `Article fixture needs a body heading: ${post.slug}`);
        assert.ok(!scripts.includes(bodyHeading), `Article body shipped: ${post.slug}`);
    }
    assert.ok(report.initialJsBytes > 0);
    assert.ok(!scripts.includes('THREE.WebGLRenderer'), 'Three.js must load through the optional scene adapter, outside eager homepage imports');
});


test('mock content API preserves sources and returns lightweight listing DTOs', async () => {
    const document = JSON.parse(await readFile('src/content/resume.json', 'utf8'));
    const { projects } = await import('../src/data/projects.ts');
    const { posts } = await import('../src/data/posts.ts');
    const home = await (await fetch(`${origin}/api/portfolio/home`)).json();
    assert.deepEqual(home.profile, document.profile);
    assert.deepEqual(home.skillGroups, document.skillGroups);
    assert.deepEqual(home.projects, projects.slice(0, 3));
    assert.equal(home.experience.length, document.experience.length);
    assert.ok(home.experience.every(role => !('highlights' in role)));
    assert.ok(home.articles.every(article => !('content' in article)));
    assert.deepEqual(await (await fetch(`${origin}/api/portfolio/resume`)).json(), document);
    assert.deepEqual(await (await fetch(`${origin}/api/portfolio/projects`)).json(), projects);
    const listing = await (await fetch(`${origin}/api/portfolio/articles/list`)).json();
    assert.equal(listing.length, posts.length);
    assert.ok(listing.every(article => !('content' in article)));
    for (const post of posts) {
        const result = await (await fetch(`${origin}/api/portfolio/articles/${post.slug}`)).json();
        assert.deepEqual(result.article, post);
    }
    assert.equal((await fetch(`${origin}/api/portfolio/articles/does-not-exist`)).status, 404);
});

test('explorer world prerenders identity, readable places and source skills with separate projects', async () => {
    const html = await readFile('.output/public/index.html', 'utf8');
    const body = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replaceAll('&amp;', '&').replaceAll('&#39;', "'");
    const home = await (await fetch(`${origin}/api/portfolio/home`)).json();
    assert.match(body, /I turn complex ideas/);
    const playgroundStart = body.search(/class="[^"]*\bexplorer-world\b[^"]*"/);
    const projectsStart = body.indexOf('class="section-space selected-projects"');
    assert.ok(playgroundStart >= 0 && projectsStart > playgroundStart);
    const playground = body.slice(playgroundStart, projectsStart);
    assert.ok(playground.includes(home.profile.name));
    assert.ok(playground.includes(home.profile.headline));
    assert.match(playground, /Explore without the 3D world/);
    assert.ok(playground.includes(home.profile.summary));
    for (const group of home.skillGroups) {
        assert.ok(playground.includes(group.label));
        for (const skill of group.items) assert.ok(playground.includes(skill), `Prerendered source skill: ${skill}`);
    }
    for (const label of ['About me', 'My toolkit', 'How I build', 'Say hello', 'Jump', 'Wave', 'Meadow Bridge']) assert.ok(playground.toLowerCase().includes(label.toLowerCase()));
    assert.match(playground, /href="\/resume"/);
    assert.match(playground, /href="\/projects"/);
    const { projects } = await import('../src/data/projects.ts');
    for (const project of projects) assert.ok(!playground.includes(project.name));
    assert.match(playground, /aria-label="Main navigation"/);
    assert.match(playground, /aria-label="Settings"[^>]*aria-haspopup="dialog"/);
    assert.match(playground, /<noscript\b[^>]*>Explore the complete portfolio in the text version below\.<\/noscript>/);
    assert.match(playground, /role="application"/);
    assert.match(playground, /<canvas\b/);
    assert.ok(!body.includes('career-journey'));
    assert.ok(!body.includes('idea-playground'));
    assert.ok(body.includes('Ideas, made real.'));
    assert.ok(body.includes('Visit Booqself'));
    assert.ok(!body.includes('Watch demo'));
});
