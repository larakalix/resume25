import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parse } from 'valibot';
import { posts } from '../src/data/posts.ts';
import { resumeSchema } from '../src/schemas/resume-schema.ts';
import { formatResumeDate } from '../src/utils/resume-date.ts';

const resume = parse(resumeSchema, JSON.parse(await readFile(new URL('../src/content/resume.json', import.meta.url), 'utf8')));

const { profile } = resume;
const text = [
    `${profile.name}\n${profile.headline}`,
    `${profile.location}${profile.openToRelocate ? ' | Open to relocate' : ''}\n${profile.email}\n${profile.phone}\n${profile.links.map(link => link.url).join('\n')}`,
    `PROFILE\n${profile.summary}`,
    `EXPERIENCE\n${resume.experience.map(role => [
        `${role.company} | ${role.location}${role.remote ? ' | Remote' : ''}`,
        role.role,
        `${formatResumeDate(role.startDate)} – ${role.endDate ? formatResumeDate(role.endDate) : 'Present'}`,
        ...role.highlights.map(item => `- ${item.text}`),
        `Technologies: ${role.technologies.join(', ')}`,
    ].join('\n')).join('\n\n')}`,
    `SKILLS\n${resume.skillGroups.map(group => `${group.label}: ${group.items.join(', ')}`).join('\n')}`,
    `EDUCATION\n${resume.education.map(item => `${item.institution}\n${item.qualification} | ${formatResumeDate(item.date)}\n${item.status}`).join('\n\n')}`,
    `CERTIFICATIONS\n${resume.certifications.map(item => `${item.issuer}\n${item.name} | ${formatResumeDate(item.date)}`).join('\n\n')}`,
    `LANGUAGES\n${resume.languages.map(item => `${item.name}: ${item.proficiency}`).join('\n')}`,
].join('\n\n') + '\n';
await writeFile(new URL(`../public${resume.downloads.text}`, import.meta.url), text);

// Browser summaries are derived from the same validated snapshot as downloads/CMS exports.
const generated = new URL('../src/data/generated/', import.meta.url);
await mkdir(generated, { recursive: true });
const recentExperience = resume.experience.slice(0, 2).map(({ id, company, role, startDate, endDate }) => ({ id, company, role, startDate, endDate }));
await writeFile(new URL('profile.json', generated), JSON.stringify(profile, null, 2) + '\n');
await writeFile(new URL('recent-experience.json', generated), JSON.stringify(recentExperience, null, 2) + '\n');
await writeFile(new URL('post-summaries.json', generated), JSON.stringify(posts.map(post => { const summary = { ...post }; delete summary.content; return summary; }), null, 2) + '\n');
