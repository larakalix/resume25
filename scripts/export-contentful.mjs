import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parse } from 'valibot';
import { projects } from '../src/data/projects.ts';
import { posts } from '../src/data/posts.ts';
import { resumeSchema } from '../src/schemas/resume-schema.ts';
import { createContentConfig } from '../src/config/create-content-config.ts';
import { toContentfulExport } from '../src/cms/contentful/adapter.ts';

const resume = parse(resumeSchema, JSON.parse(await readFile(new URL('../src/content/resume.json', import.meta.url), 'utf8')));
const snapshot = toContentfulExport({ projects, posts, resume, config: createContentConfig(resume) });
const directory = new URL('../cms/contentful/', import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL('portfolio-export.json', directory), JSON.stringify(snapshot, null, 2) + '\n');
console.log(`Exported ${snapshot.contentTypes.length} content types and ${snapshot.entries.length} entries to cms/contentful/portfolio-export.json`);
