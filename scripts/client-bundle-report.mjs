import { readFile } from 'node:fs/promises';
import { resolve, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

// Follow eager imports only. Dynamic imports, navigation prefetch and analytics are separate costs.
export async function clientBundleReport(directory = '.output/public') {
    const root = resolve(directory);
    const html = await readFile(resolve(root, 'index.html'), 'utf8');
    const urls = [...html.matchAll(/<(?:script|link)\b[^>]*>/g)]
        .map(([tag]) => /<script\b/.test(tag) || /rel="modulepreload"/.test(tag) ? tag.match(/(?:src|href)="([^"]+\.js)"/)?.[1] : undefined)
        .filter(Boolean);
    const files = new Map();
    async function visit(path) {
        const local = relative(root, path);
        if (files.has(path) || local.startsWith('..') || isAbsolute(local)) return;
        const source = await readFile(path);
        files.set(path, source);
        const imports = source.toString().matchAll(/\bfrom\s*["']([^"']+\.js)["']|\bimport\s*["']([^"']+\.js)["']/g);
        for (const match of imports) {
            const name = match[1] ?? match[2];
            if (name.startsWith('.')) await visit(resolve(dirname(path), name));
            else if (name.startsWith('/')) await visit(resolve(root, `.${name}`));
        }
    }
    for (const url of urls) await visit(resolve(root, `.${url}`));
    return {
        initialJsBytes: [...files.values()].reduce((total, buffer) => total + buffer.length, 0),
        initialJsGzipBytes: [...files.values()].reduce((total, buffer) => total + gzipSync(buffer, { level: 9 }).length, 0),
        files: [...files.keys()].map(path => relative(root, path)).sort(),
    };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    console.log(JSON.stringify(await clientBundleReport(), null, 2));
}
