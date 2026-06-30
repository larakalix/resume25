import { useQuery } from "@tanstack/vue-query";
import { fetchPosts } from "~/services/get-posts";

export const usePosts = () => {
    const {
        data: posts,
        isLoading,
        isError,
        error,
        refetch,
    } = useQuery({
        queryKey: ["posts"],
        queryFn: fetchPosts,
    });

    return {
        posts,
        isLoading,
        isError,
        error,
        refreshPosts: refetch,
    };
};
