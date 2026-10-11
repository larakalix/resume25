<template>
    <span class="motion-arrow" aria-hidden="true">
        <span class="motion-arrow-track">
            <Icon name="mdi:arrow-top-right" size="18" class="motion-arrow-original" />
            <Icon name="mdi:arrow-top-right" size="18" class="motion-arrow-next" />
        </span>
    </span>
</template>

<style scoped>
.motion-arrow { position: relative; display: inline-block; flex-shrink: 0; width: 18px; height: 18px; overflow: hidden; vertical-align: middle; }
.motion-arrow-track { position: absolute; inset: 0; transition: transform 240ms var(--ease-spring); }
.motion-arrow-original, .motion-arrow-next { position: absolute; inset: 0; }
.motion-arrow-next { transform: translate(-100%, 100%); }
:global(a:focus-visible .motion-arrow-track), :global(button:focus-visible .motion-arrow-track) { transform: translate(100%, -100%); }
@media (hover: hover) and (pointer: fine) {
    :global(a:hover .motion-arrow-track), :global(button:hover .motion-arrow-track) { transform: translate(100%, -100%); }
}
@media (prefers-reduced-motion: reduce) { .motion-arrow-track { transition: none; } }
</style>
