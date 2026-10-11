import * as v from 'valibot';

const text = v.pipe(v.string(), v.trim(), v.minLength(1));
const month = v.pipe(v.string(), v.regex(/^\d{4}-(0[1-9]|1[0-2])$/));
const httpsUrl = v.pipe(v.string(), v.url(), v.startsWith('https://'));
const downloadPath = v.pipe(v.string(), v.regex(/^\/[a-z0-9-]+\.(pdf|txt)$/));
const uniqueIds = (items: { id: string }[]) => new Set(items.map(item => item.id)).size === items.length;

const experienceSchema = v.pipe(v.object({
    id: text,
    company: text,
    role: text,
    location: text,
    startDate: month,
    endDate: v.nullable(month),
    remote: v.boolean(),
    highlights: v.pipe(v.array(v.object({ id: text, text, featured: v.boolean() })), v.minLength(1), v.check(items => uniqueIds(items), 'Highlight IDs must be unique')),
    technologies: v.array(text),
}), v.check(role => role.endDate === null || role.endDate >= role.startDate, 'End date must follow start date'));

export const resumeSchema = v.object({
    schemaVersion: v.literal(1),
    sourceDocument: text,
    profile: v.object({
        name: text,
        headline: text,
        location: text,
        openToRelocate: v.boolean(),
        summary: text,
        email: v.pipe(v.string(), v.email()),
        phone: text,
        phoneHref: v.pipe(v.string(), v.regex(/^tel:\+\d+$/)),
        links: v.array(v.object({ label: text, url: httpsUrl })),
    }),
    experience: v.pipe(v.array(experienceSchema), v.minLength(1), v.check(items => uniqueIds(items), 'Role IDs must be unique')),
    skillGroups: v.pipe(v.array(v.object({ id: text, label: text, items: v.array(text) })), v.check(items => uniqueIds(items), 'Skill group IDs must be unique')),
    education: v.pipe(v.array(v.object({ id: text, institution: text, qualification: text, date: month, status: text })), v.check(items => uniqueIds(items), 'Education IDs must be unique')),
    certifications: v.pipe(v.array(v.object({ id: text, issuer: text, name: text, date: month })), v.check(items => uniqueIds(items), 'Certification IDs must be unique')),
    languages: v.array(v.object({ name: text, proficiency: text })),
    downloads: v.object({ pdf: downloadPath, text: downloadPath }),
});
