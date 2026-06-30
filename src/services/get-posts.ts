import type { Post } from "~/types/schemas";

const posts: Post[] = [
    {
        id: "post-why-nuxt",
        slug: "why-use-nuxt",
        title: "Why use Nuxt?",
        date: "2025-06-15",
        tags: ["Nuxt", "Vue", "SSR", "Performance"],
        excerpt:
            "Nuxt takes the best parts of Vue and adds conventions that make building production apps faster, simpler, and more scalable.",
        content: `
            <p>Nuxt is more than just a framework on top of Vue. It is a full-stack application platform that removes boilerplate while keeping flexibility.</p>
            <h3>File-based routing</h3>
            <p>Instead of manually configuring a router, Nuxt automatically creates routes from your <code>pages/</code> directory. Nested folders become nested routes, and dynamic segments use bracket syntax.</p>
            <h3>Server-side rendering out of the box</h3>
            <p>Nuxt ships with SSR and SSG support by default, giving you great SEO, fast first paints, and graceful hydration without extra configuration.</p>
            <h3>Auto-imports</h3>
            <p>Components, composables, and utilities are auto-imported, which keeps files clean and reduces friction when refactoring.</p>
            <h3>Module ecosystem</h3>
            <p>From image optimization and content management to authentication and caching, the Nuxt module ecosystem lets you add capabilities with a single line in your config.</p>
            <p>For teams that want Vue's ergonomics with an opinionated, productive workflow, Nuxt is hard to beat.</p>
        `,
    },
    {
        id: "post-nuxt-vs-others",
        slug: "nuxt-vs-other-frameworks",
        title: "Nuxt vs other frameworks",
        date: "2025-06-20",
        tags: ["Nuxt", "NextJS", "Comparison", "Frontend"],
        excerpt:
            "How does Nuxt compare to Next.js, SvelteKit, and other full-stack frameworks? A practical look at the trade-offs.",
        content: `
            <p>Choosing a framework is about matching your team's strengths and your project's constraints. Here is how Nuxt compares to the most common alternatives.</p>
            <h3>Nuxt vs Next.js</h3>
            <p>Next.js is the dominant React meta-framework. Nuxt offers a similar feature set — SSR, SSG, API routes, layouts — but with Vue's template syntax and reactivity model. If you prefer Vue's ergonomics, Nuxt is the natural choice.</p>
            <h3>Nuxt vs SvelteKit</h3>
            <p>SvelteKit is lean and fast, but its ecosystem is smaller. Nuxt has a larger community, more third-party modules, and deeper integration with the Vue ecosystem.</p>
            <h3>Nuxt vs plain Vite + Vue</h3>
            <p>A custom Vite setup gives you total control, but you end up rebuilding routing, SSR, auto-imports, and build optimizations yourself. Nuxt provides all of that with sensible defaults.</p>
            <p>The right choice depends on your team, but Nuxt strikes a strong balance between convention and flexibility.</p>
        `,
    },
    {
        id: "post-nuxt-v4",
        slug: "nuxt-v4-new-features",
        title: "Nuxt v4 new features",
        date: "2025-06-28",
        tags: ["Nuxt", "Nuxt 4", "Release", "Features"],
        excerpt:
            "Nuxt 4 brings a cleaner directory structure, faster builds, typed routes, and better defaults. Here is what changed.",
        content: `
            <p>Nuxt 4 is a major step forward for the framework. It keeps the parts developers love while modernizing the foundation.</p>
            <h3>New directory structure</h3>
            <p>The default app directory moves from the project root to a dedicated <code>app/</code> folder, making monorepos and layers easier to manage. Existing projects can opt in gradually.</p>
            <h3>Faster builds and smaller bundles</h3>
            <p>Build performance has improved across the board, thanks to upgrades in Nitro and Vite integration. Bundle sizes are also smaller by default.</p>
            <h3>Typed routes</h3>
            <p>Route names and params are now fully typed, catching navigation mistakes at compile time and improving IDE autocomplete.</p>
            <h3>Better server utilities</h3>
            <p>The server layer gains new helpers for validation, WebSocket support, and streaming, making full-stack Nuxt apps more capable.</p>
            <p>If you are starting a new project, Nuxt 4 is the recommended baseline.</p>
        `,
    },
];

export async function fetchPosts(): Promise<Post[]> {
    return posts;
}

export async function fetchPostBySlug(slug: string): Promise<Post | undefined> {
    return posts.find((post) => post.slug === slug);
}
