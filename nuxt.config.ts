// https://nuxt.com/docs/api/configuration/nuxt-config
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
    compatibilityDate: "2024-11-01",
    devtools: { enabled: true },
    vite: {
        plugins: [tsconfigPaths(), tailwindcss()],
    },
    colorMode: {
        preference: "system",
        fallback: "light",
        classPrefix: "",
        classSuffix: "",
        storage: "localStorage",
        storageKey: "nuxt-color-mode",
    },
    srcDir: "src/",
    css: ["~/assets/css/main.css"],
    alias: {
        "@": "/src",
    },
    modules: [
        "@nuxtjs/color-mode",
        "@nuxt/eslint",
        "@nuxt/fonts",
        "@nuxt/icon",
        "@nuxt/image",
        "@nuxt/ui",
        "@pinia/nuxt",
        "pinia-plugin-persistedstate/nuxt",
    ],
    components: [{ path: "~/components", pathPrefix: false }],
    ui: {
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
    pinia: {
        autoImports: ["defineStore", "acceptHMRUpdate"],
    },
});
