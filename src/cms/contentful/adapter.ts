import { parse } from 'valibot';
import models from './content-types.json' with { type: 'json' };
import { resumeSchema } from '../../schemas/resume-schema.ts';
import { pageSchema, postSchema, projectSchema, settingsSchema } from '../../schemas/portfolio-schema.ts';
import type { ContentfulEntry, ContentfulExport, EntryLink, PortfolioContent } from '../../types/contentful';

const link = (id: string): EntryLink => ({ sys: { type: 'Link', linkType: 'Entry', id } });
const object = (value: unknown): Record<string, unknown> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a content object');
    return value as Record<string, unknown>;
};

/** Offline CMA/CLI export. IDs and reference-array order remain deterministic. */
export function toContentfulExport(content: PortfolioContent, locale = 'en-US'): ContentfulExport {
    const entries: ContentfulEntry[] = [];
    const ids = new Set<string>();
    function add(type: string, id: string, values: Record<string, unknown>) {
        const entryId = `${type}-${id}`;
        if (!/^[a-zA-Z0-9_-]{1,64}$/.test(entryId) || ids.has(entryId)) throw new Error(`Invalid or duplicate entry ID: ${entryId}`);
        ids.add(entryId);
        entries.push({ sys: { id: entryId, type: 'Entry', contentType: { sys: { type: 'Link', linkType: 'ContentType', id: type } } },
            fields: Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined && value !== null).map(([key, value]) => [key, { [locale]: value }])) });
        return link(entryId);
    }
    function identified(type: string, items: { id: string }[]) {
        return items.map(({ id, ...fields }) => add(type, id, { contentId: id, ...fields }));
    }
    const projects = identified('project', content.projects);
    const posts = identified('post', content.posts);
    const { profile, experience, skillGroups, education, certifications, languages, ...resumeFields } = content.resume;
    const profileLink = add('profile', 'ivan-lara', { ...profile, links: profile.links.map((item, index) => add('link', `profile-${index}`, item)) });
    const roles = experience.map(({ id, highlights, ...fields }) => add('experience', id, {
        contentId: id, ...fields,
        highlights: highlights.map(({ id: highlightId, ...highlight }) => add('achievement', `${id}-${highlightId}`, { contentId: highlightId, ...highlight })),
    }));
    const resumeLink = add('resume', 'main', { ...resumeFields, profile: profileLink, experience: roles,
        skillGroups: identified('skillGroup', skillGroups), education: identified('education', education), certifications: identified('certification', certifications),
        languages: languages.map((item, index) => add('language', `${index}`, item)),
    });
    const pages = [...content.config.pages].map(([key, { meta, ...page }]) => add('page', key, {
        key, ...page, seoTitle: meta.title, seoDescription: meta.description, seoKeywords: meta.keywords,
    }));
    const navItems = content.config.navItems.map(({ name, path }, index) => add('link', `nav-${index}`, { label: name, url: path }));
    const socials = content.config.socials.map(({ name, href, icon }, index) => add('link', `social-${index}`, { label: name, url: href, icon }));
    const contactLinks = content.config.contactLinks.map(({ name, href }, index) => add('link', `contact-${index}`, { label: name, url: href }));
    add('siteSettings', 'main', { ...content.config.app, pages, navItems, socials, contactLinks, projects, posts, resume: resumeLink });
    const result = { contentTypes: structuredClone(models), entries, assets: [], locales: [{ code: locale, name: locale, default: true, fallbackCode: null }] };
    // Validate the generated graph using the same boundary used for incoming snapshots.
    fromContentfulExport(result, locale);
    return result;
}

