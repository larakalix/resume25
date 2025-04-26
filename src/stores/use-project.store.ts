import { defineStore } from "pinia";
import { fetchProjects } from "~/services/get-projects";
import type { Project } from "~/types/schemas";

export const useProjectStore = defineStore("projects", () => {
    const { data, status, error, refresh } = useAsyncData<Project[]>(
        "projects",
        fetchProjects,
        {
            server: false, // optional: only fetch on client
        }
    );

    return {
        projects: data ,
        loading: status,
        error,
        refreshProjects: refresh,
    };
});
