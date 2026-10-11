import * as v from 'valibot';

const text = v.pipe(v.string(), v.minLength(1));
const destination = v.pipe(text, v.check(value => /^\/(?!\/)|^https:\/\//.test(value), 'Use a local path or HTTPS URL'));
const image = v.pipe(text, v.check(value => /^\/(?!\/)|^https:\/\//.test(value), 'Use a local path or HTTPS image URL'));
// The portfolio displays publication days; Contentful can return an ISO timestamp.
const publicationDate = v.union([
    v.pipe(text, v.isoDate()),
    v.pipe(text, v.isoTimestamp(), v.transform(value => value.slice(0, 10))),
]);
export const projectSchema = v.object({
    id: text, name: text, description: text, image,
    demo: v.optional(image), url: destination, tags: v.array(text),
});
export const postSchema = v.object({
    id: text, title: text, slug: v.pipe(text, v.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)),
    excerpt: text, content: text, date: publicationDate, tags: v.array(text), image: v.optional(image),
});
export const pageSchema = v.object({
    title: text, subtitle: v.optional(v.string()), description: text,
    action: v.optional(v.object({ text, href: destination })),
    meta: v.object({ title: text, description: text, keywords: text }),
});
export const settingsSchema = v.object({
    app: v.object({ title: text, description: text }),
    navItems: v.array(v.object({ name: text, path: v.pipe(text, v.regex(/^\/(?!\/)/)) })),
    socials: v.array(v.object({ name: text, href: destination, icon: text })),
    contactLinks: v.array(v.object({ name: text, href: v.pipe(text, v.check(value => /^https:\/\//.test(value) || /^mailto:[^\s@]+@[^\s@]+$/.test(value))) })),
});
