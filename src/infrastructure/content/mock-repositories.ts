import type { ContentRepositories } from '../../domain/content/repositories.ts';
import type { ArticleSummary } from '../../domain/content/models.ts';
import { parse, array } from 'valibot';
import { projectSchema, postSchema } from '../../schemas/portfolio-schema.ts';
import { projects } from '../../data/projects.ts';
import { posts } from '../../data/posts.ts';
import { resume } from '../../data/resume.ts';

/** Existing published data is the mock source; no fabricated placeholder content. Server-only composition. */
export function createMockRepositories(): ContentRepositories {
    const publishedProjects = parse(array(projectSchema), projects);
    const publishedPosts = parse(array(postSchema), posts);
    const copy = <T>(value: T): T => structuredClone(value);
    const summaries = (): ArticleSummary[] => publishedPosts.map(post => {
        const { id, title, slug, excerpt, date, tags, image } = post;
        return { id, title, slug, excerpt, date, tags: [...tags], ...(image ? { image } : {}) };
    });
    return {
        profile: { async getProfile() { return copy(resume.profile); } },
        projects: { async listProjects() { return copy(publishedProjects); } },
        articles: {
            async listArticles() { return summaries(); },
            async findArticle(slug) { return copy(publishedPosts.find(post => post.slug === slug) ?? null); },
        },
        resume: {
            async getResume() { return copy(resume); },
            async listRecentRoles(limit) {
                return resume.experience.slice(0, Math.max(0, limit)).map(({ id, company, role, startDate, endDate }) => ({ id, company, role, startDate, endDate }));
            },
        },
    };
}
