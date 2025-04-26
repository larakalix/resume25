import { defineStore } from "pinia";
import { contentConfig } from "~/config/content-config";

export const useContentStore = defineStore("content", () => {
    const config = contentConfig;

    const getPage = (key: string) => config.pages.get(key);

    return {
        config,
        getPage,
    };
});
