export type PageConfig = {
    title: string;
    subtitle?: string;
    description: string;
    action?: {
        text: string;
        href: string;
    };
    meta: {
        title: string;
        description: string;
        keywords: string;
    };
};

export type Page = {
    page: PageConfig;
};

export type Social = {
    name: string;
    href: string;
    icon: string;
};
