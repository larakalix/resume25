import type { ProviderGetImage } from '@nuxt/image';

// Prebuilt previews work on static hosting without an image transformation server.
export const getImage: ProviderGetImage = (src, { modifiers }) => {
    if (!/^\/img\/[a-z0-9-]+\.webp$/.test(src)) return { url: src };
    const requestedWidth = Number(modifiers?.width) || 960;
    const width = [320, 640, 960].find(width => width >= requestedWidth) ?? 960;
    return { url: src.replace('.webp', `-${width}.webp`) };
};
