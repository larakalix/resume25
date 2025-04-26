import { useRouter } from "vue-router";
import { useContentStore } from "~/stores/use-content-store";
import type { PageConfig } from "~/types/page";

export const usePage = (pageKey: string) => {
    const content = useContentStore();
    const router = useRouter();
    const page = content.getPage(pageKey);

    if (!page) {
        router.push("/not-found");
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
