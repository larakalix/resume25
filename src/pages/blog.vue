<script setup lang="ts">
const page = usePage('blog');
</script>

<template>
    <section>
        <h1 class="text-3xl font-bold">{{ page?.title }}</h1>
        <p class="mt-2 text-gray-600 dark:text-gray-400">{{ page?.description }}</p>
    </section>
</template>