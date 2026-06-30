import { contentConfig } from "~/config/content-config";

export const useContent = () => {
    const getPage = (key: string) => contentConfig.pages.get(key);

    return {
        config: contentConfig,
        getPage,
    };
};
