import type { Resume } from "~/types/resume";
import type { PageConfig, Social } from "~/types/page";

export function createContentConfig(resume: Pick<Resume, 'profile'>) {
    const pageKeywords = "ivan, portfolio, web developer, software engineer, full stack developer, javascript, typescript, react, nodejs, express, mongodb, mysql, postgresql";
    const socials: Social[] = [
        { name: "GitHub", href: "https://github.com/larakalix", icon: "mdi:github" },
        ...resume.profile.links.filter(link => link.label === "LinkedIn").map(link => ({
            name: link.label, href: link.url, icon: "mdi:linkedin",
        })),
        { name: "Instagram", href: "https://instagram.com/ukikalix", icon: "mdi:instagram" },
    ];

    return {
        app: {
            title: "Ivan Lara - Portfolio",
            description: resume.profile.summary,
        },
        contactLinks: [
            {
                name: "Email",
                href: `mailto:${resume.profile.email}`,
            },
            {
                name: "Newsletter",
                href: "https://kalixthedev.substack.com",
            },
            ...socials.filter(link => link.name === "GitHub" || link.name === "LinkedIn")
                .map(({ name, href }) => ({ name, href })),
        ],
        socials,
        navItems: [
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: "Projects", path: "/projects" },
            { name: "Resume", path: "/resume" },
            { name: "Contact", path: "/contact" },
        ],
        pages: new Map([
            [
                "home",
                {
                    title: "I'm Ivan Lara",
                    subtitle: "Software Engineer",
                    description: `${resume.profile.summary} | I focus on reusable interfaces, clear architecture, and software that is easy to use and maintain.`,
                    action: {
                        text: "Get in touch",
                        href: "/contact",
                    },
                    meta: {
                        title: "Ivan Lara - Portfolio",
                        description: resume.profile.summary,
                        keywords: pageKeywords,
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
                        description: "Explore Ivan Lara’s web projects, built with TypeScript, Vue, Nuxt, React, and Next.js.",
                        keywords: pageKeywords,
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
                        description: "Articles by Ivan Lara on Nuxt, frontend development, and software architecture.",
                        keywords: pageKeywords,
                    },
                } as PageConfig,
            ],
            [
                "contact",
                {
                    title: "Get in touch",
                    subtitle: "Projects and engineering opportunities",
                    description: `${resume.profile.summary} | I enjoy turning complex workflows into clear interfaces and building components that teams can reuse. | For project enquiries or engineering opportunities, reach out by email or connect on LinkedIn.`,
                    action: {
                        text: "Get in touch",
                        href: "/contact",
                    },
                    meta: {
                        title: "Contact Ivan Lara",
                        description: "Contact Ivan Lara about web development projects and software engineering opportunities.",
                        keywords: pageKeywords,
                    },
                } as PageConfig,
            ],
        ]),
        blog: [],
    };
}
