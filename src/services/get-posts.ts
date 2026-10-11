import { posts } from "~/data/posts";

export async function fetchPosts() {
    return posts;
}

export async function fetchPostBySlug(slug: string) {
    return posts.find(post => post.slug === slug);
}
