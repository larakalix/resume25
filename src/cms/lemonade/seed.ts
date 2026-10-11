import { createHash } from 'node:crypto';
import { parse, array } from 'valibot';
import { projectSchema, postSchema, pageSchema, settingsSchema } from '../../schemas/portfolio-schema.ts';
import { resumeSchema } from '../../schemas/resume-schema.ts';
import type { PortfolioSource, SeedDocument, SeedEntry } from './types';

// RFC 4122 UUIDv5, URL namespace. These identify embedded instances, never CMS entries.
function componentId(name: string): string {
    const namespace = Buffer.from('6ba7b8119dad11d180b400c04fd430c8', 'hex');
    const bytes = createHash('sha1').update(namespace).update(`resume25:lemonade:${name}`).digest().subarray(0, 16);
    bytes[6] = (bytes.readUInt8(6) & 15) | 80;
    bytes[8] = (bytes.readUInt8(8) & 63) | 128;
    const hex = bytes.toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
const ref = (seed_key: string) => ({ $ref: seed_key });
const block = (name: string, type: string, fields: Record<string, unknown>) => ({ id: componentId(name), type, fields });
const links = (owner: string, values: { label: string; url: string; icon?: string }[]) => values.map((value, index) => block(`${owner}/links/${index}`, 'portfolio_link', { ...value }));

export function createLemonadeSeed(source: PortfolioSource): SeedDocument {
    const entries: SeedEntry[] = [];
    const add = (content_type: string, id: string, fields: Record<string, unknown>) => { const key = `${content_type}:${id}`; entries.push({ seed_key: key, content_type, fields }); return ref(key); };
    const profile = source.resume.profile;
    const profileRef = add('profile', 'main', {
        name: profile.name, headline: profile.headline, location: profile.location, open_to_relocate: profile.openToRelocate,
        summary: profile.summary, email: profile.email, phone: profile.phone, phone_href: profile.phoneHref,
        links: links('profile', profile.links),
    });
    const projects = source.projects.map((project, index) => add('project', project.id, {
        content_id: project.id, name: project.name, description: project.description, image_path: project.image,
        ...('demo' in project ? { demo_path: project.demo } : {}), url: project.url, tags: [...project.tags], sort_order: index,
    }));
    const articles = source.posts.map((post, index) => add('article', post.id, {
        content_id: post.id, title: post.title, slug: post.slug, excerpt: post.excerpt, content_html: post.content,
        publication_date: post.date, tags: [...post.tags], ...('image' in post ? { image_path: post.image } : {}), sort_order: index,
    }));
    const experience = source.resume.experience.map((role, index) => add('experience', role.id, {
        content_id: role.id, company: role.company, role: role.role, location: role.location, remote: role.remote,
        start_date: role.startDate, end_date: role.endDate, sort_order: index, technologies: [...role.technologies],
        highlights: role.highlights.map(item => block(`role/${role.id}/${item.id}`, 'portfolio_achievement', { content_id: item.id, text: item.text, featured: item.featured })),
    }));
    const pages = [...source.config.pages].map(([key, page]) => add('page', key, {
        page_key: key, title: page.title, ...('subtitle' in page ? { subtitle: page.subtitle } : {}), description: page.description,
        action: page.action ? block(`page/${key}/action`, 'portfolio_action', { ...page.action }) : null,
        meta: block(`page/${key}/meta`, 'portfolio_seo', { ...page.meta }),
    }));
    const resume = source.resume;
    const resumeRef = add('resume', 'main', {
        schema_version: resume.schemaVersion, source_document: resume.sourceDocument, profile: profileRef, experience,
        skill_groups: resume.skillGroups.map(group => block(`skills/${group.id}`, 'portfolio_skill_group', { content_id: group.id, label: group.label, items: [...group.items] })),
        education: resume.education.map(item => block(`education/${item.id}`, 'portfolio_education', { content_id: item.id, institution: item.institution, qualification: item.qualification, date: item.date, status: item.status })),
        certifications: resume.certifications.map(item => block(`certification/${item.id}`, 'portfolio_certification', { content_id: item.id, issuer: item.issuer, name: item.name, date: item.date })),
        languages: resume.languages.map((item, index) => block(`language/${index}/${item.name}`, 'portfolio_language', { ...item })),
        pdf_path: resume.downloads.pdf, text_path: resume.downloads.text,
    });
    add('site_settings', 'main', {
        title: source.config.app.title, description: source.config.app.description,
        navigation: links('navigation', source.config.navItems.map(item => ({ label: item.name, url: item.path }))),
        socials: links('socials', source.config.socials.map(item => ({ label: item.name, url: item.href, icon: item.icon }))),
        contact_links: links('contact', source.config.contactLinks.map(item => ({ label: item.name, url: item.href }))),
        pages, projects, articles, resume: resumeRef,
    });
    const document: SeedDocument = { format: 'resume25-lemonade-seed', version: 1, root: 'site_settings:main', entries };
    if (new Set(entries.map(entry => entry.seed_key)).size !== entries.length) throw new Error('Duplicate migration seed identity');
    return document;
}

const object = (value: unknown): Record<string, unknown> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a seed object');
    return value as Record<string, unknown>;
};
const list = (value: unknown): unknown[] => { if (!Array.isArray(value)) throw new Error('Expected an ordered seed array'); return value; };
const embedded = (value: unknown, type: string) => {
    const instance = object(value);
    if (instance.type !== type || typeof instance.id !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(instance.id)) throw new Error(`Invalid embedded ${type}`);
    return object(instance.fields);
};

