// Keep the existing event-call interface; SSR has no analytics provider.
export const usePostHog = () => useNuxtApp().$posthog?.();
