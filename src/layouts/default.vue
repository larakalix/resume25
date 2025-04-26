<script setup lang="ts">
</script>

<template>
    <UApp>
        <div class="flex flex-col mx-auto min-h-screen max-w-screen-xl px-6 py-12 md:px-12 md:py-16 lg:py-0">
            <AtPointerGlow />
            <MlNavbar />

            <main class="flex flex-grow container mx-auto px-2 py-2 lg:px-4 lg:py-8">
                <slot />
            </main>

            <MlFooter />
        </div>
    </UApp>
</template>