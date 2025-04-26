<script setup lang="ts">
const year = new Date().getFullYear()
const { config } = useContentStore()
</script>

<template>
    <footer class="container mx-auto flex justify-between items-center px-2 py-2 lg:px-4 lg:py-8 w-full">
        <ul class="flex flex-col items-center justify-between gap-2 md:flex-row md:gap-4 w-full">
            <li>
                <MlSocials v-if="config?.socials" :socials="config?.socials" />
            </li>
            <li>
                <p class="text-sm md:text-base text-title/60">© {{ year }} Ivan. Built with Nuxt</p>
            </li>
        </ul>
    </footer>
</template>