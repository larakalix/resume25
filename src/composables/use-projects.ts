import { computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { fetchProjects } from "~/services/get-projects";

export const useProjects = () => {
    const {
        data: projects,
        isLoading,
        isError,
        error,
        refetch,
    } = useQuery({
        queryKey: ["projects"],
        queryFn: fetchProjects,
    });

    const recentProjects = computed(() => (projects.value ?? []).slice(0, 3));

    return {
        projects,
        recentProjects,
        isLoading,
        isError,
        error,
        refreshProjects: refetch,
    };
};
