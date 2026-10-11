import type { MaybeRefOrGetter } from "vue";
import { posts } from "~/data/posts";

export const usePost = (slug: MaybeRefOrGetter<string>) => ({
    post: computed(() => posts.find(post => post.slug === toValue(slug))),
});
