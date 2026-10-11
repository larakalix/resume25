import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { parse, compileScript } from 'vue/compiler-sfc';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import ts from 'typescript';

// Compile the real small SFC with the existing Vue toolchain: no test-only copy of its template.
const require = createRequire(import.meta.url);
const source = await readFile(new URL('../src/components/molecules/ml-collection-state.vue', import.meta.url), 'utf8');
const { descriptor } = parse(source);
const script = compileScript(descriptor, { id: 'collection-state-test', inlineTemplate: true });
const compiled = ts.transpileModule(script.content, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
    .replaceAll('from "vue"', `from ${JSON.stringify(pathToFileURL(require.resolve('vue')).href)}`)
    .replaceAll("from 'vue'", `from ${JSON.stringify(pathToFileURL(require.resolve('vue')).href)}`)
    .replaceAll("'~/utils/collection-state'", JSON.stringify(new URL('../src/utils/collection-state.ts', import.meta.url).href));
const { default: CollectionState } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
async function render(props) {
    return renderToString(createSSRApp({ render: () => h(CollectionState, { label: 'posts', count: 2, ...props }, { default: () => h('article', 'Ready content') }) }));
}
test('loading and error states suppress ready content even when stale items exist', async () => {
    const loading = await render({ isLoading: true, isError: true });
    assert.match(loading, /role="status"/);
    assert.match(loading, /Loading posts/);
    assert.ok(!loading.includes('Ready content'));
    const error = await render({ isError: true, error: new Error('Connection unavailable') });
    assert.match(error, /role="alert"/);
    assert.match(error, /Connection unavailable/);
    assert.ok(!error.includes('Ready content'));
});
test('empty state uses the collection label and ready state renders only its slot', async () => {
    assert.match(await render({ count: 0 }), /No posts found/);
    assert.match(await render({ count: 0, label: 'projects' }), /No projects found/);
    assert.equal(await render({}), '<!--[--><article>Ready content</article><!--]-->');
});
