import type { ContentRepositories } from '../../domain/content/repositories.ts';
import type { ArticleContent, HomeContent } from '../../domain/content/models.ts';

/** Application policy depends on repository contracts, never CMS SDKs or Vue. */
export function createPortfolioQueries(repositories: ContentRepositories) {
    const listArticles = async () => [...await repositories.articles.listArticles()].sort((a, b) => b.date.localeCompare(a.date));
    return {
        getProfile: () => repositories.profile.getProfile(),
        listProjects: () => repositories.projects.listProjects(),
        listArticles,
        getResume: () => repositories.resume.getResume(),
        async getHome(): Promise<HomeContent> {
            const [profile, projects, articles, resume] = await Promise.all([
                repositories.profile.getProfile(), repositories.projects.listProjects(),
                listArticles(), repositories.resume.getResume(),
            ]);
            const experience = resume.experience.map(({ id, company, role, startDate, endDate }) => ({ id, company, role, startDate, endDate }));
            return { profile, projects: projects.slice(0, 3), experience, articles: articles.slice(0, 2), skillGroups: resume.skillGroups };
        },
        async getArticle(slug: string): Promise<ArticleContent | null> {
            const [article, articles] = await Promise.all([repositories.articles.findArticle(slug), listArticles()]);
            if (!article) return null;
            const index = articles.findIndex(item => item.slug === slug);
            return { article, previous: index >= 0 ? articles[index - 1] ?? null : null, next: index >= 0 ? articles[index + 1] ?? null : null };
        },
    };
}
