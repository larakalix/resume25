export const projectFilters = [
    { value: 'all', label: 'All' },
    { value: 'nuxt', label: 'Nuxt' },
    { value: 'react', label: 'React' },
    { value: 'nextjs', label: 'Next.js' },
] as const;

export function normalizeTechnology(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function resolveProjectFilter(value: unknown): string {
    return typeof value === 'string' && projectFilters.some(filter => filter.value === value) ? value : 'all';
}

export function filterProjects<T extends { tags: string[] }>(projects: T[], technology: string): T[] {
    if (technology === 'all') return projects;
    return projects.filter(project => project.tags.some(tag => normalizeTechnology(tag) === technology));
}
