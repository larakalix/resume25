import { projects } from "~/data/projects";

export const useProjects = () => ({
    projects: computed(() => projects),
    recentProjects: computed(() => projects.slice(0, 3)),
});
