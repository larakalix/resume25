import type { PageConfig } from "~/types/page";

export const contentConfig = {
    app: {
        title: "Ivan Lara - Portfolio",
        description: "Ivan Lara - Portfolio",
    },
    contactLinks: [
        {
            name: "Email",
            href: "mailto: uki@live.co.uk",
        },
        {
            name: "Newsletter",
            href: "https://kalixthedev.substack.com",
        },
        {
            name: "GitHub",
            href: "https://github.com/larakalix",
        },
        {
            name: "LinkedIn",
            href: "https://linkedin.com/in/ilaradev",
        },
    ],
    socials: [
        {
            name: "GitHub",
            href: "https://github.com/larakalix",
            icon: "mdi:github",
        },
        {
            name: "LinkedIn",
            href: "https://linkedin.com/in/ilaradev",
            icon: "mdi:linkedin",
        },
        {
            name: "Instagram",
            href: "https://instagram.com/ukikalix",
            icon: "mdi:instagram",
        },
    ],
    navItems: [
        { name: "Home", path: "/" },
        { name: "Blog", path: "/blog" },
        { name: "Projects", path: "/projects" },
    ],
    pages: new Map([
        [
            "home",
            {
                title: "I'm Ivan Lara",
                subtitle: "Software Engineer",
                description: `Good software build good relationships. |
                    With over 8 years of experience in fullstack development, I craft solutions that prioritize performance, usability, and long-term maintainability. |
                    I’m passionate about designing seamless user experiences that feel intuitive and fast — from clean APIs to elegant frontends. |
                    I thrive in environments where ideas turn into action, and where building something meaningful matters more than just writing code. |
                    Every project is a chance to grow, challenge assumptions, and deliver value. I’m always looking forward to the next big problem to solve.
                    `,
                action: {
                    text: "Get in touch",
                    href: "/contact",
                },
                meta: {
                    title: "Ivan Lara - Portfolio",
                    description: "Ivan Lara - Portfolio",
                    keywords:
                        "ivan, portfolio, web developer, software engineer, full stack developer, javascript, typescript, react, nodejs, express, mongodb, mysql, postgresql",
                },
            } as PageConfig,
        ],
        [
            "projects",
            {
                title: "Projects",
                subtitle: "",
                description: "Ivan Lara - Projects",
                meta: {
                    title: "Ivan Lara - Projects",
                    description: "Ivan Lara - Portfolio",
                    keywords:
                        "ivan, portfolio, web developer, software engineer, full stack developer, javascript, typescript, react, nodejs, express, mongodb, mysql, postgresql",
                },
            } as PageConfig,
        ],
        [
            "blog",
            {
                title: "Blog",
                subtitle: "",
                description: "Ivan Lara - Blog",
                meta: {
                    title: "Ivan Lara - Blog",
                    description: "Ivan Lara - Portfolio",
                    keywords:
                        "ivan, portfolio, web developer, software engineer, full stack developer, javascript, typescript, react, nodejs, express, mongodb, mysql, postgresql",
                },
            } as PageConfig,
        ],
        [
            "contact",
            {
                title: "About me",
                subtitle: "Get in touch with me",
                description: `
                    Hey there! I am Ivan Lara, a passionate frontend developer with full-stack experience and 8 years in the industry, primarily focused on building scalable, efficient, and reusable components. My expertise spans modern JavaScript frameworks, performance optimization, and design patterns that enhance user experience. |
                    I have worked extensively with TypeScript, React, Next.js, and state management solutions, while also integrating backend technologies to build full-stack applications. My experience includes working on SaaS platforms, e-commerce solutions, and fintech applications, where I’ve contributed to improving system architecture, optimizing performance, and enhancing developer workflows. |
                    I enjoy learning and quickly adapting to new technologies, enabling me to implement best practices and modern tooling in projects. I’m also passionate about mentoring and fostering a collaborative development environment. My goal is to grow into a leadership role where I can help teams scale efficiently, improve engineering processes, and drive innovation.
                `,
                action: {
                    text: "Get in touch",
                    href: "/contact",
                },
                meta: {
                    title: "Ivan Lara - About me",
                    description: "Ivan Lara - Portfolio",
                    keywords:
                        "ivan, portfolio, web developer, software engineer, full stack developer, javascript, typescript, react, nodejs, express, mongodb, mysql, postgresql",
                },
            } as PageConfig,
        ],
    ]),
};
export type ContentConfig = typeof contentConfig;

export const projects = [];

export type Project = (typeof projects)[number];

export type NavItem = (typeof contentConfig)["navItems"][number];
