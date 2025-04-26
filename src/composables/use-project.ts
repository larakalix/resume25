export const useProjectHover = () => {
    return useState<number | null>("hoveredProjectIndex", () => null);
};

