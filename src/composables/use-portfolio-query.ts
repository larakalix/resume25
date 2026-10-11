import type { ContentQueries } from '~/domain/content/models';

/** Nuxt adapter: SSR payload reuse prevents a second fetch during hydration. */
export function usePortfolioQuery<K extends keyof ContentQueries>(query: K) {
    const request = useRequestFetch();
    const path = query === 'articles' ? 'articles/list' : query;
    return useAsyncData<ContentQueries[K]>(`portfolio:${query}`, async (): Promise<ContentQueries[K]> => await request(`/api/portfolio/${path}`, { responseType: 'json' }) as ContentQueries[K]);
}
