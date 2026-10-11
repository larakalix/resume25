import type { MaybeRefOrGetter } from 'vue';
import type { ArticleContent } from '~/domain/content/models';

export function usePost(slug: MaybeRefOrGetter<string>) {
    const request = useRequestFetch();
    return useAsyncData<ArticleContent>(() => `portfolio:article:${toValue(slug)}`, () => request(`/api/portfolio/articles/${encodeURIComponent(toValue(slug))}`, { responseType: 'json' }));
}
