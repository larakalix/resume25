import type { PostHog } from 'posthog-js';

export default defineNuxtPlugin((nuxtApp) => {
    const config = useRuntimeConfig().public.posthog;
    let clientPromise: Promise<PostHog | undefined> | undefined;

    // Event calls wait for the same import, so early clicks are preserved.
    function getClient() {
        if (!config.publicKey) return Promise.resolve(undefined);
        clientPromise ??= import('posthog-js').then(({ default: client }) => {
            client.init(config.publicKey, {
                api_host: config.host,
                capture_exceptions: true,
            });
            return client;
        }).catch(() => undefined);
        return clientPromise;
    }

    const analytics = {
        capture(event: string, properties?: Record<string, unknown>) {
            void getClient().then(client => client?.capture(event, properties));
        },
    };

    nuxtApp.hook('vue:error', (error, _target, info) => {
        void getClient().then(client => client?.captureException(error, { info }));
    });

    onNuxtReady(() => { void getClient(); });
    return { provide: { posthog: () => analytics } };
});
