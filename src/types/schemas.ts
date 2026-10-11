export type Project = {
    id: string;
    name: string;
    description: string;
    image: string;
    demo?: string;
    url: string;
    tags: string[];
};

export type Post = {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    date: string;
    tags: string[];
    image?: string;
};

export type PostSummary = Omit<Post, 'content'>;
