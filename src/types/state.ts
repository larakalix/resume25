export type GlowState =
    | "moving"
    | "stopped"
    | "idle"
    | "hovered"
    | "clicked"
    | "disabled";

export type State<T> = {
    data: T;
    loading: "idle" | "loading" | "loaded" | "error";
    error: string | null;
};
