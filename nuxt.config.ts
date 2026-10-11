// https://nuxt.com/docs/api/configuration/nuxt-config
import { posts } from "./src/data/posts";

export default defineNuxtConfig({
    compatibilityDate: "2024-11-01",
    devtools: { enabled: true },
    colorMode: {
        preference: "system",
        fallback: "light",
        classPrefix: "",
        classSuffix: "",
        storage: "localStorage",
        storageKey: "nuxt-color-mode",
    },
    srcDir: "src/",
    serverDir: "src/server",
    // Shared CMS adapters also run directly in Node's TypeScript export/test scripts.
    typescript: { tsConfig: { compilerOptions: { allowImportingTsExtensions: true } } },
    css: ["~/assets/css/main.css"],
    modules: [
        "@nuxtjs/color-mode",
        "@nuxt/eslint",
        "@nuxt/icon",
        "@nuxt/image",
        "@nuxt/ui",
    ],
    runtimeConfig: {
        public: {
            siteUrl: "",
            posthog: {
                publicKey: process.env.NUXT_PUBLIC_POSTHOG_PROJECT_TOKEN || '',
                host: process.env.NUXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
            },
        },
    },
    image: {
        provider: "portfolio",
        providers: { portfolio: { provider: "~/providers/portfolio" } },
    },
    app: { head: { htmlAttrs: { lang: "en" } } },
    routeRules: {
        "/": { prerender: true },
        "/projects": { prerender: true },
        "/blog": { prerender: true },
        "/contact": { prerender: true },
        "/resume": { prerender: true },
        "/not-found": { prerender: false },
    },
    nitro: {
        typescript: { tsConfig: { compilerOptions: { allowImportingTsExtensions: true } } },
        prerender: {
            routes: [
                ...posts.map(post => `/post/${post.slug}`),
                '/api/portfolio/home', '/api/portfolio/profile', '/api/portfolio/projects',
                '/api/portfolio/articles/list', '/api/portfolio/resume',
                ...posts.map(post => `/api/portfolio/articles/${post.slug}`),
            ],
            ignore: ["/not-found"],
        },
    },
    components: [{ path: "~/components", pathPrefix: false }],
    icon: {
        serverBundle: { collections: ["mdi"] },
        clientBundle: { icons: [
            "mdi:github", "mdi:linkedin", "mdi:instagram", "mdi:weather-sunny", "mdi:weather-night", "mdi:loading", "mdi:arrow-top-right", "mdi:plus", "mdi:check", "mdi:content-copy", "mdi:lightbulb-outline", "mdi:layers-outline", "mdi:arrow-left", "mdi:undo-variant", "mdi:rotate-left", "mdi:rotate-right", "mdi:minus", "mdi:home-outline", "mdi:play", "mdi:pause",
            // The generated site also needs icons revealed only after entering the world.
            "mdi:map-marker-outline", "mdi:map-outline", "mdi:menu", "mdi:arrow-all", "mdi:arrow-up", "mdi:hand-wave-outline", "mdi:arrow-down", "mdi:refresh", "mdi:text-box-outline", "mdi:close", "mdi:play-outline", "mdi:weather-sunset", "mdi:chevron-down", "mdi:earth", "mdi:run-fast", "mdi:cog-outline", "mdi:volume-high", "mdi:volume-off",
        ] },
        fallbackToApi: false,
    },
    ui: {
        fonts: false,
        theme: {
            colors: [
                "primary",
                "secondary",
                "tertiary",
                "info",
                "success",
                "warning",
                "error",
            ],
        },
    },
});
