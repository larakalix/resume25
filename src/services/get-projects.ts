import type { Project } from "~/types/schemas";

export async function fetchProjects(): Promise<Project[]> {
    return [
        {
            id: "cm9xsg6r6000208ky665y9jfu",
            name: "Task App DnD",
            description: "A simple task app with drag and drop functionality.",
            image: "https://resume-22.vercel.app/_next/image?url=https%3A%2F%2Fcdn.sanity.io%2Fimages%2Fz8vobr2s%2Fproduction%2Fa453326286d4409a21b1fa57e032e7e79921efca-580x432.gif&w=640&q=75",
            tags: ["React", "TypeScript", "Tailwind CSS"],
            url: "https://github.com/larakalix/task-dnd-app",
        },
        {
            id: "cm9xsg3ev000108ky9b80ek45",
            name: "InfoJobs App",
            description:
                "A job search app that allows you to search for jobs and save them.",
            image: "https://resume-22.vercel.app/_next/image?url=https%3A%2F%2Fcdn.sanity.io%2Fimages%2Fz8vobr2s%2Fproduction%2F6f99d8e8cab1accb21e19b9af527789f00b154ab-540x470.gif&w=640&q=75",
            tags: ["NextJS", "TypeScript", "Tailwind CSS"],
            url: "https://github.com/larakalix/task-dnd-app",
        },
        {
            id: "cm9xsfxh7000008kyb21ib9km",
            name: "Blog with DatoCMS",
            description:
                "A simple blog with DatoCMS. It uses the DatoCMS API to fetch posts and display them.",
            image: "https://resume-22.vercel.app/_next/image?url=https%3A%2F%2Fcdn.sanity.io%2Fimages%2Fz8vobr2s%2Fproduction%2F0f957bdd9d8aae91f3b0246561633db6899f5af9-580x432.gif&w=640&q=75",
            tags: ["React", "TypeScript", "Tailwind CSS"],
            url: "https://github.com/larakalix/task-dnd-app",
        },
    ];
}