/** Offline round-trip proof for the portable seed format; this is not a live Lemonade API adapter. */
export function restoreLemonadeSeed(document: SeedDocument): PortfolioSource {
    if (document.format !== 'resume25-lemonade-seed' || document.version !== 1) throw new Error('Unsupported seed format');
    const index = new Map(document.entries.map(entry => [entry.seed_key, entry]));
    if (index.size !== document.entries.length) throw new Error('Duplicate migration seed identity');
    const resolve = (value: unknown, type: string) => {
        const key = object(value).$ref;
        const entry = typeof key === 'string' ? index.get(key) : undefined;
        if (!entry || entry.content_type !== type) throw new Error(`Missing or wrong ${type} reference: ${String(key)}`);
        return entry.fields;
    };
    const root = resolve({ $ref: document.root }, 'site_settings');
    const resume = resolve(root.resume, 'resume');
    const profile = resolve(resume.profile, 'profile');
    const profileLinks = list(profile.links).map(value => { const link = embedded(value, 'portfolio_link'); return { label: link.label, url: link.url }; });
    const restoredResume = parse(resumeSchema, {
        schemaVersion: resume.schema_version, sourceDocument: resume.source_document,
        profile: { name: profile.name, headline: profile.headline, location: profile.location, openToRelocate: profile.open_to_relocate, summary: profile.summary, email: profile.email, phone: profile.phone, phoneHref: profile.phone_href, links: profileLinks },
        experience: list(resume.experience).map(value => {
            const role = resolve(value, 'experience');
            return { id: role.content_id, company: role.company, role: role.role, location: role.location, remote: role.remote, startDate: role.start_date, endDate: role.end_date, technologies: role.technologies,
                highlights: list(role.highlights).map(value => { const item = embedded(value, 'portfolio_achievement'); return { id: item.content_id, text: item.text, featured: item.featured }; }) };
        }),
        skillGroups: list(resume.skill_groups).map(value => { const item = embedded(value, 'portfolio_skill_group'); return { id: item.content_id, label: item.label, items: item.items }; }),
        education: list(resume.education).map(value => { const item = embedded(value, 'portfolio_education'); return { id: item.content_id, institution: item.institution, qualification: item.qualification, date: item.date, status: item.status }; }),
        certifications: list(resume.certifications).map(value => { const item = embedded(value, 'portfolio_certification'); return { id: item.content_id, issuer: item.issuer, name: item.name, date: item.date }; }),
        languages: list(resume.languages).map(value => embedded(value, 'portfolio_language')),
        downloads: { pdf: resume.pdf_path, text: resume.text_path },
    });
    const projects = parse(array(projectSchema), list(root.projects).map(value => {
        const item = resolve(value, 'project');
        return { id: item.content_id, name: item.name, description: item.description, image: item.image_path, ...('demo_path' in item ? { demo: item.demo_path } : {}), url: item.url, tags: item.tags };
    }));
    const posts = parse(array(postSchema), list(root.articles).map(value => {
        const item = resolve(value, 'article');
        return { id: item.content_id, title: item.title, slug: item.slug, excerpt: item.excerpt, content: item.content_html, date: item.publication_date, tags: item.tags, ...('image_path' in item ? { image: item.image_path } : {}) };
    }));
    const pages = new Map(list(root.pages).map(value => {
        const item = resolve(value, 'page');
        if (typeof item.page_key !== 'string') throw new Error('Invalid page key');
        return [item.page_key, parse(pageSchema, { title: item.title, ...('subtitle' in item ? { subtitle: item.subtitle } : {}), description: item.description, ...(item.action === null ? {} : { action: embedded(item.action, 'portfolio_action') }), meta: embedded(item.meta, 'portfolio_seo') })];
    }));
    const settings = parse(settingsSchema, {
        app: { title: root.title, description: root.description },
        navItems: list(root.navigation).map(value => { const item = embedded(value, 'portfolio_link'); return { name: item.label, path: item.url }; }),
        socials: list(root.socials).map(value => { const item = embedded(value, 'portfolio_link'); return { name: item.label, href: item.url, icon: item.icon }; }),
        contactLinks: list(root.contact_links).map(value => { const item = embedded(value, 'portfolio_link'); return { name: item.label, href: item.url }; }),
    });
    return { projects, posts, resume: restoredResume, config: { ...settings, pages, blog: [] } };
}
