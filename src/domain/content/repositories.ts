import type { Article, ArticleSummary, Profile, Project, Resume, RoleSummary } from './models.ts';

export interface ProfileRepository { getProfile(): Promise<Profile> }
export interface ProjectRepository { listProjects(): Promise<Project[]> }
export interface ArticleRepository {
    listArticles(): Promise<ArticleSummary[]>;
    findArticle(slug: string): Promise<Article | null>;
}
export interface ResumeRepository {
    getResume(): Promise<Resume>;
    listRecentRoles(limit: number): Promise<RoleSummary[]>;
}
export interface ContentRepositories {
    profile: ProfileRepository; projects: ProjectRepository; articles: ArticleRepository; resume: ResumeRepository;
}
