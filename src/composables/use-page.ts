import type { PageConfig } from "~/types/page";

export const usePage = (pageKey: string): PageConfig | undefined => {
    const content = useContent();
    const page = content.getPage(pageKey);

    if (!page) {
        navigateTo("/not-found", { replace: true });
        return;
    }

    useHead({
        title: page.meta.title,
        meta: [
            { name: "description", content: page.meta.description },
            { name: "keywords", content: page.meta.keywords },
            { charset: "utf-8" },
            {
                name: "viewport",
                content: "width=device-width, initial-scale=1",
            },
        ],
    });

    return page as PageConfig;
};
