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
    // Shared CMS adapters also run directly in Node's TypeScript export/test scripts.
    typescript: { tsConfig: { compilerOptions: { allowImportingTsExtensions: true } } },
    css: ["@fontsource/inter/latin-400.css", "@fontsource/inter/latin-500.css", "@fontsource/inter/latin-600.css", "@fontsource/inter/latin-800.css", "~/assets/css/main.css"],
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
        prerender: {
            routes: posts.map(post => `/post/${post.slug}`),
            ignore: ["/not-found"],
        },
    },
    components: [{ path: "~/components", pathPrefix: false }],
    icon: {
        serverBundle: { collections: ["mdi"] },
        clientBundle: { icons: ["mdi:github", "mdi:linkedin", "mdi:instagram", "mdi:weather-sunny", "mdi:weather-night", "mdi:loading"] },
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
