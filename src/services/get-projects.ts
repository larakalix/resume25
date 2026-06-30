import type { Project } from "~/types/schemas";

export async function fetchProjects(): Promise<Project[]> {
    return [
        {
            id: "cm9xsg6r6000208ky665y9123",
            name: "Booqself",
            description:
                "A booking page for customers. An appointment system for businesses.",
            image: "/img/booqself.gif",
            tags: [
                "Nuxt",
                "TypeScript",
                "Tailwind CSS",
                "Booking",
                "Businesses",
                "Book Management",
                "Appointments",
            ],
            url: "https://www.booqself.com/",
        },
        {
            id: "cm9xsg6r6000208ky665y9124",
            name: "Drag and drop website builder",
            description:
                "A drag and drop website builder that allows you to create websites without coding.",
            image: "/img/dnd-tool.gif",
            tags: [
                "React",
                "TypeScript",
                "Tailwind CSS",
                "Drag and Drop",
                "Website Builder",
            ],
            url: "https://bq-dnd-tool.vercel.app",
        },
        {
            id: "cm9xsg6r6000208ky665y9126",
            name: "Lummiq",
            description: "School management system for teachers and students.",
            image: "/img/lummiq.png",
            tags: [
                "NextJS",
                "TypeScript",
                "Tailwind CSS",
                "School Management",
                "Teachers",
                "Students",
            ],
            url: "https://lummiq.com/",
        },
        {
            id: "cm9xsg6r6000208ky665y9125",
            name: "Gamer shop",
            description:
                "A simple e-commerce website for selling gaming products.",
            image: "/img/gamer-shop.gif",
            tags: [
                "NextJS",
                "TypeScript",
                "Tailwind CSS",
                "E-commerce",
                "Gaming",
            ],
            url: "https://ad-frontend-test-sooty.vercel.app/",
        },
        {
            id: "cm9xsg6r6000208ky665y9jfu",
            name: "Task App DnD",
            description: "A simple task app with drag and drop functionality.",
            image: "/img/tasks-app.gif",
            tags: [
                "React",
                "TypeScript",
                "Tailwind CSS",
                "Drag and Drop",
                "Task Management",
            ],
            url: "https://github.com/larakalix/task-dnd-app",
        },
        {
            id: "cm9xsg3ev000108ky9b80ek45",
            name: "InfoJobs App",
            description:
                "A job search app that allows you to search for jobs and save them.",
            image: "/img/infojobs.gif",
            tags: [
                "NextJS",
                "TypeScript",
                "Tailwind CSS",
                "Job Search",
                "InfoJobs",
            ],
            url: "https://github.com/larakalix/task-dnd-app",
        },
        {
            id: "cm9xsfxh7000008kyb21ib9km",
            name: "Blog with DatoCMS",
            description:
                "A simple blog with DatoCMS. It uses the DatoCMS API to fetch posts and display them.",
            image: "/img/blog.gif",
            tags: [
                "React",
                "TypeScript",
                "Tailwind CSS",
                "Blog",
                "DatoCMS",
                "Content Management",
            ],
            url: "https://github.com/larakalix/task-dnd-app",
        },
        {
            id: "cm9xsfxh7000008kyb21ib9kn",
            name: "Mweeter App",
            description:
                "A simple Twitter clone that allows you to post tweets and view them.",
            image: "/img/mweeter.png",
            tags: ["React", "TypeScript", "Tailwind CSS", "Twitter Clone"],
            url: "https://github.com/larakalix/monogram-challenge",
        },
    ];
}
