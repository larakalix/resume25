import { useQuery } from "@tanstack/vue-query";
import { fetchPostBySlug } from "~/services/get-posts";

export const usePost = (slug: string) => {
    const {
        data: post,
        isLoading,
        isError,
        error,
        refetch,
    } = useQuery({
        queryKey: ["post", slug],
        queryFn: () => fetchPostBySlug(slug),
    });

    return {
        post,
        isLoading,
        isError,
        error,
        refreshPost: refetch,
    };
};
