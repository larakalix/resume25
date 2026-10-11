import summaries from '~/data/generated/post-summaries.json';
import type { PostSummary } from '~/types/schemas';
const posts: PostSummary[] = summaries;
export const usePosts = () => ({ posts: computed(() => [...posts].sort((a, b) => b.date.localeCompare(a.date))) });
