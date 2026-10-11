import type { Project, Article, Resume } from '../../domain/content/models';
import type { createContentConfig } from '../../config/create-content-config';

export interface PortfolioSource {
    projects: Project[];
    posts: Article[];
    resume: Resume;
    config: ReturnType<typeof createContentConfig>;
}
export interface LemonadeField {
    key: string;
    label: string;
    type: 'text' | 'long_text' | 'number' | 'boolean' | 'date' | 'choices' | 'reference' | 'references' | 'component' | 'components';
    required: boolean;
    unique?: boolean;
    help_text?: string;
    options?: string[];
    target?: string;
    components?: LemonadeModel[];
}
export interface LemonadeModel { key: string; name: string; fields: LemonadeField[]; singleton?: boolean }
export interface LemonadeModelTemplate {
    format: 'lemonade-model-template'; version: 1; name: string; description: string; models: LemonadeModel[];
}
/** Migration-only identities. These are not CMS entry UUIDs or a native entry-import envelope. */
export interface SeedEntry { seed_key: string; content_type: string; fields: Record<string, unknown> }
export interface SeedDocument { format: 'resume25-lemonade-seed'; version: 1; root: string; entries: SeedEntry[] }
