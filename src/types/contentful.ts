import type { createContentConfig } from '../config/create-content-config';
import type { Resume } from './resume';
import type { Post, Project } from './schemas';

export type PortfolioContent = {
    projects: Project[];
    posts: Post[];
    resume: Resume;
    config: ReturnType<typeof createContentConfig>;
};
export type EntryLink = { sys: { type: 'Link'; linkType: 'Entry'; id: string } };
export type ContentfulEntry = {
    sys: { id: string; type: 'Entry'; contentType: { sys: { type: 'Link'; linkType: 'ContentType'; id: string } } };
    fields: Record<string, Record<string, unknown>>;
};
export type ContentfulExport = {
    contentTypes: unknown[];
    entries: ContentfulEntry[];
    assets: unknown[];
    locales: { code: string; name: string; default: boolean; fallbackCode: null }[];
};
