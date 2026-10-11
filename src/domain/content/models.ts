/** CMS-independent published content. IDs and professional facts come from the source snapshot. */
export interface Project {
    id: string; name: string; description: string; image: string; demo?: string; url: string; tags: string[];
}
export interface ArticleSummary {
    id: string; title: string; slug: string; excerpt: string; date: string; tags: string[]; image?: string;
}
export interface Article extends ArticleSummary { content: string }
export interface Profile {
    name: string; headline: string; location: string; openToRelocate: boolean; summary: string;
    email: string; phone: string; phoneHref: string; links: { label: string; url: string }[];
}
export interface RoleSummary { id: string; company: string; role: string; startDate: string; endDate: string | null }
export interface Experience extends RoleSummary {
    location: string; remote: boolean;
    highlights: { id: string; text: string; featured: boolean }[]; technologies: string[];
}
export interface Resume {
    schemaVersion: 1; sourceDocument: string; profile: Profile; experience: Experience[];
    skillGroups: { id: string; label: string; items: string[] }[];
    education: { id: string; institution: string; qualification: string; date: string; status: string }[];
    certifications: { id: string; issuer: string; name: string; date: string }[];
    languages: { name: string; proficiency: string }[];
    downloads: { pdf: string; text: string };
}
export interface HomeContent { profile: Profile; projects: Project[]; experience: RoleSummary[]; articles: ArticleSummary[]; skillGroups: Resume['skillGroups'] }
export interface ArticleContent { article: Article; previous: ArticleSummary | null; next: ArticleSummary | null }
export interface ContentQueries { home: HomeContent; projects: Project[]; articles: ArticleSummary[]; profile: Profile; resume: Resume }
