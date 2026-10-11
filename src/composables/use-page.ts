import { useContent } from "./use-content";
import type { PageConfig } from "~/types/page";

export const usePage = (pageKey: string): PageConfig => {
    const content = useContent();
    const page = content.getPage(pageKey);

    if (!page) {
        throw createError({ statusCode: 404, statusMessage: "Page not found" });
    }

    useSeoMeta({
        title: page.meta.title,
        description: page.meta.description,
        ogTitle: page.meta.title,
        ogDescription: page.meta.description,
        twitterTitle: page.meta.title,
        twitterDescription: page.meta.description,
    });

    return page;
};