/** Resolve an untrusted localized export into the existing UI contracts. No SDK or network required. */
export function fromContentfulExport(input: unknown, locale = 'en-US', fallbackLocale?: string): PortfolioContent {
    const snapshot = object(input);
    if (!Array.isArray(snapshot.entries)) throw new Error('Contentful entries must be an array');
    const entries = new Map<string, Record<string, unknown>>();
    for (const raw of snapshot.entries) {
        const entry = object(raw);
        const sys = object(entry.sys);
        if (typeof sys.id !== 'string' || entries.has(sys.id)) throw new Error(`Invalid or duplicate entry: ${sys.id}`);
        entries.set(sys.id, entry);
    }
    function read(reference: unknown, expectedType: string): Record<string, unknown> {
        const referenceSys = object(object(reference).sys);
        if (referenceSys.type !== 'Link' || referenceSys.linkType !== 'Entry' || typeof referenceSys.id !== 'string') throw new Error('Expected an Entry link');
        const entry = entries.get(referenceSys.id);
        if (!entry) throw new Error(`Missing linked entry: ${referenceSys.id}`);
        const sys = object(entry.sys);
        const contentType = object(object(sys.contentType).sys);
        if (sys.type !== 'Entry' || contentType.id !== expectedType) throw new Error(`Expected ${expectedType}: ${referenceSys.id}`);
        const fields = object(entry.fields);
        const model = models.find(item => item.sys.id === expectedType);
        if (!model) throw new Error(`Unknown content type: ${expectedType}`);
        const values: Record<string, unknown> = {};
        for (const field of model.fields) {
            const localized = fields[field.id] === undefined ? {} : object(fields[field.id]);
            const value = localized[locale] ?? (fallbackLocale ? localized[fallbackLocale] : undefined);
            if (value === undefined || value === null) {
                if (field.required) throw new Error(`Missing ${expectedType}.${field.id} in ${locale}`);
                continue;
            }
            const valid = field.type === 'Symbol' || field.type === 'Text' || field.type === 'Date' ? typeof value === 'string'
                : field.type === 'Boolean' ? typeof value === 'boolean'
                : field.type === 'Integer' ? Number.isInteger(value)
                : field.type === 'Array' ? Array.isArray(value)
                : typeof value === 'object' && !Array.isArray(value);
            if (!valid) throw new Error(`Invalid ${expectedType}.${field.id}`);
            values[field.id] = value;
        }
        return values;
    }
    function many(references: unknown, type: string) {
        if (!Array.isArray(references)) throw new Error(`Expected ${type} references`);
        return references.map(reference => read(reference, type));
    }
    const roots = [...entries.values()].filter(entry => object(object(object(entry.sys).contentType).sys).id === 'siteSettings');
    if (roots.length !== 1) throw new Error('Expected exactly one site settings entry');
    const site = read(link(String(object(roots[0]!.sys).id)), 'siteSettings');
    const withId = ({ contentId, ...fields }: Record<string, unknown>) => ({ id: contentId, ...fields });
    const resume = read(site.resume, 'resume');
    const profile = read(resume.profile, 'profile');
    const document = parse(resumeSchema, { ...resume,
        profile: { ...profile, links: many(profile.links, 'link').map(({ label, url }) => ({ label, url })) },
        experience: many(resume.experience, 'experience').map(role => ({ ...withId(role), endDate: role.endDate ?? null, highlights: many(role.highlights, 'achievement').map(withId) })),
        skillGroups: many(resume.skillGroups, 'skillGroup').map(withId), education: many(resume.education, 'education').map(withId),
        certifications: many(resume.certifications, 'certification').map(withId), languages: many(resume.languages, 'language'),
    });
    const settings = parse(settingsSchema, {
        app: { title: site.title, description: site.description },
        navItems: many(site.navItems, 'link').map(({ label, url }) => ({ name: label, path: url })),
        socials: many(site.socials, 'link').map(({ label, url, icon }) => ({ name: label, href: url, icon })),
        contactLinks: many(site.contactLinks, 'link').map(({ label, url }) => ({ name: label, href: url })),
    });
    const pages = new Map(many(site.pages, 'page').map(({ key, seoTitle, seoDescription, seoKeywords, ...page }) => {
        if (typeof key !== 'string') throw new Error('Invalid page key');
        return [key, parse(pageSchema, { ...page, meta: { title: seoTitle, description: seoDescription, keywords: seoKeywords } })];
    }));
    return { projects: many(site.projects, 'project').map(entry => parse(projectSchema, withId(entry))),
        posts: many(site.posts, 'post').map(entry => parse(postSchema, withId(entry))), resume: document,
        config: { ...settings, pages, blog: [] },
    };
}
